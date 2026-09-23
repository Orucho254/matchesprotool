import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleLogoutRequest } from '../../src/server/authCore';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({
      error: `Method ${req.method} Not Allowed on /api/auth/logout. Please use HTTP POST.`,
      allowedMethods: ['POST'],
    });
  }

  const authHeader = req.headers.authorization;
  const result = handleLogoutRequest(authHeader);
  return res.status(result.status).json(result.body);
}
