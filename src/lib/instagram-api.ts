const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN
const INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET

interface InstagramUser {
  id: string
  username: string
  account_type: string
  media_count?: number
}

interface InstagramMedia {
  id: string
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
  media_url?: string
  permalink?: string
  caption?: string
  timestamp: string
  like_count?: number
  comments_count?: number
  insights?: {
    impressions: number
    reach: number
    engagement: number
  }
}

interface InstagramComment {
  id: string
  text: string
  username: string
  timestamp: string
  like_count: number
  replies_count?: number
  user: {
    id: string
    username: string
  }
}

interface InstagramMessage {
  id: string
  created_time: string
  from: {
    name: string
    email?: string
    id: string
  }
  to: {
    data: Array<{
      name: string
      id: string
    }>
  }
  message?: string
  attachments?: Array<{
    type: string
    payload: {
      url: string
    }
  }>
}

class InstagramAPI {
  private baseUrl = 'https://graph.instagram.com'
  private accessToken: string

  constructor() {
    if (!INSTAGRAM_ACCESS_TOKEN) {
      throw new Error('Instagram access token not found in environment variables')
    }
    this.accessToken = INSTAGRAM_ACCESS_TOKEN
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Instagram API Error: ${error.error?.message || response.statusText}`)
    }

    return response.json()
  }

  // Get user profile info
  async getUserProfile(): Promise<InstagramUser> {
    return this.request('/me?fields=id,username,account_type,media_count')
  }

  // Get user media
  async getUserMedia(limit = 25): Promise<{ data: InstagramMedia[] }> {
    return this.request(`/me/media?fields=id,media_type,media_url,permalink,caption,timestamp,like_count,comments_count&limit=${limit}`)
  }

  // Get media insights
  async getMediaInsights(mediaId: string): Promise<any> {
    return this.request(`/${mediaId}/insights?metric=impressions,reach,engagement`)
  }

  // Get comments from a media
  async getMediaComments(mediaId: string): Promise<{ data: InstagramComment[] }> {
    return this.request(`/${mediaId}/comments?fields=id,text,username,timestamp,like_count,replies_count,user`)
  }

  // Reply to a comment
  async replyToComment(commentId: string, message: string): Promise<any> {
    return this.request(`/${commentId}/replies`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    })
  }

  // Send direct message (requires messaging permissions)
  async sendDirectMessage(userId: string, message: string): Promise<any> {
    return this.request('/me/messages', {
      method: 'POST',
      body: JSON.stringify({
        recipient: { id: userId },
        message: { text: message },
      }),
    })
  }

  // Get direct messages
  async getDirectMessages(): Promise<{ data: InstagramMessage[] }> {
    return this.request('/me/conversations?fields=id,updated_time,message_count,unread_count,participants')
  }

  // Get conversation messages
  async getConversationMessages(conversationId: string): Promise<{ data: InstagramMessage[] }> {
    return this.request(`/${conversationId}/messages?fields=id,created_time,from,to,message,attachments`)
  }

  // Create a media object (for publishing)
  async createMedia(imageUrl: string, caption?: string): Promise<any> {
    return this.request('/me/media', {
      method: 'POST',
      body: JSON.stringify({
        image_url: imageUrl,
        caption,
      }),
    })
  }

  // Publish media
  async publishMedia(creationId: string): Promise<any> {
    return this.request('/me/media_publish', {
      method: 'POST',
      body: JSON.stringify({
        creation_id: creationId,
      }),
    })
  }

  // Get account insights
  async getAccountInsights(period = 'day', metrics = ['impressions', 'reach', 'profile_views']): Promise<any> {
    const metricsParam = metrics.join(',')
    return this.request(`/me/insights?metric=${metricsParam}&period=${period}`)
  }
}

export const instagramAPI = new InstagramAPI()
export type { InstagramUser, InstagramMedia, InstagramComment, InstagramMessage }