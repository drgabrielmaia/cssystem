import { NextResponse } from 'next/server'
import { instagramAPI } from '@/lib/instagram-api'

export async function GET() {
  try {
    const insights = await instagramAPI.getAccountInsights('day', [
      'impressions',
      'reach',
      'profile_views'
    ])
    return NextResponse.json(insights)
  } catch (error: any) {
    console.error('Instagram Insights API Error:', error.message)

    // Retornar dados fake para não quebrar a interface
    const fallbackInsights = {
      data: [
        { name: 'impressions', values: [{ value: 0 }] },
        { name: 'reach', values: [{ value: 0 }] },
        { name: 'profile_views', values: [{ value: 0 }] }
      ]
    }

    return NextResponse.json(fallbackInsights)
  }
}