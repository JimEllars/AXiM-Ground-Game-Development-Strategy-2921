# Cloudflare deployment

The Cloudflare Worker serves the built React PWA and proxies `/api/*` to the existing Express/PostGIS/Redis service. This keeps the stateful services required by geospatial queries and BullMQ while preventing browsers from directly accessing the API origin.

## Prerequisites

- A deployed API origin that reaches the Express service over HTTPS. Publish a private container or VM through Cloudflare Tunnel; do not expose port 3001 directly.
- A PostgreSQL instance with PostGIS and a Redis instance reachable by the API origin.
- Cloudflare R2 enabled on the account, a bucket named `axim-ground-game-audio`, and R2 S3 API credentials configured on the API origin using the names in `server/.env.example`.

## Deploying the frontend edge application

1. Copy `.dev.vars.example` to `.dev.vars` for local Worker development.
2. Build and deploy with `npm run deploy:cloudflare:staging` or `npm run deploy:cloudflare:production`.
3. Set these Worker secrets interactively for each environment:

   ```bash
   npx wrangler secret put API_ORIGIN --env staging
   npx wrangler secret put ORIGIN_AUTH_TOKEN --env staging
   npx wrangler secret put API_ORIGIN --env production
   npx wrangler secret put ORIGIN_AUTH_TOKEN --env production
   ```

`API_ORIGIN` is the HTTPS URL created by the Cloudflare Tunnel. `ORIGIN_AUTH_TOKEN` must be a distinct, long random value per environment and must match the value supplied to the Express service. The Worker adds this header only while proxying API requests; production API calls made directly to the origin are rejected.

## Required Cloudflare configuration

1. Create a remotely managed Cloudflare Tunnel on the API host and publish the API as an HTTPS hostname.
2. Bind the production Worker to the application hostname in Workers & Pages.
3. Enable R2 for the Cloudflare account, then create the R2 bucket and an S3 API token restricted to that bucket. Configure the resulting endpoint, access key, secret, and bucket name as API-origin secrets.
4. Add a WAF custom rule that allows the API hostname only through the Cloudflare-managed route and rate-limits `/api/auth/*`, `/api/interactions/*`, and `/api/leads/*`.

The Worker has request logging enabled through Workers Observability. Keep the API origin private behind Tunnel so the shared origin token is defense in depth rather than the only network control.
