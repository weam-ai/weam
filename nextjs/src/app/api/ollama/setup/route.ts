export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { LINK } from '@/config/config';

// This route now proxies to the Node backend, which has
// permission to run Docker Compose. It avoids executing
// Docker inside the Next.js container.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const mode = body?.mode || 'start-only';
    const model = body?.model;

    const nodeBase = LINK.SERVER_NODE_API_URL || LINK.COMMON_NODE_API_URL;
    if (!nodeBase) {
      return Response.json(
        { success: false, message: 'Node API URL not configured' },
        { status: 500 }
      );
    }

    if (mode === 'setup-pull') {
      if (!model || typeof model !== 'string') {
        return Response.json({ success: false, message: 'Model is required for setup-pull' }, { status: 400 });
      }
      const res = await fetch(`${nodeBase}/ollama/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model }),
      });
      const data = await res.json().catch(() => ({ success: false, message: 'Invalid response from backend' }));
      return Response.json(data, { status: res.status });
    }

    // Default: start-only -> trigger health check which auto-starts via compose if needed
    const res = await fetch(`${nodeBase}/ollama/health`, { method: 'GET' });
    const data = await res.json().catch(() => ({ success: false, message: 'Invalid response from backend' }));
    return Response.json(data, { status: res.status });
  } catch (error: any) {
    const message = error?.message || 'Failed to proxy setup request';
    return Response.json({ success: false, message }, { status: 500 });
  }
}