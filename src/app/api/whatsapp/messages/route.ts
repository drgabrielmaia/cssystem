import { NextRequest, NextResponse } from 'next/server';
import { whatsappService } from '@/lib/whatsapp-core-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const chatId = searchParams.get('chatId');

    let messages;

    if (chatId) {
      messages = await whatsappService.getChatMessages(chatId, limit);
    } else {
      messages = await whatsappService.getMessages(limit);
    }

    return NextResponse.json({
      success: true,
      messages
    });
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);

    return NextResponse.json({
      success: false,
      message: 'Erro ao buscar mensagens',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { to, message } = await request.json();

    if (!to || !message) {
      return NextResponse.json({
        success: false,
        message: 'Campos "to" e "message" são obrigatórios'
      }, { status: 400 });
    }

    const success = await whatsappService.sendMessage(to, message);

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Mensagem enviada com sucesso'
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Falha ao enviar mensagem'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);

    return NextResponse.json({
      success: false,
      message: 'Erro ao enviar mensagem',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}