# Cloudflare deployment

The Cloudflare Worker serves the built React PWA and proxies `/api/*` to the existing Express API. The API uses the Supabase Postgres project `qcmlzjrrwiqsdltbkvtn` for PostGIS data and keeps the existing application API contract intact.

The production Worker is deployed at:

`https://axim-ground-game-production.jrellars.workers.dev`

## Prerequisites

- A deployed Express API origin that reaches port 3001 over HTTPS. Publish the API host through Cloudflare Tunnel; do not expose port 3001 directly.
- Supabase Postgres credentials for `qcmlzjrrwiqsdltbkvtn`. Configure the API with `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, and `DB_SSL=true` as documented in `server/.env.example`.
- A Redis instance reachable by the API origin for BullMQ.
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

`API_ORIGIN` is the HTTPS URL created by the Cloudflare Tunnel, not the Supabase REST URL. `ORIGIN_AUTH_TOKEN` must be a distinct, long random value per environment and must match the value supplied to the Express service. The Worker adds this header only while proxying API requests; production API calls made directly to the origin are rejected.

## Required Cloudflare configuration

1. Deploy the Express API with the Supabase Postgres and Redis environment variables, then create a remotely managed Cloudflare Tunnel on that host and publish an HTTPS API hostname.
2. Bind the production Worker to the application hostname in Workers & Pages.
3. Enable R2 for the Cloudflare account, then create the R2 bucket and an S3 API token restricted to that bucket. Configure the resulting endpoint, access key, secret, and bucket name as API-origin secrets.
4. Add a WAF custom rule that allows the API hostname only through the Cloudflare-managed route and rate-limits `/api/auth/*`, `/api/interactions/*`, and `/api/leads/*`.

The Worker has request logging enabled through Workers Observability. Keep the API origin private behind Tunnel so the shared origin token is defense in depth rather than the only network control.
