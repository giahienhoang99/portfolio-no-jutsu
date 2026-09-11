# Portfolio no Jutsu

A minimal, anime-inspired portfolio template built as an npm-workspaces monorepo.

## Structure

- `apps/web` — Next.js frontend.
- `apps/api` — future analytics API.
- `packages/contracts` — shared configuration and analytics types.
- `portfolio.config.json` — owner-editable site content and settings.

## Getting started

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The initial scaffold intentionally contains a small placeholder page; the portfolio prototype is the next implementation step.

## Testing

Run the complete unit test suite from the repository root:

```bash
npm test
```

Run the complete suite with coverage thresholds and an HTML report:

```bash
npm run test:coverage
```

The root coverage report is written to `coverage/index.html`. To run only one workspace, use:

```bash
npm test --workspace @portfolio-no-jutsu/contracts
npm test --workspace @portfolio-no-jutsu/web
```

Workspace-specific coverage reports can be generated with:

```bash
npm run test:coverage --workspace @portfolio-no-jutsu/contracts
npm run test:coverage --workspace @portfolio-no-jutsu/web
```

Those HTML reports are written to `coverage/contracts/index.html` and `coverage/web/index.html`. Before merging, also run the static checks and production build:

```bash
npm run lint
npm run build
```

## Configuration

Edit `portfolio.config.json` to change the owner name, role, themes, page order, visibility, and content. Do not put secrets or analytics credentials in this file.

### Avatar

Place avatar images in `apps/web/public/avatars/`, then set `site.avatarFileName` in `portfolio.config.json` to the exact filename. The site builds the public image path as `/avatars/<avatarFileName>`. Use `site.avatarAlt` for the accessible image description.

The Home illustration uses `site.heroPortraits`. Provide one `fileName` and `alt` entry for each enabled theme; portrait files use the same `apps/web/public/avatars/` directory.
