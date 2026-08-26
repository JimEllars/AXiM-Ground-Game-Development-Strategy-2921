export default {
    async fetch(request, env, ctx) {
        if (request.method !== 'POST') {
            return new Response(JSON.stringify({ error: 'Method not allowed' }), {
                status: 405,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        const authHeader = request.headers.get('Authorization');
        const xAximKeyHeader = request.headers.get('X-Axim-Internal-Service-Key');
        let token = null;
        if (xAximKeyHeader) {
            token = xAximKeyHeader;
        }
        else if (authHeader) {
            if (authHeader.toLowerCase().startsWith('bearer ')) {
                token = authHeader.slice(7);
            }
            else {
                token = authHeader;
            }
        }
        if (!token || token !== env.AXIM_INTERNAL_SERVICE_KEY) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        try {
            const body = await request.json();
            const { battery, latency, incident_status, device_id, operator_id } = body;
            // Condition: battery < 15%, latency > 500ms, or escalated
            const isCritical = (battery !== undefined && battery < 15) ||
                (latency !== undefined && latency > 500) ||
                (incident_status === 'escalated_to_central_support');
            if (isCritical) {
                // Dispatch alert in non-blocking block
                ctx.waitUntil(fetch(env.CENTRAL_SUPPORT_WEBHOOK_URL, {
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
                }).catch(e => console.error('Failed to dispatch alert', e)));
            }
            return new Response(JSON.stringify({ success: true, queued: isCritical }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
        catch (e) {
            return new Response(JSON.stringify({ error: 'Bad request' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    },
};
