import { NextResponse } from 'next/server'
import { instagramAPI } from '@/lib/instagram-api'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '25')

    const media = await instagramAPI.getUserMedia(limit)
    return NextResponse.json(media)
  } catch (error: any) {
    console.error('Instagram Media API Error:', error.message)
    return NextResponse.json(
      { error: 'Failed to fetch Instagram media' },
      { status: 500 }
    )
  }
}