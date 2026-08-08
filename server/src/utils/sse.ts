import { Response } from 'express';

const clients = new Map<string, { orgId: string, res: Response }>();

export const addSSEClient = (clientId: string, orgId: string, res: Response) => {
  clients.set(clientId, { orgId, res });
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED' })}\n\n`);
};

export const removeSSEClient = (clientId: string) => {
  clients.delete(clientId);
};

export const getActiveConnectionsCount = (orgId: string) => {
  let count = 0;
  for (const client of clients.values()) {
    if (client.orgId === orgId) count++;
  }
  return count;
};

export const broadcastToOrg = (orgId: string, eventType: string, payload: any) => {
  const data = JSON.stringify({ type: eventType, payload });
  for (const [clientId, client] of clients.entries()) {
    if (client.orgId === orgId) {
      try {
        client.res.write(`data: ${data}\n\n`);
      } catch (e) {
        clients.delete(clientId);
      }
    }
  }
};
