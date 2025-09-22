import { NextRequest, NextResponse } from 'next/server';
import { whatsappService } from '@/lib/whatsapp-core-service';

export async function GET(request: NextRequest) {
  try {
    console.log('📱 [API Route /qr] Buscando QR Code...');

    const qrData = await whatsappService.getQRCode();

    if (!qrData || !qrData.qrImage) {
      return NextResponse.json({
        success: false,
        message: 'QR Code não disponível',
        qrCode: null
      });
    }

    console.log('✅ [API Route /qr] QR Code encontrado');

    return NextResponse.json({
      success: true,
      qrCode: qrData.qrImage,
      qr: qrData.qr
    });

  } catch (error) {
    console.error('💥 [API Route /qr] Erro ao buscar QR Code:', error);

    return NextResponse.json({
      success: false,
      message: 'Erro ao buscar QR Code',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      qrCode: null
    }, { status: 500 });
  }
}