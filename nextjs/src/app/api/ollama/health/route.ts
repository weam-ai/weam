export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { LINK } from '@/config/config';

// Proxies Ollama health checks to the upstream Ollama instance provided by baseUrl.
// Falls back to localhost for local setups.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const baseUrl = LINK.OLLAMA_API_URL;
    const apiKey = searchParams.get('apiKey') || undefined;

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const upstream = await fetch(`${baseUrl}/api/tags`, { method: 'GET', headers });
    const timestamp = new Date().toISOString();

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '');
      return Response.json({
        success: false,
        status: 'unhealthy',
        url: baseUrl,
        error: text || upstream.statusText,
        timestamp,
        suggestions: [
          'Ensure Ollama is installed and running',
          'Run: ollama serve',
          'Verify Base URL and port (default http://localhost:11434)',
        ]
      }, { status: upstream.status || 503 });
    }

    const data = await upstream.json().catch(() => ({ models: [] }));
    const models = Array.isArray(data?.models) ? data.models : [];
    return Response.json({
      success: true,
      status: 'healthy',
      url: baseUrl,
      modelCount: models.length,
      models: models.slice(0, 5).map((m: any) => ({ name: m?.name, size: m?.size })),
      timestamp,
    });
  } catch (error: any) {
    const message = error?.message || 'Failed to reach Ollama';
    return Response.json({ success: false, status: 'unhealthy', error: message }, { status: 500 });
  }
}