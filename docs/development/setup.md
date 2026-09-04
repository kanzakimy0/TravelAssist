# Web Development Setup

## Requirements

- Node.js 20.9 or newer
- npm
- Git

## Install

```bash
npm install
```

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in a browser.

## Validation

```bash
npm run lint
npm run typecheck
npm run build
npm run format:check
```

## Git Workflow

- `main` contains release-ready work.
- `develop` is the integration branch.
- `feature/*` branches contain new work based on `develop`.
- `fix/*` branches contain fixes based on the appropriate integration branch.

Merge feature and fix branches through review. Do not develop directly on `main`.
