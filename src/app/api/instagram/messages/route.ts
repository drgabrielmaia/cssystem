import { NextResponse } from 'next/server'
import { instagramAPI } from '@/lib/instagram-api'

export async function GET() {
  try {
    const messages = await instagramAPI.getDirectMessages()
    return NextResponse.json(messages)
  } catch (error: any) {
    console.error('Instagram Messages API Error:', error.message)
    return NextResponse.json(
      { error: 'Failed to fetch Instagram messages' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const { userId, message } = await request.json()

    if (!userId || !message) {
      return NextResponse.json(
        { error: 'User ID and message are required' },
        { status: 400 }
      )
    }

    const result = await instagramAPI.sendDirectMessage(userId, message)
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Instagram Send Message API Error:', error.message)
    return NextResponse.json(
      { error: 'Failed to send Instagram message' },
      { status: 500 }
    )
  }
}