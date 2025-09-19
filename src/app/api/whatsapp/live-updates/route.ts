import { NextRequest, NextResponse } from 'next/server';

let activeConnections = new Set<Response>();

export async function GET(request: NextRequest) {
  console.log('🔴 [Live Updates] Cliente conectado para atualizações em tempo real');

  // Set up SSE (Server-Sent Events)
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection confirmation
      controller.enqueue(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`);

      // Keep connection alive with heartbeat
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`);
        } catch (error) {
          clearInterval(heartbeat);
        }
      }, 30000); // 30 seconds

      // Store reference for broadcasting
      const response = new Response();
      (response as any).controller = controller;
      activeConnections.add(response);

      // Cleanup on disconnect
      request.signal.addEventListener('abort', () => {
        console.log('🔴 [Live Updates] Cliente desconectado');
        clearInterval(heartbeat);
        activeConnections.delete(response);
        try {
          controller.close();
        } catch (error) {
          // Connection already closed
        }
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    const { type, data } = await request.json();

    console.log('📡 [Live Updates] Broadcasting:', type, data);

    // Broadcast to all connected clients
    const message = `data: ${JSON.stringify({ type, data, timestamp: Date.now() })}\n\n`;

    activeConnections.forEach((response: any) => {
      try {
        if (response.controller) {
          response.controller.enqueue(message);
        }
      } catch (error) {
        // Remove broken connections
        activeConnections.delete(response);
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Update broadcasted',
      activeConnections: activeConnections.size
    });

  } catch (error) {
    console.error('❌ [Live Updates] Erro:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

// Broadcast new message to all clients
export async function broadcastNewMessage(message: any) {
  const updateData = {
    type: 'new_message',
    data: message,
    timestamp: Date.now()
  };

  const messageStr = `data: ${JSON.stringify(updateData)}\n\n`;

  activeConnections.forEach((response: any) => {
    try {
      if (response.controller) {
        response.controller.enqueue(messageStr);
      }
    } catch (error) {
      activeConnections.delete(response);
    }
  });
}