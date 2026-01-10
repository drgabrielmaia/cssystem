// ===============================================
// Netflix-style Video Platform Types
// ===============================================

// Module Categories
export interface ModuleCategory {
  id: string
  name: string
  description?: string
  icon_url?: string
  color?: string
  display_order: number
  organization_id?: string
  created_at: string
  updated_at: string
}

// Enhanced Video Module with Netflix features
export interface VideoModuleEnhanced {
  id: string
  title: string
  description?: string
  cover_image_url?: string
  preview_video_url?: string
  featured: boolean
  tags?: string[]
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced'
  average_rating?: number
  total_ratings: number
  category_id?: string
  category?: ModuleCategory
  is_published: boolean
  created_at: string
  updated_at: string
  organization_id?: string
}

// Module Ratings (NPS System)
export interface ModuleRating {
  id: string
  module_id: string
  mentorado_id: string
  rating: number // 0-10 for NPS
  feedback?: string
  created_at: string
  updated_at: string
  organization_id?: string
}

// Goal Checkpoints for Progress Tracking
export interface GoalCheckpoint {
  id: string
  goal_id: string
  title: string
  description?: string
  target_value?: number
  current_value: number
  target_date?: string // ISO date string
  completed_date?: string // ISO timestamp
  is_completed: boolean
  progress: number // 0-100
  order_index: number
  created_at: string
  updated_at: string
  organization_id?: string
}

// Continue Watching Feature
export interface ContinueWatching {
  id: string
  mentorado_id: string
  lesson_id: string
  last_position_seconds: number
  last_watched_at: string
  organization_id?: string
}

// Enhanced Continue Watching with Details
export interface ContinueWatchingDetails extends ContinueWatching {
  lesson_title: string
  video_url: string
  duration_seconds: number
  lesson_order: number
  module_id: string
  module_title: string
  cover_image_url?: string
  module_description?: string
  mentorado_name: string
  progress_percentage: number
}

// Video Recommendation
export interface VideoRecommendation {
  module_id: string
  title: string
  description?: string
  cover_image_url?: string
  average_rating?: number
  total_ratings: number
  category_name?: string
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced'
  recommendation_score: number
}

// NPS Score Types
export type NPSCategory = 'detractor' | 'passive' | 'promoter'

export interface NPSScore {
  score: number
  category: NPSCategory
  total_responses: number
  detractors: number // 0-6
  passives: number   // 7-8
  promoters: number  // 9-10
}

// Learning Analytics
export interface LearningAnalytics {
  mentorado_id: string
  total_modules_started: number
  total_modules_completed: number
  total_watch_time_seconds: number
  average_completion_rate: number
  current_streak_days: number
  last_activity_date: string
  favorite_category?: string
  learning_pace: 'slow' | 'moderate' | 'fast'
}

// Module Statistics
export interface ModuleStats {
  module_id: string
  views: number
  unique_viewers: number
  completion_rate: number
  average_watch_time: number
  average_rating?: number
  total_ratings: number
  nps_score?: number
}

// Service Functions Types
export interface ModuleRatingService {
  create: (rating: Omit<ModuleRating, 'id' | 'created_at' | 'updated_at'>) => Promise<ModuleRating>
  update: (id: string, rating: number, feedback?: string) => Promise<ModuleRating>
  getByModule: (moduleId: string) => Promise<ModuleRating[]>
  getByMentorado: (mentoradoId: string) => Promise<ModuleRating[]>
  getUserRating: (moduleId: string, mentoradoId: string) => Promise<ModuleRating | null>
  calculateNPS: (moduleId: string) => Promise<NPSScore>
}

export interface ContinueWatchingService {
  update: (mentoradoId: string, lessonId: string, positionSeconds: number, organizationId?: string) => Promise<void>
  getByMentorado: (mentoradoId: string, limit?: number) => Promise<ContinueWatchingDetails[]>
  remove: (mentoradoId: string, lessonId: string) => Promise<void>
  clearAll: (mentoradoId: string) => Promise<void>
}

export interface GoalCheckpointService {
  create: (checkpoint: Omit<GoalCheckpoint, 'id' | 'created_at' | 'updated_at'>) => Promise<GoalCheckpoint>
  update: (id: string, updates: Partial<GoalCheckpoint>) => Promise<GoalCheckpoint>
  updateProgress: (id: string, currentValue: number) => Promise<GoalCheckpoint>
  markComplete: (id: string) => Promise<GoalCheckpoint>
  getByGoal: (goalId: string) => Promise<GoalCheckpoint[]>
  delete: (id: string) => Promise<void>
  reorder: (checkpoints: { id: string; order_index: number }[]) => Promise<void>
}

export interface ModuleCategoryService {
  getAll: (organizationId?: string) => Promise<ModuleCategory[]>
  create: (category: Omit<ModuleCategory, 'id' | 'created_at' | 'updated_at'>) => Promise<ModuleCategory>
  update: (id: string, updates: Partial<ModuleCategory>) => Promise<ModuleCategory>
  delete: (id: string) => Promise<void>
  reorder: (categories: { id: string; display_order: number }[]) => Promise<void>
}

export interface RecommendationService {
  getForMentorado: (mentoradoId: string, limit?: number) => Promise<VideoRecommendation[]>
  getByCategory: (categoryId: string, limit?: number) => Promise<VideoModuleEnhanced[]>
  getFeatured: (limit?: number) => Promise<VideoModuleEnhanced[]>
  getTrending: (limit?: number) => Promise<VideoModuleEnhanced[]>
  getSimilar: (moduleId: string, limit?: number) => Promise<VideoModuleEnhanced[]>
}

// Helper Functions
export const getNPSCategory = (rating: number): NPSCategory => {
  if (rating <= 6) return 'detractor'
  if (rating <= 8) return 'passive'
  return 'promoter'
}

export const calculateNPSScore = (ratings: number[]): NPSScore => {
  const total = ratings.length
  if (total === 0) {
    return {
      score: 0,
      category: 'passive',
      total_responses: 0,
      detractors: 0,
      passives: 0,
      promoters: 0
    }
  }

  const detractors = ratings.filter(r => r <= 6).length
  const passives = ratings.filter(r => r >= 7 && r <= 8).length
  const promoters = ratings.filter(r => r >= 9).length

  const score = Math.round(((promoters - detractors) / total) * 100)

  let category: NPSCategory = 'passive'
  if (score < -20) category = 'detractor'
  else if (score > 20) category = 'promoter'

  return {
    score,
    category,
    total_responses: total,
    detractors,
    passives,
    promoters
  }
}

export const formatWatchTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`
  } else {
    return `${secs}s`
  }
}

export const getDifficultyColor = (level?: 'beginner' | 'intermediate' | 'advanced'): string => {
  switch (level) {
    case 'beginner':
      return '#10B981' // green
    case 'intermediate':
      return '#F59E0B' // yellow
    case 'advanced':
      return '#EF4444' // red
    default:
      return '#6B7280' // gray
  }
}

export const getRatingColor = (rating?: number): string => {
  if (!rating) return '#6B7280' // gray
  if (rating >= 4.5) return '#10B981' // green
  if (rating >= 3.5) return '#F59E0B' // yellow
  if (rating >= 2.5) return '#FB923C' // orange
  return '#EF4444' // red
}