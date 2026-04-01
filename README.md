# Skill Web IDE

A web-based IDE for building and testing skills, powered by a pnpm workspace monorepo (`frontend`, `backend`, `shared`).

## Prerequisites

- Node.js >= 18
- pnpm

## Getting Started

```bash
pnpm install
pnpm dev
```

This starts both the frontend (Vite, port 5173) and the backend concurrently.

## Environment Variables

Copy the example env file and adjust as needed:

```bash
cp frontend/.env.example frontend/.env
```

| Variable | Description | Default |
|---|---|---|
| `VITE_FEEDBACK_URL` | Feedback link shown in the header | `https://github.com/qsbao/skill-web-ide/issues/new/choose` |

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start frontend + backend in dev mode |
| `pnpm build` | Build all packages |
| `pnpm lint` | Lint all packages |
