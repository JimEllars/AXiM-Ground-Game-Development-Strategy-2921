# Cloudflare deployment and activation

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
2. Authenticate the deployment account with `npx wrangler login`, then confirm the account with `npx wrangler whoami`.
3. Build and deploy with `npm run deploy:cloudflare:staging` or `npm run deploy:cloudflare:production`.
4. Set these Worker secrets interactively for each environment:

   ```bash
   npx wrangler secret put API_ORIGIN --env staging
   npx wrangler secret put ORIGIN_AUTH_TOKEN --env staging
   npx wrangler secret put API_ORIGIN --env production
   npx wrangler secret put ORIGIN_AUTH_TOKEN --env production
   ```

`API_ORIGIN` is the HTTPS URL created by the Cloudflare Tunnel, not the Supabase REST URL. `ORIGIN_AUTH_TOKEN` must be a distinct, long random value per environment and must match the value supplied to the Express service. The Worker adds this header only while proxying API requests; production API calls made directly to the origin are rejected. Set `FRONTEND_URL` on each Express deployment to that environment's public application URL.

## Required Cloudflare configuration

1. Deploy the Express API with the Supabase Postgres and Redis environment variables, then create a remotely managed Cloudflare Tunnel on that host and publish an HTTPS API hostname. Do not create a public DNS record that targets the API host directly.
2. Deploy staging before production. The Wrangler environments create separate Workers and each includes the static-assets binding required to serve the PWA.
3. Bind each Worker to its application hostname in Workers & Pages. Use a custom domain when the Worker is the hostname's only origin; use a route only when it runs in front of an existing proxied origin.
4. Enable R2 for the Cloudflare account, then create the R2 bucket and an S3 API token restricted to that bucket. Configure the resulting endpoint, access key, secret, and bucket name as API-origin secrets.
5. Add WAF rate-limiting rules for `/api/auth/*`, `/api/interactions/*`, and `/api/leads/*`. Keep the application-level login limiter as defense in depth.
6. Before each production release, use `npx wrangler deploy --env production --dry-run`, verify the generated types with `npm run cloudflare:types`, and retain a tested prior Worker version for rollback.

The Worker has request logging enabled through Workers Observability. Keep the API origin private behind Tunnel so the shared origin token is defense in depth rather than the only network control.

## AXiM Systems master administrator

The first AXiM Systems administrator is provisioned directly against the application database; this prevents public organization registration from becoming a privileged bootstrap path. The command creates or reuses the `AXiM Systems` organization and ensures the named user is an active `ADMIN` in that organization.

On the API host, set the database variables from `server/.env.example` plus `MASTER_ADMIN_EMAIL`, `MASTER_ADMIN_FIRST_NAME`, `MASTER_ADMIN_LAST_NAME`, and `MASTER_ADMIN_PASSWORD`, then run:

```bash
cd server
npm run admin:bootstrap
```

The command never prints a password. Re-running it is safe and retains the existing password. To intentionally rotate that password, also set `MASTER_ADMIN_RESET_PASSWORD=true`. Do not place any of these values in a committed file or Cloudflare Worker variable.
