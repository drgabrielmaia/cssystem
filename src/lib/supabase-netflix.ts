// ===============================================
// Supabase Netflix Platform Services
// ===============================================

import { createBrowserClient } from '@supabase/ssr'
import type {
  ModuleCategory,
  ModuleRating,
  GoalCheckpoint,
  ContinueWatching,
  ContinueWatchingDetails,
  VideoRecommendation,
  VideoModuleEnhanced,
  NPSScore,
  ModuleRatingService,
  ContinueWatchingService,
  GoalCheckpointService,
  ModuleCategoryService,
  RecommendationService
} from '@/types/netflix-platform'
import { calculateNPSScore } from '@/types/netflix-platform'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createBrowserClient(supabaseUrl, supabaseKey)

// ===============================================
// Module Rating Service (NPS System)
// ===============================================
export const moduleRatingService: ModuleRatingService = {
  async create(rating) {
    const { data, error } = await supabase
      .from('module_ratings')
      .insert([rating])
      .select()
      .single()

    if (error) throw error
    return data as ModuleRating
  },

  async update(id, rating, feedback) {
    const { data, error } = await supabase
      .from('module_ratings')
      .update({ rating, feedback, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as ModuleRating
  },

  async getByModule(moduleId) {
    const { data, error } = await supabase
      .from('module_ratings')
      .select('*')
      .eq('module_id', moduleId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as ModuleRating[]
  },

  async getByMentorado(mentoradoId) {
    const { data, error } = await supabase
      .from('module_ratings')
      .select(`
        *,
        video_modules (
          id,
          title,
          cover_image_url
        )
      `)
      .eq('mentorado_id', mentoradoId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as ModuleRating[]
  },

  async getUserRating(moduleId, mentoradoId) {
    const { data, error } = await supabase
      .from('module_ratings')
      .select('*')
      .eq('module_id', moduleId)
      .eq('mentorado_id', mentoradoId)
      .single()

    if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows returned
    return data as ModuleRating | null
  },

  async calculateNPS(moduleId) {
    const ratings = await this.getByModule(moduleId)
    const scores = ratings.map(r => r.rating)
    return calculateNPSScore(scores)
  }
}

// ===============================================
// Continue Watching Service
// ===============================================
export const continueWatchingService: ContinueWatchingService = {
  async update(mentoradoId, lessonId, positionSeconds, organizationId) {
    // Call the database function to update continue watching
    const { error } = await supabase
      .rpc('update_continue_watching', {
        p_mentorado_id: mentoradoId,
        p_lesson_id: lessonId,
        p_position_seconds: positionSeconds,
        p_organization_id: organizationId
      })

    if (error) throw error
  },

  async getByMentorado(mentoradoId, limit = 10) {
    const { data, error } = await supabase
      .from('continue_watching_details')
      .select('*')
      .eq('mentorado_id', mentoradoId)
      .order('last_watched_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data as ContinueWatchingDetails[]
  },

  async remove(mentoradoId, lessonId) {
    const { error } = await supabase
      .from('continue_watching')
      .delete()
      .eq('mentorado_id', mentoradoId)
      .eq('lesson_id', lessonId)

    if (error) throw error
  },

  async clearAll(mentoradoId) {
    const { error } = await supabase
      .from('continue_watching')
      .delete()
      .eq('mentorado_id', mentoradoId)

    if (error) throw error
  }
}

// ===============================================
// Goal Checkpoint Service
// ===============================================
export const goalCheckpointService: GoalCheckpointService = {
  async create(checkpoint) {
    const { data, error } = await supabase
      .from('goal_checkpoints')
      .insert([checkpoint])
      .select()
      .single()

    if (error) throw error
    return data as GoalCheckpoint
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('goal_checkpoints')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as GoalCheckpoint
  },

  async updateProgress(id, currentValue) {
    // First get the checkpoint to calculate progress
    const { data: checkpoint, error: fetchError } = await supabase
      .from('goal_checkpoints')
      .select('target_value')
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError

    const targetValue = checkpoint.target_value || 100
    const progress = Math.min(100, Math.round((currentValue / targetValue) * 100))
    const isCompleted = progress >= 100

    const { data, error } = await supabase
      .from('goal_checkpoints')
      .update({
        current_value: currentValue,
        progress,
        is_completed: isCompleted,
        completed_date: isCompleted ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as GoalCheckpoint
  },

  async markComplete(id) {
    const { data, error } = await supabase
      .from('goal_checkpoints')
      .update({
        is_completed: true,
        progress: 100,
        completed_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as GoalCheckpoint
  },

  async getByGoal(goalId) {
    const { data, error } = await supabase
      .from('goal_checkpoints')
      .select('*')
      .eq('goal_id', goalId)
      .order('order_index', { ascending: true })

    if (error) throw error
    return data as GoalCheckpoint[]
  },

  async delete(id) {
    const { error } = await supabase
      .from('goal_checkpoints')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  async reorder(checkpoints) {
    // Update order_index for multiple checkpoints
    const updates = checkpoints.map(cp =>
      supabase
        .from('goal_checkpoints')
        .update({ order_index: cp.order_index, updated_at: new Date().toISOString() })
        .eq('id', cp.id)
    )

    const results = await Promise.all(updates)
    const errors = results.filter(r => r.error)
    if (errors.length > 0) {
      throw errors[0].error
    }
  }
}

// ===============================================
// Module Category Service
// ===============================================
export const moduleCategoryService: ModuleCategoryService = {
  async getAll(organizationId) {
    let query = supabase
      .from('module_categories')
      .select('*')
      .order('display_order', { ascending: true })

    if (organizationId) {
      query = query.or(`organization_id.eq.${organizationId},organization_id.is.null`)
    } else {
      query = query.is('organization_id', null)
    }

    const { data, error } = await query

    if (error) throw error
    return data as ModuleCategory[]
  },

  async create(category) {
    const { data, error } = await supabase
      .from('module_categories')
      .insert([category])
      .select()
      .single()

    if (error) throw error
    return data as ModuleCategory
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('module_categories')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as ModuleCategory
  },

  async delete(id) {
    const { error } = await supabase
      .from('module_categories')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  async reorder(categories) {
    const updates = categories.map(cat =>
      supabase
        .from('module_categories')
        .update({ display_order: cat.display_order, updated_at: new Date().toISOString() })
        .eq('id', cat.id)
    )

    const results = await Promise.all(updates)
    const errors = results.filter(r => r.error)
    if (errors.length > 0) {
      throw errors[0].error
    }
  }
}

// ===============================================
// Recommendation Service
// ===============================================
export const recommendationService: RecommendationService = {
  async getForMentorado(mentoradoId, limit = 10) {
    const { data, error } = await supabase
      .rpc('get_video_recommendations', {
        p_mentorado_id: mentoradoId,
        p_limit: limit
      })

    if (error) throw error
    return data as VideoRecommendation[]
  },

  async getByCategory(categoryId, limit = 20) {
    const { data, error } = await supabase
      .from('video_modules')
      .select(`
        *,
        category:module_categories(*)
      `)
      .eq('category_id', categoryId)
      .eq('is_published', true)
      .order('average_rating', { ascending: false, nullsFirst: false })
      .limit(limit)

    if (error) throw error
    return data as VideoModuleEnhanced[]
  },

  async getFeatured(limit = 10) {
    const { data, error } = await supabase
      .from('video_modules')
      .select(`
        *,
        category:module_categories(*)
      `)
      .eq('featured', true)
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data as VideoModuleEnhanced[]
  },

  async getTrending(limit = 10) {
    // Get modules with most views/ratings in the last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data, error } = await supabase
      .from('video_modules')
      .select(`
        *,
        category:module_categories(*),
        module_ratings!inner(created_at)
      `)
      .eq('is_published', true)
      .gte('module_ratings.created_at', thirtyDaysAgo.toISOString())
      .order('total_ratings', { ascending: false })
      .limit(limit)

    if (error) {
      // If error (likely no ratings), fallback to modules with best average rating
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('video_modules')
        .select(`
          *,
          category:module_categories(*)
        `)
        .eq('is_published', true)
        .order('average_rating', { ascending: false, nullsFirst: false })
        .limit(limit)

      if (fallbackError) throw fallbackError
      return fallbackData as VideoModuleEnhanced[]
    }

    return data as VideoModuleEnhanced[]
  },

  async getSimilar(moduleId, limit = 5) {
    // First get the module to find its category and tags
    const { data: module, error: moduleError } = await supabase
      .from('video_modules')
      .select('category_id, tags, difficulty_level')
      .eq('id', moduleId)
      .single()

    if (moduleError) throw moduleError

    // Find similar modules based on category and tags
    let query = supabase
      .from('video_modules')
      .select(`
        *,
        category:module_categories(*)
      `)
      .eq('is_published', true)
      .neq('id', moduleId) // Exclude the current module

    if (module.category_id) {
      query = query.eq('category_id', module.category_id)
    }

    if (module.difficulty_level) {
      query = query.eq('difficulty_level', module.difficulty_level)
    }

    const { data, error } = await query
      .order('average_rating', { ascending: false, nullsFirst: false })
      .limit(limit)

    if (error) throw error
    return data as VideoModuleEnhanced[]
  }
}

// ===============================================
// Analytics Service
// ===============================================
export const analyticsService = {
  async trackVideoView(lessonId: string, mentoradoId: string) {
    // This could be expanded to track views in a separate analytics table
    const { error } = await supabase
      .from('video_progress')
      .upsert({
        lesson_id: lessonId,
        mentorado_id: mentoradoId,
        last_watched_at: new Date().toISOString()
      }, {
        onConflict: 'lesson_id,mentorado_id'
      })

    if (error) throw error
  },

  async getModuleStats(moduleId: string) {
    // Get various statistics for a module
    const { data: progress, error: progressError } = await supabase
      .from('video_progress')
      .select('mentorado_id, completed, progress_percentage')
      .in('lesson_id',
        supabase
          .from('video_lessons')
          .select('id')
          .eq('module_id', moduleId)
      )

    if (progressError) throw progressError

    const uniqueViewers = new Set(progress.map(p => p.mentorado_id)).size
    const completions = progress.filter(p => p.completed).length
    const completionRate = uniqueViewers > 0 ? (completions / uniqueViewers) * 100 : 0

    const { data: ratings } = await supabase
      .from('module_ratings')
      .select('rating')
      .eq('module_id', moduleId)

    const npsScore = ratings ? calculateNPSScore(ratings.map(r => r.rating)) : null

    return {
      module_id: moduleId,
      views: progress.length,
      unique_viewers: uniqueViewers,
      completion_rate: Math.round(completionRate),
      nps_score: npsScore?.score
    }
  },

  async getMentoradoLearningStats(mentoradoId: string) {
    // Get comprehensive learning statistics for a mentorado
    const { data: progress, error } = await supabase
      .from('video_progress')
      .select(`
        *,
        video_lessons (
          module_id,
          duration_seconds
        )
      `)
      .eq('mentorado_id', mentoradoId)

    if (error) throw error

    const moduleIds = [...new Set(progress.map(p => p.video_lessons?.module_id).filter(Boolean))]
    const completedModules = moduleIds.filter(moduleId => {
      const moduleLessons = progress.filter(p => p.video_lessons?.module_id === moduleId)
      return moduleLessons.every(l => l.completed)
    })

    const totalWatchTime = progress.reduce((acc, p) => {
      const duration = p.video_lessons?.duration_seconds || 0
      const watchedPercentage = (p.progress_percentage || 0) / 100
      return acc + (duration * watchedPercentage)
    }, 0)

    return {
      total_modules_started: moduleIds.length,
      total_modules_completed: completedModules.length,
      total_watch_time_seconds: Math.round(totalWatchTime),
      average_completion_rate: progress.length > 0
        ? Math.round(progress.reduce((acc, p) => acc + (p.progress_percentage || 0), 0) / progress.length)
        : 0
    }
  }
}

// Export all services
export {
  supabase,
  type ModuleCategory,
  type ModuleRating,
  type GoalCheckpoint,
  type ContinueWatching,
  type ContinueWatchingDetails,
  type VideoRecommendation,
  type VideoModuleEnhanced,
  type NPSScore
}