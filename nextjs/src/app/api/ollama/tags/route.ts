export const runtime = 'nodejs';

import { LINK } from '@/config/config';
import { NextRequest } from 'next/server';

// Proxies Ollama tags listing to the upstream Ollama instance.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const baseUrl = LINK.OLLAMA_API_URL;
    const apiKey = searchParams.get('apiKey') || undefined;

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const upstream = await fetch(`${baseUrl}/api/tags`, { method: 'GET', headers });
    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '');
      return Response.json({ success: false, message: text || upstream.statusText }, { status: upstream.status || 500 });
    }

    const json = await upstream.json().catch(() => ({ models: [] }));
    return Response.json(json);
  } catch (error: any) {
    const message = error?.message || 'Failed to fetch tags';
    return Response.json({ success: false, message }, { status: 500 });
  }
}