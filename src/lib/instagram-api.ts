// Usar variáveis de ambiente do servidor
const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN
const INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET

// URL base da API do Instagram Basic Display API
const BASE_URL = 'https://graph.instagram.com'

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
  private baseUrl = BASE_URL
  private accessToken: string

  constructor() {
    if (!INSTAGRAM_ACCESS_TOKEN) {
      throw new Error('Instagram access token not found in environment variables')
    }
    this.accessToken = INSTAGRAM_ACCESS_TOKEN
  }

  async request(endpoint: string, options: RequestInit = {}) {
    // Para Instagram Graph API, alguns endpoints precisam do token como query parameter
    const separator = endpoint.includes('?') ? '&' : '?'
    const url = `${this.baseUrl}${endpoint}${separator}access_token=${this.accessToken}`

    console.log('🔍 [Instagram API] Fazendo requisição para:', url.replace(this.accessToken, 'TOKEN_OCULTO'))
    console.log('📝 [Instagram API] Método:', options.method || 'GET')
    console.log('🔑 [Instagram API] Headers:', {
      'Authorization': `Bearer ${this.accessToken.substring(0, 20)}...`,
      'Content-Type': 'application/json'
    })

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    console.log('📊 [Instagram API] Status da resposta:', response.status, response.statusText)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ [Instagram API] Erro raw da resposta:', errorText)

      let errorMessage = `Instagram API Error: ${response.status} ${response.statusText}`

      try {
        const error = JSON.parse(errorText)
        console.error('❌ [Instagram API] Erro parseado:', error)
        errorMessage = `Instagram API Error: ${error.error?.message || error.error_description || errorMessage}`
      } catch (parseError) {
        console.error('❌ [Instagram API] Erro ao parsear JSON:', parseError)
        errorMessage = `Instagram API Error: ${errorText || errorMessage}`
      }

      throw new Error(errorMessage)
    }

    const responseData = await response.json()
    console.log('✅ [Instagram API] Resposta de sucesso:', responseData)

    return responseData
  }

  // Get user profile info
  async getUserProfile(): Promise<InstagramUser> {
    // Usar Instagram Graph API v24.0 endpoint
    return this.request('/me?fields=id,username,media_count')
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
  async sendDirectMessage(recipientIgsid: string, message: string): Promise<{ success: boolean, error?: string, data?: any }> {
    try {
      const response = await this.request(`/me/messages`, {
        method: 'POST',
        body: JSON.stringify({
          recipient: { id: recipientIgsid },
          message: { text: message },
        }),
      })
      return { success: true, data: response }
    } catch (error) {
      console.error('❌ [Instagram API] Erro ao enviar DM:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao enviar mensagem'
      }
    }
  }

  // Send image message
  async sendImageMessage(recipientIgsid: string, imageUrl: string): Promise<any> {
    return this.request(`/me/messages`, {
      method: 'POST',
      body: JSON.stringify({
        recipient: { id: recipientIgsid },
        message: {
          attachments: {
            type: "image",
            payload: {
              url: imageUrl
            }
          }
        }
      }),
    })
  }

  // Send multiple images
  async sendMultipleImages(recipientIgsid: string, imageUrls: string[]): Promise<any> {
    return this.request(`/me/messages`, {
      method: 'POST',
      body: JSON.stringify({
        recipient: { id: recipientIgsid },
        message: {
          attachments: imageUrls.map(url => ({
            type: "image",
            payload: { url }
          }))
        }
      }),
    })
  }

  // Send video message
  async sendVideoMessage(recipientIgsid: string, videoUrl: string): Promise<any> {
    return this.request(`/me/messages`, {
      method: 'POST',
      body: JSON.stringify({
        recipient: { id: recipientIgsid },
        message: {
          attachment: {
            type: "video",
            payload: {
              url: videoUrl
            }
          }
        }
      }),
    })
  }

  // Send heart sticker
  async sendHeartSticker(recipientIgsid: string): Promise<any> {
    return this.request(`/me/messages`, {
      method: 'POST',
      body: JSON.stringify({
        recipient: { id: recipientIgsid },
        message: {
          attachment: {
            type: "like_heart"
          }
        }
      }),
    })
  }

  // Send published post
  async sendPost(recipientIgsid: string, postId: string): Promise<any> {
    return this.request(`/me/messages`, {
      method: 'POST',
      body: JSON.stringify({
        recipient: { id: recipientIgsid },
        message: {
          attachment: {
            type: "MEDIA_SHARE",
            payload: {
              id: postId
            }
          }
        }
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

  // Get account insights (Instagram Basic Display API has limited insights)
  async getAccountInsights(period = 'day', metrics = ['reach', 'profile_views', 'website_clicks']): Promise<any> {
    const metricsParam = metrics.join(',')
    return this.request(`/me/insights?metric=${metricsParam}&period=${period}`)
  }

  // Search for user by username (requires Instagram Basic Display API)
  async searchUser(username: string): Promise<any> {
    try {
      // Tentar buscar por username - Note: isso pode não funcionar com tokens limitados
      return this.request(`/users/search?q=${username}`)
    } catch (error) {
      console.error('❌ [Instagram API] Erro ao buscar usuário:', error)
      throw error
    }
  }

  // Get user ID from username (método alternativo usando Instagram Business API)
  async getUserId(username: string): Promise<string | null> {
    try {
      console.log('🔍 [Instagram API] Buscando ID para username:', username)

      // Método 1: Tentar usar Instagram Graph API search
      const searchResult = await this.request(`/ig_hashtag_search?user_id=me&q=${username}`)
      console.log('📊 [Instagram API] Resultado da busca:', searchResult)

      return null // Por enquanto retorna null até encontrarmos o método correto
    } catch (error) {
      console.error('❌ [Instagram API] Erro ao buscar ID do usuário:', error)
      return null
    }
  }
}

export const instagramAPI = new InstagramAPI()
export type { InstagramUser, InstagramMedia, InstagramComment, InstagramMessage }