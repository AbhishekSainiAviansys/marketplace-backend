# Marketplace - Shopping Site Platform

A multi-panel e-commerce platform built with Laravel (PHP backend) and React (TypeScript frontend).

## Architecture

| Layer | Technology | Port | Purpose |
|-------|-----------|------|---------|
| API Backend | Laravel PHP | :8001 | REST API, authentication |
| Frontend Dev | Vite + React | :5173 | Dev server for all panels |
| Production | Laravel (serves SPA) | :8001 | Built React app + API |

## Port Configuration

**IMPORTANT**: The application runs on port 8001, not 8000.

| Service | URL |
|---------|-----|
| Laravel API | http://127.0.0.1:8001/ |
| Vite Dev Server | http://localhost:5173/ |
| Admin Panel | http://localhost:5173/admin |
| Vendor Panel | http://localhost:5173/vendor |
| School Panel | http://localhost:5173/school |
| Student Panel | http://localhost:5173/student |

## Installation

### Backend
cd backend && composer install && cp .env.example .env && php artisan key:generate && php artisan migrate && php artisan serve --port=8001

### Frontend
cd backend && npm install && npm run dev

### Build
cd backend && npm run build

## Shared UI Kit

resources/js/ui/ui.tsx contains shared React components (Logo, Button, Field, Modal, AuthScreen, etc.). Previously corrupted, now restored.

## Panels

| Panel | Route |
|-------|-------|
| Admin | /admin |
| Vendor | /vendor |
| School | /school |
| Coaching | /coaching |
| Student | /student |
| Storefront | / |

## Authentication

Bearer token (Sanctum). Tokens stored in localStorage.

## License

MIT License
