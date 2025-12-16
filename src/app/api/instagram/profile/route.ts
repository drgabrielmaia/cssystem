import { NextResponse } from 'next/server'
import { instagramAPI } from '@/lib/instagram-api'

export async function GET() {
  try {
    const profile = await instagramAPI.getUserProfile()
    return NextResponse.json(profile)
  } catch (error: any) {
    console.error('Instagram Profile API Error:', error.message)
    return NextResponse.json(
      { error: 'Failed to fetch Instagram profile' },
      { status: 500 }
    )
  }
}