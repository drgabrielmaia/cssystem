import { NextRequest, NextResponse } from 'next/server';
import { whatsappService } from '@/lib/whatsapp-zapi';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('📨 Z-API Webhook recebido:', JSON.stringify(body, null, 2));

    // Processar diferentes tipos de webhooks da Z-API
    if (body.instanceData && body.data) {
      // Webhook de mensagem da Z-API
      if (body.data.momment && (body.data.text || body.data.body)) {
        console.log('📩 Nova mensagem recebida via Z-API webhook');

        // Processar a mensagem recebida
        await whatsappService.handleIncomingMessage(body.data);

        return NextResponse.json({ status: 'success', message: 'Mensagem Z-API processada' });
      }

      // Webhook de status (conectado, desconectado, etc.)
      if (body.data.event) {
        console.log('📡 Status Z-API:', body.data.event);
        return NextResponse.json({ status: 'success', message: 'Status processado' });
      }
    }

    // Fallback para outros formatos de webhook
    if (body.momment && (body.text || body.body)) {
      console.log('📩 Mensagem recebida (formato direto)');
      await whatsappService.handleIncomingMessage(body);
      return NextResponse.json({ status: 'success', message: 'Mensagem processada' });
    }

    console.log('📡 Webhook Z-API processado:', body.type || 'unknown');
    return NextResponse.json({ status: 'success' });

  } catch (error) {
    console.error('❌ Erro no webhook Z-API:', error);

    // Sempre retornar sucesso para não gerar reenvios
    return NextResponse.json({ status: 'error', error: 'Internal error' }, { status: 200 });
  }
}

export async function GET(request: NextRequest) {
  // Endpoint para testar se o webhook está funcionando
  return NextResponse.json({
    status: 'Webhook funcionando',
    timestamp: new Date().toISOString(),
    url: request.url
  });
}