import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleVerifyRequest } from '../../src/server/authCore';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({
      error: `Method ${req.method} Not Allowed on /api/auth/verify. Please use HTTP GET.`,
      allowedMethods: ['GET'],
    });
  }

  const authHeader = req.headers.authorization;
  const result = handleVerifyRequest(authHeader);
  return res.status(result.status).json(result.body);
}
