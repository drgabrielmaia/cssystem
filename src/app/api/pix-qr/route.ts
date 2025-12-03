import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.log('Dados enviados para AbacatePay PIX QR:', JSON.stringify(body, null, 2))

    const response = await fetch('https://api.abacatepay.com/v1/pixQrCode/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer abc_dev_NhjCFAfyE4gDfQLQC1c52qk5`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    const data = await response.json()

    console.log('Resposta da AbacatePay PIX QR:', {
      status: response.status,
      data: data
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || 'Erro ao criar QR Code PIX' },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Erro interno ao criar QR Code PIX:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    )
  }
}