# Test cases for API endpoints (Postman) — Uzh Route Planner

Base URL (local dev): `http://localhost:3000` (run `npm run dev` inside `mvp/`)

1) Healthcheck — `GET /api/ping`
- **Purpose:** Verify server is reachable and route responds.
- **Request:** `GET http://localhost:3000/api/ping`
- **Headers:** none
- **Body:** none
- **Expected result:** 200 OK, JSON like `{ "ok": true, "pong": true, "timestamp": "..." }`
- **Actual result:** (fill after test)

2) Search — `GET /api/search?q=...` (proxy to Nominatim, bounded to Uzhhorod)
- **Purpose:** Search for places in Uzhhorod and return candidate locations used by the map.
- **Request example:** `GET http://localhost:3000/api/search?q=площа&limit=5`
- **Headers:** none
- **Body:** none
- **Expected result:** 200 OK, JSON `{ "ok": true, "results": [ /* Nominatim items with lat/lon */ ] }`
- **Actual result:** (fill after test)

3) Route — `POST /api/route` (proxy to OSRM)
- **Purpose:** Calculate route info (distance/duration/geometry) between 2+ map points using OSRM.
- **Request:** `POST http://localhost:3000/api/route`
- **Headers:** `Content-Type: application/json`
- **Body (valid example):**
  ```json
  {
    "mode": "driving",
    "points": [
      { "lat": 48.6208, "lng": 22.2879 },
      { "lat": 48.6230, "lng": 22.2950 }
    ]
  }
  ```
- **Expected result (valid):** 200 OK, JSON `{ "ok": true, "distance": <meters>, "duration": <seconds>, "geometry": { ... } }`
- **Expected result (invalid):** 400 Bad Request with error when `points` missing or invalid.
- **Actual result:** (fill after test)

Quick curl examples (run from `mvp/`):

```bash
# Healthcheck
curl -i http://localhost:3000/api/ping

# Search (Nominatim proxy limited to Uzhhorod)
curl -i "http://localhost:3000/api/search?q=площа&limit=3"

# Route (OSRM proxy) - example two points in Uzhhorod
curl -i -X POST http://localhost:3000/api/route -H "Content-Type: application/json" -d '{"mode":"driving","points":[{"lat":48.6208,"lng":22.2879},{"lat":48.6230,"lng":22.2950}]}'

# Route (invalid) - missing points
curl -i -X POST http://localhost:3000/api/route -H "Content-Type: application/json" -d '{}'
```

Notes:
- These endpoints proxy public services used by the app (Nominatim for search, OSRM for routing) so Postman/curl tests mirror map behaviour.
- After running tests, paste response body/status into **Actual result** fields for reporting.
- If you want I can add automated tests using Jest+supertest or a Postman collection JSON export.
