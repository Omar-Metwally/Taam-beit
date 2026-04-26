# Ta'am Beit 🍽

> **Flavors from Home, Delivered to Your Door.**
> A full-stack food delivery platform connecting customers with local home chefs.

![Stack](https://img.shields.io/badge/.NET-10.0-512BD4?style=flat-square&logo=dotnet)
![Stack](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![Stack](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)
![Stack](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql)
![Stack](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker)

---

## Overview

Ta'am Beit is a multi-role food delivery platform with three distinct user roles:

| Role | Description |
|------|-------------|
| **Customer** | Browse nearby home chefs, order meals, track delivery in real time |
| **Chef** | Manage menu, accept/reject orders, update order status |
| **Delivery Man** | Accept deliveries, broadcast live GPS location to customer |
| **Supervisor** | Review and approve chef and delivery man applications |

---

## Architecture

```
taambeit/
 ├── backend/      .NET 10 — Clean Architecture
 │    ├── src/
 │    │    ├── SharedKernel/    Entity base, Result<T>, Error pattern
 │    │    ├── Domain/          Aggregates, value objects, domain events
 │    │    ├── Application/     CQRS handlers, validators, abstractions
 │    │    ├── Infrastructure/  EF Core, PostGIS, H3, SignalR, JWT, Outbox
 │    │    └── Api/             ASP.NET Core controllers
 │    └── docker/postgres/      DB init SQL (PostGIS + H3 extensions)
 │
 └── frontend/     React 18 + Vite + TypeScript
      ├── src/
      │    ├── api/             Typed API client (Axios)
      │    ├── components/      Shared UI components
      │    ├── features/        Customer, Chef, Delivery, Supervisor, Auth
      │    ├── hooks/           Custom React hooks
      │    ├── store/           Zustand state (auth, cart, checkout)
      │    └── lib/             Utilities, helpers
      ├── nginx.conf            Production reverse proxy config
      └── Dockerfile            Multi-stage: Node build → Nginx runtime
```

### Backend layers

```
┌──────────────────────────────────────────┐
│               Api (HTTP)                 │  Controllers, middleware, Scalar docs
├──────────────────────────────────────────┤
│           Application (CQRS)             │  Commands, queries, domain event handlers
├──────────────────────────────────────────┤
│              Domain                      │  Aggregates, value objects, domain events
├──────────────────────────────────────────┤
│      Infrastructure (implementations)   │  EF Core, PostGIS, MinIO, SignalR, JWT
└──────────────────────────────────────────┘
```

---

## Key Technical Decisions

### Clean Architecture + CQRS without MediatR
Commands and queries dispatched via `ICommandHandler<T>` / `IQueryHandler<T,R>` — same pipeline as MediatR but explicit wiring, no reflection overhead. Logging and validation applied as **Scrutor decorators**.

### Outbox Pattern
Every domain event is serialised into an `outbox_messages` table **in the same transaction** as the aggregate change — at-least-once delivery guaranteed. A Quartz.NET job polls every 5 seconds and dispatches to registered `IDomainEventHandler<T>` implementations. **No command handler ever calls SignalR directly.**

### PostGIS for Chef Discovery
Chef operation locations stored as `geography(Point, 4326)`. `ST_DWithin` with a GIST index finds approved chefs within a radius in O(log n). Results ordered by distance.

### H3 Hexagonal Indexing for Delivery Fan-out
When an order is ready for pickup, nearby delivery men are found via Uber's H3 library. Driver positions are stored with an `h3_index bigint` column (resolution 9, ~0.1 km²). A `GridDisk(k=2)` lookup resolves to a plain B-tree `= ANY(array)` query — no spatial math at fan-out time.

### Real-time GPS via pg_notify
Driver GPS updates write to an `UNLOGGED` Postgres table. A trigger fires `pg_notify('gps', payload)`. A persistent `LISTEN` BackgroundService (`GpsNotifyListenerService`) receives the notification and pushes to the customer's SignalR group — no polling, sub-second latency.

### HttpOnly Cookie JWT
JWTs stored in `HttpOnly; Secure; SameSite=Strict` cookies — inaccessible to JavaScript, protected against XSS. Nginx forwards the cookie to the backend automatically.

### NetVips Image Processing
Meal and chef avatar images are processed before storage: EXIF metadata stripped (removes GPS coordinates from phone photos), resized to 3 variants (sm/md/lg), encoded as WebP at 80% quality using libvips — 4-8× faster than ImageSharp, constant memory regardless of input size.

### Private Document Storage
Health certificates and personal IDs stored in a **private MinIO bucket** with no public policy. Access only via time-limited **presigned URLs** (15 min) generated on supervisor request — never stored as permanent URLs.

---

## Domain Model

```
User                              Any user can place orders
 ├── ChefProfile?                 Applied + approved by supervisor
 └── DeliveryManProfile?          Applied + approved by supervisor

Meal                              Belongs to a chef
 ├── MealVariant[]                Size options (Small/Medium/Large), each with own price
 ├── SideDish[]                   Optional or required accompaniments
 └── ToppingGroup[]               Customisation groups (min/max selection rules)
      └── ToppingOption[]         Individual choices, can add extra price

Order                             Placed by any user, single chef per order
 └── OrderItem[]                  Price snapshots frozen at order time

DeliveryTracking                  Created when delivery man accepts order
```

### Order lifecycle

```
Pending → Confirmed → Preparing → ReadyForPickup → OutForDelivery → Delivered
       ↘ Rejected              ↘ Cancelled (customer, before Preparing)
```

---

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/)
- That's it — no .NET SDK or Node.js required to run

### Run with Docker (recommended)

```bash
# 1. Clone
git clone https://github.com/YOUR_USERNAME/taambeit.git
cd taambeit

# 2. Configure secrets
cp .env.example .env
#    → Edit .env and set a secure JWT_SECRET_KEY

# 3. Start everything
docker compose up --build
```

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost |
| **API** | http://localhost:5000 |
| **API docs** (Scalar) | http://localhost:5000/scalar/v1 |
| **MinIO Console** | http://localhost:9001 (minioadmin / minioadmin) |

> EF Core migrations run automatically on first API startup.

### Local Development (without Docker)

```bash
# Terminal 1 — Start infrastructure only
docker compose up db minio -d

# Terminal 2 — Run the API
cd backend
dotnet run --project src/Api

# Terminal 3 — Run the frontend dev server
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

### EF Core Migrations

```bash
cd backend

# Create a new migration
dotnet ef migrations add <MigrationName> \
  --project src/Infrastructure \
  --startup-project src/Api \
  --output-dir Persistence/Migrations

# Apply to database
dotnet ef database update \
  --project src/Infrastructure \
  --startup-project src/Api
```

---

## API Reference

Full interactive docs available at `http://localhost:5000/scalar/v1` when running.

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/users/register` | — | Register, sets HttpOnly cookie |
| POST | `/api/users/login` | — | Login, sets HttpOnly cookie |
| POST | `/api/users/logout` | ✓ | Clear auth cookie |

### Chef onboarding

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/users/me/chef-profile` | ✓ | Apply as chef |
| POST | `/api/users/me/chef-documents?documentType=HealthCertificate` | Chef | Upload private document |
| PUT | `/api/users/chef-profiles/{id}/approve` | Supervisor | Approve chef |
| GET | `/api/users/chef-documents/{id}?documentType=HealthCertificate` | Supervisor | Get 15-min presigned URL |

### Meals

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/meals/nearby?lat=&lng=&radiusKm=&dishType=&cuisineType=&sortOrder=` | — | Find nearby chefs |
| GET | `/api/meals/{mealId}` | — | Full meal detail |
| POST | `/api/meals` | Chef | Create meal |
| POST | `/api/meals/{id}/variants` | Chef | Add size variant |
| POST | `/api/meals/{id}/image` | Chef | Upload meal image |

### Orders

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/orders` | ✓ | Place order |
| GET | `/api/orders/{id}` | ✓ | Order detail |
| PUT | `/api/orders/{id}/confirm` | Chef | Confirm order |
| PUT | `/api/orders/{id}/ready-for-pickup` | Chef | Mark ready (triggers H3 delivery fan-out) |
| POST | `/api/deliveries/{orderId}/accept` | DeliveryMan | Accept delivery |
| PUT | `/api/deliveries/{id}/delivered` | DeliveryMan | Mark delivered |

### Real-time (SignalR)

| Hub | Path | Events |
|-----|------|--------|
| OrderHub | `/hubs/orders` | `NewOrderReceived`, `OrderStatusChanged` |
| DeliveryHub | `/hubs/delivery` | `NewDeliveryAvailable`, `DriverLocationUpdated` |

---

## Project Structure Details

### Backend — Application layer patterns

```csharp
// Every command handler follows this pattern — validate, mutate, save. That's it.
// Side effects go through domain event handlers via the outbox.
internal sealed class ConfirmOrderCommandHandler(...) : ICommandHandler<ConfirmOrderCommand>
{
    public async Task<r> Handle(ConfirmOrderCommand command, CancellationToken ct)
    {
        var order = await dbContext.Orders.FirstOrDefaultAsync(...);
        order.Confirm(dateTimeProvider.UtcNow);
        await dbContext.SaveChangesAsync(ct);
        // OrderConfirmedDomainEvent → outbox → handler notifies customer via SignalR
        return Result.Success();
    }
}
```

### Frontend — Feature folder structure

```
src/features/
 ├── customer/       Landing, Menu (chef cards), Chef profile, Meal detail,
 │                   Cart, Checkout (3-step), Order tracking (live map)
 ├── chef/           Dashboard, order queue, meal management
 ├── delivery/       Available orders, active delivery
 ├── supervisor/     Application review, document viewing
 └── auth/           Login, Register
```

---

## Screenshots

| Landing | Chef Browse | Meal Detail |
|---------|-------------|-------------|
| Hero with location search | Chef cards with meal previews | Size/topping/side dish selection |

| Checkout | Order Tracking |
|----------|----------------|
| 3-step: Cart → Address → Pay | Live map with driver position |

---

## Tech Stack

### Backend
- **.NET 9** — ASP.NET Core Web API
- **Entity Framework Core 10** with **Npgsql + PostGIS** (NetTopologySuite)
- **PostgreSQL 16** — primary database
- **H3.net** — hexagonal geospatial indexing for delivery fan-out
- **SignalR** — real-time order status and GPS tracking
- **MinIO** — S3-compatible object storage (meal images, private documents)
- **NetVips** — libvips image processing (EXIF strip, resize, WebP encode)
- **Quartz.NET** — outbox processor background job
- **FluentValidation** — command/query validation
- **Scrutor** — assembly scanning and decorator registration
- **BCrypt.Net** — password hashing
- **Newtonsoft.Json** — outbox message serialisation

### Frontend
- **React 18** + **TypeScript 5** + **Vite 5**
- **Tailwind CSS 3** — utility-first styling
- **TanStack Query v5** — server state, caching, optimistic updates
- **Zustand** — client state (auth, cart, checkout)
- **React Router v6** — SPA routing with lazy loading
- **React Hook Form + Zod** — form handling and validation
- **@microsoft/signalr** — real-time order tracking
- **react-leaflet + Leaflet** — live delivery map with OpenStreetMap tiles
- **Lucide React** — icon library

### Infrastructure
- **Docker Compose** — local orchestration
- **Nginx** — production reverse proxy (SPA fallback + `/api` proxy + WebSocket upgrade)
- **pg_notify** — PostgreSQL push notifications for GPS fan-out

---

## Contributing

This project is a portfolio piece — issues and pull requests are welcome for learning discussions.

---

## License

MIT
