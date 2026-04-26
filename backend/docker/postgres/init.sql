-- ============================================================
-- Database initialisation
-- Runs once when the Postgres container is first created.
-- EF Core migrations handle the main schema (users, orders etc.)
-- This file handles extensions and infrastructure tables that
-- must exist before the application starts.
-- ============================================================

-- ── Extensions ────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS h3;        -- hexagonal geospatial indexing
CREATE EXTENSION IF NOT EXISTS h3_postgis; -- H3 + PostGIS interop functions

-- ── UNLOGGED cache tables (ephemeral, no WAL writes) ─────────────────────────

-- Driver position cache — written on every GPS tick.
-- Contents are lost on unclean shutdown (acceptable: ephemeral data).
CREATE UNLOGGED TABLE IF NOT EXISTS cache_driver_positions (
    driver_id  uuid        PRIMARY KEY,
    order_id   uuid,
    location   geography(Point, 4326) NOT NULL,
    h3_index   bigint      NOT NULL,       -- H3 cell ID at resolution 9
    heading    numeric(5,2),               -- degrees 0–360, nullable
    speed_kmh  numeric(6,2),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- B-tree index on h3_index for fast GridDisk fan-out queries
-- "Which drivers are in these 19 H3 cells?" → plain integer ANY() lookup
CREATE INDEX IF NOT EXISTS ix_cache_driver_pos_h3
    ON cache_driver_positions (h3_index);

-- GIST spatial index for point queries ("where is driver X right now?")
CREATE INDEX IF NOT EXISTS ix_cache_driver_pos_gist
    ON cache_driver_positions USING gist (location);

-- ── pg_notify trigger — GPS position fan-out ──────────────────────────────────
-- Fires AFTER every INSERT/UPDATE on cache_driver_positions.
-- GpsNotifyListenerService holds a persistent LISTEN 'gps' connection
-- and forwards the payload to SignalR → customer map update.

CREATE OR REPLACE FUNCTION fn_notify_gps()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    payload text;
BEGIN
    -- Compact payload — pg_notify limit is 8 KB
    payload := json_build_object(
        'driverId', NEW.driver_id,
        'orderId',  NEW.order_id,
        'lat',      ST_Y(NEW.location::geometry),
        'lng',      ST_X(NEW.location::geometry),
        'heading',  NEW.heading,
        'ts',       EXTRACT(EPOCH FROM NEW.updated_at)::bigint
    )::text;

    PERFORM pg_notify('gps', payload);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gps_notify ON cache_driver_positions;
CREATE TRIGGER trg_gps_notify
    AFTER INSERT OR UPDATE ON cache_driver_positions
    FOR EACH ROW EXECUTE FUNCTION fn_notify_gps();

-- ── Nearby chefs cache (UNLOGGED, geohash-keyed) ─────────────────────────────
-- Caches results of ST_DWithin chef discovery queries per geohash-6 cell.
-- Application checks staleness (> 5 min) before using cached results.

CREATE UNLOGGED TABLE IF NOT EXISTS cache_nearby_chefs (
    geohash    text        PRIMARY KEY,  -- geohash-6 ≈ 1.2 km × 0.6 km
    chefs_json jsonb       NOT NULL,     -- serialised NearbyChefDto[]
    cached_at  timestamptz NOT NULL DEFAULT now()
);

-- GIN index enables fast cache invalidation by chef ID when availability changes
CREATE INDEX IF NOT EXISTS ix_cache_nearby_chefs_gin
    ON cache_nearby_chefs USING gin (chefs_json);

-- ── Helpful comments for future developers ────────────────────────────────────
COMMENT ON TABLE cache_driver_positions IS
    'Ephemeral driver GPS cache. Written by DeliveryPositionCache.UpsertAsync. '
    'Triggers pg_notify(''gps'') → GpsNotifyListenerService → SignalR → customer map.';

COMMENT ON TABLE cache_nearby_chefs IS
    'TTL cache for GetNearbyChefMeals PostGIS results, keyed by geohash-6 cell. '
    'Invalidated when a chef''s availability or location changes.';
