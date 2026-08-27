
import pako from 'pako';

function createGzipResponse(data: any, status = 200): Response {
  const jsonStr = JSON.stringify(data);
  const compressed = pako.gzip(jsonStr);
  return new Response(compressed, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Content-Encoding': 'gzip'
    }
  });
}

export interface Env {
  CENTRAL_SUPPORT_WEBHOOK_URL: string;
  AXIM_INTERNAL_SERVICE_KEY: string;
  GROUNDGAME_KV?: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    const authHeader = request.headers.get('Authorization');
    const xAximKeyHeader = request.headers.get('X-Axim-Internal-Service-Key');

    let token = null;
    if (xAximKeyHeader) {
      token = xAximKeyHeader;
    } else if (authHeader) {
      if (authHeader.toLowerCase().startsWith('bearer ')) {
        token = authHeader.slice(7);
      } else {
        token = authHeader;
      }
    }

    if (!token || token !== env.AXIM_INTERNAL_SERVICE_KEY) {
      return createGzipResponse({ error: 'Unauthorized' }, 401);
    }

    if (url.pathname === '/api/v1/support/groundgame/cleanup-stale-kv') {
       if (request.method !== 'POST') return createGzipResponse({ error: 'Method not allowed' }, 405);

       let deletedCount = 0;

       if (env.GROUNDGAME_KV) {
          const cutoffTime = Date.now() - (48 * 60 * 60 * 1000);

          try {
             let cursor = '';
             let isDone = false;

             while (!isDone) {
                const list = await env.GROUNDGAME_KV.list({ cursor });

                for (const key of list.keys) {
                   const val = await env.GROUNDGAME_KV.getWithMetadata<{timestamp: number}>(key.name);
                   if (val.metadata && val.metadata.timestamp < cutoffTime) {
                       await env.GROUNDGAME_KV.delete(key.name);
                       deletedCount++;
                   }
                }

                isDone = list.list_complete;
                cursor = (list as any).cursor || '';
             }
          } catch(e) {
             console.error('KV Cleanup Error', e);
          }
       }

       return createGzipResponse({ success: true, message: 'Maintenance complete', prunedCount: deletedCount }, 200);
    }

    if (request.method !== 'POST') {
       return createGzipResponse({ error: 'Method not allowed' }, 405);
    }

    try {
      const body = await request.json<any>();
      const { battery, latency, incident_status, device_id, operator_id } = body;

      const isCritical =
        (battery !== undefined && battery < 15) ||
        (latency !== undefined && latency > 500) ||
        (incident_status === 'escalated_to_central_support');

      if (isCritical) {
        ctx.waitUntil(
          fetch(env.CENTRAL_SUPPORT_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              alert: 'CRITICAL_FLEET_DISTRESS',
              device_id,
              operator_id,
              battery,
              latency,
              incident_status,
              timestamp: new Date().toISOString()
            })
          }).catch(e => console.error('Failed to dispatch alert', e))
        );
      }

      return createGzipResponse({ success: true, queued: isCritical }, 200);
    } catch (e) {
      return createGzipResponse({ error: 'Bad request' }, 400);
    }
  },
};
