import { NextRequest, NextResponse } from 'next/server';
import { whatsappService } from '@/lib/whatsapp-core-service';

export async function GET(request: NextRequest) {
  try {
    const contacts = await whatsappService.getContacts();

    return NextResponse.json({
      success: true,
      contacts
    });
  } catch (error) {
    console.error('Erro ao buscar contatos:', error);

    return NextResponse.json({
      success: false,
      message: 'Erro ao buscar contatos',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}