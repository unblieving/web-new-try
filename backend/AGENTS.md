# Backend guide

- Read the affected spec in `../specs/` and update `../contracts/openapi.yaml` before changing observable HTTP behavior.
- Keep controllers thin; place business and persistence logic in services.
- Use dependency injection rather than constructing services inside controllers.
- Validate data at the HTTP boundary and return JSON-safe values.
- Use parameterized SQLite statements for external input.
- Match runtime validation to the OpenAPI constraints, including unknown fields and documented normalization.
- Keep HTTP handling in controllers, business rules and transactions in services, and extract persistence to a repository when the data model or business flow grows beyond the minimal sample.
- Use migrations for production schema evolution. Keep migrations backward compatible where a rolling deployment requires it.
- Cover success, boundary, invalid-input, empty-result, and documented error responses with API or service tests as applicable; reference the spec acceptance-criterion IDs.
- Run `npm run lint --workspace backend` and `npm run test --workspace backend` after changes.
