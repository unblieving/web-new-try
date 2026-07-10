# Repository guide for coding agents

## Scope

This repository is a teaching monorepo. Prefer small, readable changes that can be explained to learners. Keep frontend, backend, and API contract changes synchronized.

## Delivery flow

1. Read the affected feature spec and project context before editing code.
2. Create or update a spec before changing user-visible behavior, business rules, data semantics, permissions, or concurrency behavior. Follow `specs/README.md`.
3. Update `contracts/openapi.yaml` before implementation when any observable HTTP behavior changes. This includes paths, methods, parameters, headers, bodies, schemas, status codes, errors, authentication, sorting, or pagination. Follow `contracts/README.md`.
4. Implement the smallest vertical slice and map automated tests or manual checks back to the acceptance criteria.
5. Run the affected workspace checks, then `npm run check` before handoff.

Pure documentation, formatting, or behavior-preserving refactors do not require a new spec or contract change. State that the external behavior is unchanged in the handoff.

## Commands

- Install dependencies with `npm install` at the repository root.
- Run all checks with `npm run check`.
- Run a single workspace command with `npm run <script> --workspace <frontend|backend>`.

## Conventions

- Use TypeScript for application code.
- Use two-space indentation and run `npm run format` before handing off changes.
- Keep secrets and generated SQLite files out of version control.
- Treat `contracts/openapi.yaml` as the source of truth for the HTTP boundary; database tables and duplicated TypeScript types are not API contracts.
- Keep each acceptance criterion observable and reproducible; do not use a code location as the expected outcome.
- Avoid introducing a dependency when the platform already provides a clear equivalent.
