import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleLoginRequest } from '../../src/server/authCore';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Permissive CORS & Security Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Strictly enforce POST method
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({
      error: `Method ${req.method} Not Allowed on /api/auth/login. Please use HTTP POST.`,
      allowedMethods: ['POST'],
    });
  }

  const result = handleLoginRequest(req.body);
  return res.status(result.status).json(result.body);
}
