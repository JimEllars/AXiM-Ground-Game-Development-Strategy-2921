import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { addSSEClient, removeSSEClient } from '../utils/sse.js';

const router = express.Router();

router.get('/', authenticateToken, (req: any, res) => {
  const user = req.user!;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const clientId = Date.now().toString();
  addSSEClient(clientId, user.organization_id, res);

  req.on('close', () => {
    removeSSEClient(clientId);
  });
});

export default router;
