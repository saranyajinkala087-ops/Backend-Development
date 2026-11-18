# Lab 3: REST API, query parameters, validation, debugging

**Live link: <PASTE PUBLIC URL HERE>**

<YOUR NAME> · <YOUR REG NO> · <YOUR SECTION>

## How to run

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and set the environment variables you need: `PORT`, `DB_PATH`.
3. Seed the database: `npm run seed` (creates 18 sample books).
4. Start the API: `npm start` (or `npm run dev` while developing).

The default port is 3001 and the default database is `books.db` in this folder. The database file is ignored by Git.

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/books` | List books; `search_q` defaults to empty, `order_by` to `id`, `order` to `ASC`, `limit` to `10` (maximum 100), and `offset` to `0`; optional `min_price` and `max_price` filter prices. |
| GET | `/books/:id` | Return one book or a 404 message. |
| POST | `/books` | Create a book; title, author and numeric price are required. |
| PUT | `/books/:id` | Update one or more valid book fields. |
| DELETE | `/books/:id` | Delete a book. |

List responses use `{ "data": [...], "total": n, "limit": n, "offset": n }`; one-book responses use `{ "data": {...} }`. Create and update return `{ "message": "...", "data": {...} }`; delete returns `{ "message": "..." }`. Every error response is `{ "message": "..." }`.

## Postman checks

Import `postman/Lab3-Books-API.postman_collection.json` and `postman/Lab3.postman_environment.json`, select **Lab 3 Local**, and run the collection after seeding. The environment uses `baseUrl`. The collection includes 21 requests with status and response-shape assertions. Newman recorded **21 requests, 63 assertions passed, 0 failed** in `postman/TEST_LIST.md` and `postman/report.html`.

## Screenshots

**Newman run screenshots (Postman collection):** pending capture. The live screenshot tool budget was exhausted, and local report navigation is blocked by the browser security policy. I did not create or insert mock images. I will add Postman desktop screenshots myself.
## Notes

I carried the Lab 2 `book` table and Node.js, Express, and SQLite stack forward, then added input parsing and a single JSON error format. Sorting only uses a whitelist of known column names, and every user-provided SQL value is bound through a parameterized query. The seed script replaces the sample rows each time so the Postman run is repeatable.

### Debugging exercise

- **Port conflict:** I saw `EADDRINUSE` when a second server tried to listen on the same port. Both processes wanted the same address. I stopped the extra listener or selected a free `PORT`, then started one server.
- **Wrong import path:** Node reported `Cannot find module ...` while loading the app. The require path pointed to a file that did not exist. I corrected the relative path and reran the app.
- **Table-name typo:** SQLite returned `SQLITE_ERROR: no such table: books_typo`. The query used a misspelled table name. I changed it back to the schema's `book` table.
- **Missing `await`:** The query returned a Promise before SQLite had returned the row, so the response did not contain the expected book data. I added `await` before the async database call and verified the result.

The broken examples live in `debug-exercise/broken/`; the corrected copies and run commands are in `debug-exercise/fixed/`. Each defect is isolated so it can be reproduced and compared with its correction.

### Deployment

`render.yaml` describes a Render Node web service with `npm install` and `npm start`. Render supplies `PORT`; set `DB_PATH` to a writable path if needed. The included SQLite file is local and ephemeral on standard Render instances; attach persistent storage and point `DB_PATH` at its mount if you need data to survive restarts. I have not deployed the service.

## Viva prep

**Query parameter vs path parameter:** A query parameter follows `?` and filters or changes a collection request, such as `?limit=10`. A path parameter is part of the route and identifies a specific resource, such as `/books/4`.

**What does stateless mean?** Each request carries what the server needs to handle it, so the server does not rely on remembered client conversation state between requests. The database still stores book records.

**400 vs 404:** I return 400 when the request input is invalid, such as a non-numeric price. I return 404 when the request is valid but the requested book ID does not exist.



