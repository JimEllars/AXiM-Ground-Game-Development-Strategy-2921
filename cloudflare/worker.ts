
const verifyHmacSignature = async (
  request: Request,
  secret: string,
  signatureHeaderName: string
): Promise<boolean> => {
  const signatureHex = request.headers.get(signatureHeaderName);
  if (!signatureHex) return false;

  try {
    const bodyClone = await request.clone().text();
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify", "sign"]
    );

    // Some webhooks pass 'Bearer <hash>' or just '<hash>'
    const actualSignatureHex = signatureHex.startsWith('Bearer ')
      ? signatureHex.slice(7)
      : signatureHex;

    const signatureBuffer = new Uint8Array(actualSignatureHex.length / 2);
    for (let i = 0; i < actualSignatureHex.length; i += 2) {
      signatureBuffer[i / 2] = parseInt(actualSignatureHex.substring(i, i + 2), 16);
    }

    // Verify using crypto.subtle (if length matches)
    try {
      return await crypto.subtle.verify(
        "HMAC",
        key,
        signatureBuffer,
        encoder.encode(bodyClone)
      );
    } catch {
       // if length doesn't match for some reason, verify will throw.
       // fallback to manual comparison to allow just 'Bearer <secret>' mode like in Express
       if (actualSignatureHex === secret) return true;
       return false;
    }
  } catch (error) {
    return false;
  }
};
const MAPBOX_PATHS = ["/v4/", "/styles/v1/", "/fonts/"];
const BODYLESS_METHODS = new Set(["GET", "HEAD"]);

const isMapboxRequest = (request: Request, url: URL): boolean =>
  (request.method === "GET" || request.method === "HEAD") &&
  MAPBOX_PATHS.some((prefix) => url.pathname.startsWith(prefix));

const secureResponse = (response: Response, isApiResponse: boolean): Response => {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), payment=()");
  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");

  if (isApiResponse) {
    headers.set("Cache-Control", "private, no-store");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

const proxyMapbox = async (
  request: Request,
  ctx: ExecutionContext,
): Promise<Response> => {
  const cachedResponse = await caches.default.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  const mapboxUrl = new URL(request.url);
  mapboxUrl.hostname = "api.mapbox.com";
  const response = await fetch(new Request(mapboxUrl, request));

  if (!response.ok) {
    return response;
  }

  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "public, max-age=604800");
  headers.set("Access-Control-Allow-Origin", "*");
  const cacheableResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
  ctx.waitUntil(caches.default.put(request, cacheableResponse.clone()));
  return cacheableResponse;
};

const proxyApi = async (request: Request, url: URL, env: Env): Promise<Response> => {
  if (!env.API_ORIGIN || !env.ORIGIN_AUTH_TOKEN) {
    return Response.json(
      { error: "The API origin is not configured." },
      { status: 503 },
    );
  }

  let originUrl: URL;
  try {
    originUrl = new URL(env.API_ORIGIN);
  } catch {
    return Response.json(
      { error: "The API origin is invalid." },
      { status: 503 },
    );
  }

  if (
    originUrl.protocol !== "https:" &&
    !(env.ENVIRONMENT === "development" && originUrl.protocol === "http:")
  ) {
    return Response.json(
      { error: "The API origin must use HTTPS." },
      { status: 503 },
    );
  }

  const targetUrl = new URL(`${url.pathname}${url.search}`, originUrl);
  const headers = new Headers(request.headers);
  headers.delete("cf-connecting-ip");
  headers.delete("cf-ipcountry");
  headers.delete("x-axim-origin-token");
  headers.delete("x-forwarded-for");
  headers.delete("x-forwarded-host");
  headers.delete("x-forwarded-proto");
  headers.set("x-axim-origin-token", env.ORIGIN_AUTH_TOKEN);
  if (env.AXIM_INTERNAL_API_KEY) {
    headers.set("x-axim-internal-api-key", env.AXIM_INTERNAL_API_KEY);
  }
  headers.set("x-forwarded-host", url.host);
  headers.set("x-forwarded-proto", url.protocol.slice(0, -1));

  try {
    return await fetch(
      new Request(targetUrl, {
        method: request.method,
        headers,
        body: BODYLESS_METHODS.has(request.method) ? undefined : request.body,
        redirect: "manual",
      }),
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        message: "API origin request failed",
        path: url.pathname,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    return Response.json(
      { error: "The API is temporarily unavailable." },
      { status: 502 },
    );
  }
};

export default {

  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);
    if (url.protocol !== "https:" && env.ENVIRONMENT !== "development") {
      return new Response("Strict HTTPS is required.", { status: 403 });
    }

    if (url.pathname === "/api/v1/leads/import" && request.method === "POST") {
    }

    if (isMapboxRequest(request, url)) {
      return secureResponse(await proxyMapbox(request, ctx), false);
    }

    const geoMatch = url.pathname.match(/^\/api\/v1\/territories\/([^\/]+)\/geo$/);
    if (geoMatch && request.method === "GET") {
      const cache = caches.default;
      const cachedResponse = await cache.match(request);
      if (cachedResponse) {
        const response = new Response(cachedResponse.body, cachedResponse);
        response.headers.set('CF-Cache-Status', 'HIT');
        return response;
      }
    }



    const isApiRequest =
      url.pathname === "/api" || url.pathname.startsWith("/api/");

    if (isApiRequest && request.method === "POST" && url.pathname.startsWith("/api/v1/webhooks/")) {
       let secret = "";
       let headerName = "";

       if (url.pathname === "/api/v1/webhooks/deskera-ingest") {
          secret = env.DESKERA_WEBHOOK_SECRET;
          headerName = "x-deskera-signature";
       } else if (url.pathname === "/api/v1/webhooks/emailit") {
          secret = env.EMAILIT_WEBHOOK_SECRET;
          headerName = "x-emailit-signature";
       }

       if (secret) {
          // Check standard authorization header first for simplicity mode
          const authHeader = request.headers.get("authorization");
          let isValid = false;

          if (authHeader === `Bearer ${secret}` || authHeader === secret) {
             isValid = true;
          } else {
             // Or verify proper HMAC SHA-256 signature
             isValid = await verifyHmacSignature(request, secret, headerName);
             if (!isValid && request.headers.get("authorization")) {
                isValid = await verifyHmacSignature(request, secret, "authorization");
             }
          }

          if (!isValid) {
             return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { "Content-Type": "application/json" }
             });
          }
       }
    }


    let response = isApiRequest
      ? await proxyApi(request, url, env)
      : await env.ASSETS.fetch(request);

    const geoMatchAfter = url.pathname.match(/^\/api\/v1\/territories\/([^\/]+)\/geo$/);
    if (isApiRequest && geoMatchAfter && request.method === "GET" && response.ok) {
      response = new Response(response.body, response);
      response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400');
      ctx.waitUntil(caches.default.put(request, response.clone()));
    }

    return secureResponse(response, isApiRequest);

  },
} satisfies ExportedHandler<Env>;
