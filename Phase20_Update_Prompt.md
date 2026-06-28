# Phase 20: System Load Stress Testing & Environment Hardening (AXiM Ground Game)

## Objective
We are moving AXiM Ground Game towards full enterprise-grade production readiness. We need to focus on system load stress testing, environment variable isolation, memory profiling, and administrative recovery. Only 10% of our focus is on new features (like an admin reset routine) and 90% remains on hardening, telemetry, and resilience.

Your goal for this sprint is to stress test the system under high load (simulating dense enterprise territories), secure the configuration, and ensure that long-running sessions do not leak memory.

## 1. High-Density Database Stress Test
We must verify that the frontend Mapbox renderer, the Dexie.js offline DB, and the syncing engine can handle a massive number of leads without crashing or freezing.
- **Action:** Run the backend database seeder using the new stress flag: `node server/scripts/seed.js --stress`. This generates at least 2,500 densely packed mock leads within the test territory (e.g., Longview, TX).
- **Validation:**
  - Log in to the frontend and load the territory. Ensure Mapbox source clustering is handling the dense data appropriately.
  - Monitor the `IndexedDB` storage to confirm the encrypted `crypto-js` middleware efficiently encrypts/decrypts thousands of records on the fly.
  - Ensure background syncing processes handle large datasets without blocking the UI thread.

## 2. Production Environment Secret Isolation
Ensure all fallback development variables, wildcards, and exposed configurations are removed or strictly partitioned for production.
- **Action:**
  - Enforce strict CORS policies on the backend (removing any `*` origins and strictly allowing predefined VITE frontends or AXiM core domains).
  - Ensure all session cookies (`jwt` etc.) are marked with `HttpOnly`, `Secure`, and `SameSite=Strict`.
  - Disable any remaining "dev fallbacks" for sensitive credentials (e.g., if JWT_SECRET is missing, the app should fail to start, not default to 'supersecret').

## 3. Memory Backpressure Profiling (Backend & Frontend)
Long-running offline PWA sessions and background worker processes are prone to memory leaks.
- **Action:**
  - Write a Node.js benchmark script (`server/scripts/benchmark_mem.js`) to repeatedly ping the telemetry worker, sync engine endpoints, and heavy geospatial queries.
  - Assert that the V8 heap allocation remains flat over time and garbage collection cleans up orphaned object instances (especially `FormData` objects and Dexie transactions).
  - Run the benchmark script and capture the heap stats, storing the results in a log to prove there are no memory leaks.

## 4. Administrative Node Reset Routine (10% New Feature)
Field tablets sometimes get corrupted states (stuck Service Workers, desynced encrypted storage).
- **Action:**
  - Add a hidden "Emergency Node Reset" routine. E.g., clicking the app version number 7 times on the login screen, or visiting a specific route like `/recovery`.
  - This routine must entirely unregister all Service Workers, drop the entire IndexedDB database, clear `localStorage`/`sessionStorage`, and perform a hard `window.location.reload(true)`.

## Workflow & Testing Requirements
- **Do not bypass strict TypeScript checks.**
- Make sure to use the custom frontend/backend `logger` instead of `console.log`.
- All newly added components (like the recovery page) must have proper vitest unit tests wrapped in `QueryClientProvider` and `BrowserRouter`.
- Verify the system functions seamlessly by running `npm run e2e` and `npm run test` before completing your work.
- Append your progress notes to `README_REVIEW.md` once complete.
