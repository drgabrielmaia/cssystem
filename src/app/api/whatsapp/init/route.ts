import { NextRequest, NextResponse } from 'next/server';
import { whatsappService } from '@/lib/whatsapp-core-service';

export async function POST(request: NextRequest) {
  try {
    await whatsappService.initialize();

    return NextResponse.json({
      success: true,
      message: 'WhatsApp Core API inicializada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao inicializar WhatsApp Core API:', error);

    return NextResponse.json({
      success: false,
      message: 'Erro ao inicializar WhatsApp Core API',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const status = await whatsappService.getStatus();
    const qrCode = await whatsappService.getQRCode();

    return NextResponse.json({
      success: true,
      status: status?.isReady ? 'ready' : status?.isConnecting ? 'connecting' : 'not_ready',
      qrCode: qrCode?.qrImage || null,
      isReady: status?.isReady || false
    });
  } catch (error) {
    console.error('Erro ao verificar status:', error);
    return NextResponse.json({
      success: false,
      status: 'error',
      qrCode: null,
      isReady: false
    }, { status: 500 });
  }
}