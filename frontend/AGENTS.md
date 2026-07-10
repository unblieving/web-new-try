# Frontend guide

- Read the affected spec in `../specs/` and the operations in `../contracts/openapi.yaml` before implementing API-backed UI.
- Use Next.js App Router and React Server Components by default.
- Add `"use client"` only where browser state or effects are required.
- Keep API calls behind same-origin `/api` paths.
- Provide loading, empty, success, and error states for remote data.
- Preserve semantic HTML, keyboard access, and visible focus styles.
- Treat OpenAPI schemas as authoritative. Do not introduce another component-local copy of an API model; generate or centralize types when the touched code cannot consume generated types yet.
- Map frontend behavior tests and browser checks to the spec acceptance-criterion IDs.
- Run `npm run lint --workspace frontend` and `npm run build --workspace frontend` after changes.
