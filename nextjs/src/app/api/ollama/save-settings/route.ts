import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { LINK } from '@/config/config';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = req.cookies.get('token')?.value || '';

    const response = await fetch(`${LINK.SERVER_NODE_API_URL || 'http://localhost:4050'}/napi/v1/ollama/save-settings`, {
      method: 'POST',
      headers: {
        'Authorization': `JWT ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error saving Ollama settings:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to save Ollama settings' },
      { status: 500 }
    );
  }
}