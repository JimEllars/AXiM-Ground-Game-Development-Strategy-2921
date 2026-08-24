export interface Env {
  CENTRAL_SUPPORT_WEBHOOK_URL: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const body = await request.json<any>();
      const { battery, latency, incident_status, device_id, operator_id } = body;

      // Condition: battery < 15%, latency > 500ms, or escalated
      const isCritical =
        (battery !== undefined && battery < 15) ||
        (latency !== undefined && latency > 500) ||
        (incident_status === 'escalated_to_central_support');

      if (isCritical) {
        // Dispatch alert in non-blocking block
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

      return new Response(JSON.stringify({ success: true, queued: isCritical }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (e) {
      return new Response('Bad request', { status: 400 });
    }
  },
};
