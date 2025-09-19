import { NextRequest, NextResponse } from 'next/server';
import { whatsappService } from '@/lib/whatsapp-core-service';

export async function POST(request: NextRequest) {
  try {
    const { to, message } = await request.json();

    if (!to || !message) {
      return NextResponse.json({
        success: false,
        error: 'Campos "to" e "message" são obrigatórios'
      }, { status: 400 });
    }

    console.log(`📤 [API Route /send] Enviando mensagem para ${to}: ${message}`);

    const success = await whatsappService.sendMessage(to, message);

    if (success) {
      console.log('✅ [API Route /send] Mensagem enviada com sucesso');
      return NextResponse.json({
        success: true,
        message: 'Mensagem enviada com sucesso'
      });
    } else {
      console.error('❌ [API Route /send] Falha ao enviar mensagem');
      return NextResponse.json({
        success: false,
        error: 'Falha ao enviar mensagem'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('💥 [API Route /send] Erro:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}