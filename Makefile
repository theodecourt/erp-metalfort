.PHONY: dev dev-backend dev-frontend supabase-start supabase-stop migrate seed test clean

SHELL := /bin/bash

dev:
	@trap 'make supabase-stop' EXIT; \
	make supabase-start && \
	(cd backend && uv run uvicorn app.main:app --reload --port 8000) & \
	(cd frontend && npm run dev) & \
	wait

supabase-start:
	npx supabase start

supabase-stop:
	npx supabase stop

migrate:
	npx supabase db reset

seed: migrate

test:
	cd backend && uv run pytest
	cd frontend && npm test -- --run

clean:
	npx supabase stop --no-backup 2>/dev/null || true
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
