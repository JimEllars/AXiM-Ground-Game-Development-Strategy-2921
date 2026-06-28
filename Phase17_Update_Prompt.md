# Follow-up Update Prompt: Phase 17 - Production Hardening, Telemetry & UI Refinement

## Context
AXiM Ground Game has achieved significant MVP functionality and successfully completed Phase 16, which included sync reconciliation, geospatial clustering, structured telemetry logging, and CSV exports. The system is in "Production Mode." The goal is to move the build methodically toward a fully functional, enterprise-level system. At this stage, 90% of our efforts must be dedicated to:
1. System Activation & Testing
2. Telemetry & Monitoring Setup
3. Modernizing UI and Design Quality
4. Reinforcing Core Capabilities

Only 10% (or less) of time should be spent on introducing new features.

## Accomplishments Review (Phases 15 & 16)
- **Interaction History:** Reps now view a merged list of local (pending sync) and server interaction history for leads.
- **Resilient Crash Telemetry:** `ErrorBoundary` correctly caches crash data in IndexedDB when offline, syncing automatically on reconnection.
- **Mobile Touch Targets:** 44x44px minimum sizing enforced across core map elements and forms.
- **Tap-to-Navigate:** Address strings correctly format into map URIs.
- **Sync Reconciliation:** Added delta mapping to ensure local field rep entries override conflicting remote edits.
- **Geospatial Clustering:** Implemented Mapbox marker clustering for high-density lead views, dramatically improving map render performance.
- **Structured Error Logging:** Backend `analyticsController` now correctly sanitizes and streams front-end telemetry to isolated file logs (`client-exceptions.log`).
- **CSV Export:** Client-side CSV generation added for local territory/lead backups.

## Phase 17 Requirements

Please proceed with Phase 17 focusing on the following priority objectives:

### 1. Telemetry and System Verification (High Priority)
- **Log Verification:** Ensure that the `logger.ts` and `analyticsController.ts` implementations correctly catch edge cases (e.g., circular JSON references, extremely large stack traces). Implement a strict maximum length for stringified payloads in both the frontend interceptor and backend receiver.
- **Network Request Tracing:** Extend `api.ts` (Axios interceptors) to track frontend API latency and emit background telemetry to `analyticsAPI.reportTelemetry` if responses take longer than 5 seconds. This helps us identify production slow-downs.

### 2. UI/UX Modernization & Polish
- **Component Styling Update:** Ensure our core `App.tsx` theme accurately maps across all primary components. The current blue/gold AXiM theme needs to be consistently applied to headers, sidebar navigation, and loading states.
- **Skeletal Loaders:** Review `SkeletonLoader.tsx` and ensure it is uniformly used during data fetches in `LeadDetails.tsx`, `LeadManagement.tsx`, and `AnalyticsDashboard.tsx` to prevent UI "jumping".
- **Responsive Layouts:** Verify that the `LeadInteractionForm.tsx` and `AppointmentForm.tsx` display cleanly on screens <350px width, ensuring labels do not overlap inputs.

### 3. Reinforcing Core Capabilities (Bug Fixes & Hardening)
- **Database Connection Handling:** Ensure the Express shutdown handlers (for SIGINT/SIGTERM) correctly utilize an `isShuttingDown` flag to gracefully terminate the PG pool and prevent `Called end on pool more than once` errors during PM2/Docker restarts.
- **Offline Sync Resilience:** In `syncEngine.ts`, wrap the `batch` update loop in a robust try/catch that prevents a single malformed interaction object from halting the entire sync queue.

### 4. New Feature (10% capacity cap)
- **Read-Only Rep Analytics View:** Create a small, read-only summary in the Rep Dashboard (`RepTurf.tsx` or `PerformanceMetrics.tsx` adapted for Reps) showing their *personal* completion rate for the day. Do not over-engineer; simply fetch and display today's interacted vs. assigned leads count.

## Instructions for Agents
1. Begin by running the existing unit and e2e test suites to ensure a stable baseline. Both `npm test` in the root and `cd server && npm test` should pass.
2. Implement the above items methodically.
3. Update `README_REVIEW.md` with a `# Phase 17 Review` section detailing exact technical implementations for each step.
4. Do not leave placeholder/scratchpad code behind. Ensure all code complies with the project's strict TypeScript mode.
5. Once complete with the code changes, complete the pre-commit steps to ensure verification.
6. Provide a summary of completion at the end.
