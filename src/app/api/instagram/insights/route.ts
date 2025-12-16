import { NextResponse } from 'next/server'
import { instagramAPI } from '@/lib/instagram-api'

export async function GET() {
  try {
    const insights = await instagramAPI.getAccountInsights('day', [
      'impressions',
      'reach',
      'profile_views',
      'website_clicks',
      'text_message_clicks',
      'get_directions_clicks'
    ])
    return NextResponse.json(insights)
  } catch (error: any) {
    console.error('Instagram Insights API Error:', error.message)
    return NextResponse.json(
      { error: 'Failed to fetch Instagram insights' },
      { status: 500 }
    )
  }
}