# Norsk Nettverk — v2 (Mapping App)

Mobile-first investigative tool exploring relationships between Norwegian politicians, board members, and corporate roles. **Version 2** of [`froand/norwegian-board-network`](https://github.com/froand/norwegian-board-network), rebuilt around the Google Stitch "Nordic Nexus" mobile concept.

## Status

🚧 **Under construction.** v1 continues to run independently at the original repo.

## Stack

- **Frontend**: Next.js 15 (App Router) + TypeScript + Tailwind CSS v4 + PWA
- **Backend**: Node.js + Express + TypeScript (forked from v1)
- **Hosting**: Azure Container Apps
- **CI/CD**: GitHub Actions → Azure Container Registry → Container Apps

## Layout

```
.
├── frontend/   # Next.js 15 mobile-first app
├── backend/    # Express API (data ingestion + AI search + Brreg/karantene)
└── plan/       # Design references & decisions
```

## Local development

```pwsh
# Backend
cd backend
npm install
npm run dev          # http://localhost:3001

# Frontend (in a second terminal)
cd frontend
npm install
npm run dev          # http://localhost:3000
```

## Design

The dark "Nordic Nexus" theme uses Material 3 tokens (cyan primary, gold tertiary, dark navy surfaces). See `frontend/src/app/globals.css` for the design tokens.

Four-tab mobile nav:

- **Dashboard** — Conflict score overview, Revolving Door feed, sector watchlist
- **Nettverk** — Force-directed graph (touch-optimized)
- **Katalog** — Searchable directory with badges (REVOLVING DOOR RISK / CLEAN PROFILE / DISCLOSURE NEEDED)
- **Varsler** — Live investigative feed + personal watchlist

## Data sources

Inherits all v1 data sources: Brønnøysund (Brreg), Stortinget, Regjeringen, Karantenenemnda PDFs, and the curated person/party seed dataset.
