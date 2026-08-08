/**
 * Serves the PWA from Cloudflare and forwards API requests to the existing
 * stateful Express service without exposing that service directly to clients.
 */

export interface Env {
  API_ORIGIN: string;
  ORIGIN_AUTH_TOKEN: string;
  ENVIRONMENT: string;
  ASSETS: any;
  RATE_LIMITER: any;
}

export default {
  async fetch(request, env): Promise<Response> {
    const requestUrl = new URL(request.url);

    if (requestUrl.protocol === "http:") {
      return new Response("Strict HTTPS is required.", { status: 403 });
    }


    // Intercept map tile requests for edge caching (routed via VITE_AXIM_PROXY_URL replacing api.mapbox.com)
    // The request to worker has path like /v4/mapbox.mapbox-streets-v8/1/0/0.mvt
    if (requestUrl.pathname.includes('/v4/') || requestUrl.pathname.includes('/styles/v1/') || requestUrl.pathname.includes('/fonts/') || requestUrl.searchParams.has('access_token')) {
      const cache = (caches as any).default;
      let response = await cache.match(request);

      if (!response) {
        // Reconstruct the original mapbox URL
        const mapboxUrl = new URL(request.url);
        mapboxUrl.hostname = 'api.mapbox.com';

        const providerRequest = new Request(mapboxUrl.toString(), request);
        response = await fetch(providerRequest);

        if (response.ok) {
          // Clone the response to modify headers and store in cache
          response = new Response(response.body, response);
          response.headers.set('Cache-Control', 'public, max-age=604800'); // 7 days
          response.headers.set('Access-Control-Allow-Origin', '*'); // Preserve CORS

          // Put the clone in cache (we must clone before reading or caching)
          // Wait, fetch might already return cors headers. We ensure them.
          const cacheResponse = response.clone();
          // We can put it in cache using the original worker request
          // It's usually better to cache based on the worker request
          await cache.put(request, cacheResponse);
        }
      }
      return response;
    }


    // Task 2: Cloudflare Edge Rate-Limit Perimeter Guard
    const clientIp = request.headers.get("cf-connecting-ip") || "unknown-ip";
    const path = requestUrl.pathname;

    // Check if path is targeted for rate limiting
    const isLogin = path === "/api/auth/login";
    const isMapPin = path === "/edge/territory-pins";

    if (isLogin || isMapPin) {
      if (env.RATE_LIMITER) {
        const limitType = isLogin ? "login" : "mappins";
        const limitCount = isLogin ? 10 : 100;
        const windowKey = `${clientIp}:${limitType}:${Math.floor(Date.now() / 60000)}`;

        let currentCount = 0;
        try {
          const val = await env.RATE_LIMITER.get(windowKey);
          if (val) {
             currentCount = parseInt(val, 10);
          }
          if (currentCount >= limitCount) {
             console.warn(`Rate limit exceeded for ${clientIp} on ${path}`);
             return new Response(JSON.stringify({ error: "Too Many Requests" }), {
                status: 429,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
             });
          }
          await env.RATE_LIMITER.put(windowKey, (currentCount + 1).toString(), { expirationTtl: 60 });
        } catch (err) {
          console.error("Rate Limiter error", err);
          // Fails open
        }
      }
    }

    if (!requestUrl.pathname.startsWith("/api/")) {

      return env.ASSETS.fetch(request);
    }

    if (!env.API_ORIGIN || !env.ORIGIN_AUTH_TOKEN) {
      return Response.json(
        { error: "The API origin is not configured." },
        { status: 503 },
      );
    }

    const originUrl = new URL(env.API_ORIGIN);
    const targetUrl = new URL(
      `${requestUrl.pathname}${requestUrl.search}`,
      originUrl,
    );
    const headers = new Headers(request.headers);

    headers.delete("cf-connecting-ip");
    headers.delete("cf-ipcountry");
    headers.delete("x-axim-origin-token");
    headers.set("x-axim-origin-token", env.ORIGIN_AUTH_TOKEN);
    headers.set("x-forwarded-host", requestUrl.host);
    headers.set("x-forwarded-proto", requestUrl.protocol.slice(0, -1));

    try {
      return await fetch(
        new Request(targetUrl, {
          method: request.method,
          headers,
          body: request.body,
          redirect: "manual",
        }),
      );
    } catch (error) {
      console.error(
        JSON.stringify({
          message: "API origin request failed",
          path: requestUrl.pathname,
          error: error instanceof Error ? error.message : String(error),
        }),
      );

      return Response.json(
        { error: "The API is temporarily unavailable." },
        { status: 502 },
      );
    }
  },
} satisfies ExportedHandler<Env>;
