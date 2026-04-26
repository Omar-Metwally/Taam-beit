.PHONY: up down build dev migrate logs clean help

# ── Docker (production build) ─────────────────────────────────────────────────

up: ## Start all services (production build)
	docker compose up --build -d
	@echo "\n✅  Ta'am Beit is running:"
	@echo "   Frontend  →  http://localhost"
	@echo "   API docs  →  http://localhost:5000/scalar/v1"
	@echo "   MinIO UI  →  http://localhost:9001\n"

down: ## Stop all services
	docker compose down

build: ## Rebuild all images without starting
	docker compose build

# ── Development ───────────────────────────────────────────────────────────────

dev: ## Start infrastructure + API + frontend in dev mode (HMR)
	docker compose up db minio -d
	@echo "Starting API and frontend in dev mode..."
	@echo "Run these in separate terminals:"
	@echo "  cd backend  && dotnet run --project src/Api"
	@echo "  cd frontend && npm install && npm run dev"

# ── Database ──────────────────────────────────────────────────────────────────

migrate: ## Run EF Core migrations against the running database
	cd backend && dotnet ef database update \
		--project src/Infrastructure \
		--startup-project src/Api

migration: ## Create a new EF Core migration (usage: make migration NAME=AddRatings)
	cd backend && dotnet ef migrations add $(NAME) \
		--project src/Infrastructure \
		--startup-project src/Api \
		--output-dir Persistence/Migrations

# ── Logs ──────────────────────────────────────────────────────────────────────

logs: ## Tail logs from all containers
	docker compose logs -f

logs-api: ## Tail API logs only
	docker compose logs -f api

logs-db: ## Tail database logs only
	docker compose logs -f db

# ── Cleanup ───────────────────────────────────────────────────────────────────

clean: ## Stop containers and remove volumes (WARNING: deletes all data)
	docker compose down -v
	@echo "All containers and volumes removed."

# ── Help ──────────────────────────────────────────────────────────────────────

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'
