export const runtime = 'nodejs';

import { NextRequest } from 'next/server';

// Proxies streaming model pull requests directly to the Ollama API
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const baseUrl = body?.baseUrl || 'http://localhost:11434';
    const model = body?.model;
    const stream = body?.stream === true;

    if (!model) {
      return Response.json({ success: false, message: 'Model is required' }, { status: 400 });
    }

    console.log(`Pulling Ollama model ${model} from ${baseUrl}, stream: ${stream}`);

    // Direct connection to Ollama API
    const upstream = await fetch(`${baseUrl}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: model }),
    });

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text().catch(() => '');
      console.error(`Ollama pull failed: ${text || upstream.statusText}`);
      return Response.json({ 
        success: false, 
        message: text || upstream.statusText || 'Failed to start pull stream',
        status: upstream.status
      }, { status: upstream.status || 500 });
    }

    if (stream) {
      // Create a transform stream to process the chunks and add download progress information
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      
      // Process the upstream response
      const reader = upstream.body.getReader();
      let totalSize = 0;
      let downloadedSize = 0;
      let lastProgress = 0;
      
      // Start the streaming process
      (async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              // Send a final 100% progress update
              const finalUpdate = JSON.stringify({
                status: `Downloaded ${model} successfully`,
                downloadedSize: downloadedSize,
                totalSize: totalSize > 0 ? totalSize : downloadedSize,
                progress: 100
              }) + '\n';
              
              await writer.write(encoder.encode(finalUpdate));
              await writer.close();
              break;
            }
            
            // Process the chunk
            const text = decoder.decode(value, { stream: true });
            const lines = text.split('\n').filter(line => line.trim() !== '');
            
            for (const line of lines) {
              try {
                const data = JSON.parse(line);
                console.log('Received data from Ollama:', data);
                
                // Extract progress information
                if (data.total) {
                  totalSize = data.total;
                }
                
                if (data.completed) {
                  downloadedSize = data.completed;
                }
                
                // Calculate progress percentage
                let progressPct = 0;
                if (totalSize > 0 && downloadedSize > 0) {
                  progressPct = Math.floor((downloadedSize / totalSize) * 100);
                  // Ensure progress is at least 1% once we start downloading
                  progressPct = Math.max(1, progressPct);
                }
                
                // Always send progress updates to ensure client receives them
                // This is critical for showing real-time progress
                const progressData = {
                  ...data,
                  downloadedSize: downloadedSize,
                  totalSize: totalSize,
                  progress: progressPct,
                  status: data.status || `Downloading ${model}...`
                };
                
                console.log('Sending progress update:', progressPct, '%');
                await writer.write(encoder.encode(JSON.stringify(progressData) + '\n'));
              } catch (e) {
                // Not JSON, just forward the line
                await writer.write(encoder.encode(line + '\n'));
              }
            }
          }
        } catch (error) {
          console.error('Error processing stream:', error);
          await writer.abort(error);
        }
      })();
      
      // Return the transformed stream
      return new Response(readable, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
          'Transfer-Encoding': 'chunked',
        },
      });
    } else {
      // Stream the upstream response directly to the client (non-streaming mode)
      return new Response(upstream.body, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
          'Transfer-Encoding': 'chunked',
        },
      });
    }
  } catch (error: any) {
    console.error('Error in Ollama pull:', error);
    return Response.json({ 
      success: false, 
      message: error?.message || 'Failed to proxy model pull'
    }, { status: 500 });
  }
}