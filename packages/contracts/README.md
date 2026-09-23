# Shared contracts

`@portfolio-no-jutsu/contracts` is the runtime and TypeScript contract boundary shared by the portfolio application and its server-side Route Handlers.

It exports strict Zod schemas and inferred types for:

- the allowlisted analytics events and normalized internal routes;
- public analytics settings and metric switches;
- UTC metrics date ranges and aggregate responses;
- same-origin résumé PDF paths and safe download filenames.

Unknown fields and unsafe values are rejected at runtime. Secrets are deliberately excluded: database credentials, authentication tokens, allowed origins, and hashing secrets are validated only in the server-side configuration loader under `apps/web`.

Run its tests from the repository root:

```bash
npm test --workspace @portfolio-no-jutsu/contracts
```
