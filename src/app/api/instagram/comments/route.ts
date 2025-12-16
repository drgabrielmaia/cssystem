import { NextResponse } from 'next/server'
import { instagramAPI } from '@/lib/instagram-api'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const mediaId = searchParams.get('mediaId')

    if (!mediaId) {
      return NextResponse.json(
        { error: 'Media ID is required' },
        { status: 400 }
      )
    }

    const comments = await instagramAPI.getMediaComments(mediaId)
    return NextResponse.json(comments)
  } catch (error: any) {
    console.error('Instagram Comments API Error:', error.message)
    return NextResponse.json(
      { error: 'Failed to fetch Instagram comments' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const { commentId, message } = await request.json()

    if (!commentId || !message) {
      return NextResponse.json(
        { error: 'Comment ID and message are required' },
        { status: 400 }
      )
    }

    const reply = await instagramAPI.replyToComment(commentId, message)
    return NextResponse.json(reply)
  } catch (error: any) {
    console.error('Instagram Reply API Error:', error.message)
    return NextResponse.json(
      { error: 'Failed to reply to comment' },
      { status: 500 }
    )
  }
}