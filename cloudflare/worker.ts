/**
 * Serves the PWA from Cloudflare and forwards API requests to the existing
 * stateful Express service without exposing that service directly to clients.
 */
export default {
  async fetch(request, env): Promise<Response> {
    const requestUrl = new URL(request.url);

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
