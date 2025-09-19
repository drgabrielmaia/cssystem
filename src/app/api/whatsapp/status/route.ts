import { NextRequest, NextResponse } from 'next/server';
import { whatsappService } from '@/lib/whatsapp-core-service';

export async function GET(request: NextRequest) {
  console.log('🔍 [API Route /status] Requisição recebida');
  try {
    console.log('📞 [API Route /status] Chamando whatsappService.getStatus()');
    const status = await whatsappService.getStatus();
    console.log('📞 [API Route /status] Chamando whatsappService.getQRCode()');
    const qrCode = await whatsappService.getQRCode();

    console.log('📋 [API Route /status] Status recebido:', status);
    console.log('📋 [API Route /status] QR Code recebido:', qrCode ? 'Presente' : 'Ausente');

    if (!status) {
      console.log('❌ [API Route /status] Status é null - retornando erro');
      return NextResponse.json({
        success: false,
        message: 'Não foi possível obter status do WhatsApp',
        isReady: false,
        qrCode: null,
        status: 'error'
      });
    }

    const response = {
      success: true,
      isReady: status.isReady,
      qrCode: qrCode?.qrImage || null,
      status: status.isReady ? 'connected' : status.hasQR ? 'waiting_qr_scan' : 'initializing'
    };

    console.log('✅ [API Route /status] Retornando resposta:', response);
    return NextResponse.json(response);
  } catch (error) {
    console.error('💥 [API Route /status] Erro ao verificar status:', error);

    return NextResponse.json({
      success: false,
      message: 'Erro ao verificar status',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      isReady: false,
      qrCode: null,
      status: 'error'
    }, { status: 500 });
  }
}