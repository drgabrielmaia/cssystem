# Netflix-Style Video Platform Database Setup

## Overview
This document contains instructions for setting up the database tables and configurations needed for the Netflix-style video platform features.

## New Database Tables Created

### 1. **module_ratings** - NPS Rating System
- Stores user ratings (0-10) for video modules
- Includes feedback text
- Unique constraint per user/module combination
- Automatically updates average rating in video_modules table

### 2. **goal_checkpoints** - Progress Milestones
- Tracks checkpoints/milestones for learning goals
- Supports target values and progress tracking
- Can be marked as completed with timestamps

### 3. **continue_watching** - Resume Playback Feature
- Stores last watched position for each video
- Netflix-style continue watching functionality
- Automatically syncs with video_progress table

### 4. **module_categories** - Content Organization
- Categories for organizing video modules
- Supports custom colors and icons
- Display order for custom sorting

### 5. **Enhanced video_modules table**
New columns added:
- `cover_image_url` - Netflix-style cover images
- `preview_video_url` - Preview videos on hover
- `featured` - Mark featured content
- `tags` - Content tags array
- `difficulty_level` - beginner/intermediate/advanced
- `average_rating` - Calculated from ratings
- `total_ratings` - Total number of ratings
- `category_id` - Link to categories

## Setup Instructions

### Method 1: Using Supabase SQL Editor (Recommended)

1. **Access Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/project/udzmlnnztzzwrphhizol/sql/new
   - Make sure you're logged in with appropriate permissions

2. **Execute SQL Script**
   - Copy the entire contents of `/Users/gabrielmaia/Desktop/cs/frontend/netflix-platform-tables.sql`
   - Paste into the SQL Editor
   - Click "Run" to execute all queries

3. **Verify Installation**
   - Check the "Table Editor" section in Supabase Dashboard
   - Verify these new tables exist:
     - module_ratings
     - goal_checkpoints
     - continue_watching
     - module_categories
   - Verify video_modules table has new columns

### Method 2: Using Node.js Script (If Service Key Available)

1. **Update Service Role Key**
   - Get fresh service role key from Supabase Dashboard
   - Settings → API → Service role key (secret)
   - Update in `create-netflix-platform-tables.js`

2. **Run Setup Script**
   ```bash
   node create-netflix-platform-tables.js
   ```

## Features Enabled

### 1. Netflix-Style UI Features
- **Cover Images**: Display module thumbnails in grid/carousel
- **Preview Videos**: Show preview on hover
- **Categories**: Organize content by category
- **Difficulty Levels**: Show skill level indicators
- **Featured Content**: Highlight important modules

### 2. User Engagement
- **NPS Ratings**: Collect 0-10 ratings with feedback
- **Continue Watching**: Resume from last position
- **Personalized Recommendations**: AI-powered suggestions
- **Progress Tracking**: Checkpoint-based goal tracking

### 3. Analytics & Insights
- **Module Statistics**: View counts, completion rates
- **NPS Scores**: Calculate Net Promoter Score
- **Learning Analytics**: Track user engagement
- **Trending Content**: Identify popular modules

## Security (RLS Policies)

All tables have Row Level Security enabled with appropriate policies:

### module_ratings
- Users can view ratings in their organization
- Users can create/update/delete their own ratings

### goal_checkpoints
- Users can view checkpoints in their organization
- Only managers can create/update/delete checkpoints

### continue_watching
- Users can only see/modify their own watch history

### module_categories
- Everyone can view categories
- Only managers can create/update/delete categories

## TypeScript Integration

### Import Services
```typescript
import {
  moduleRatingService,
  continueWatchingService,
  goalCheckpointService,
  moduleCategoryService,
  recommendationService,
  analyticsService
} from '@/lib/supabase-netflix'
```

### Example Usage

#### Submit a Rating
```typescript
await moduleRatingService.create({
  module_id: 'module-uuid',
  mentorado_id: 'mentorado-uuid',
  rating: 9,
  feedback: 'Great content!'
})
```

#### Update Continue Watching
```typescript
await continueWatchingService.update(
  mentoradoId,
  lessonId,
  currentPositionSeconds
)
```

#### Get Recommendations
```typescript
const recommendations = await recommendationService.getForMentorado(
  mentoradoId,
  10 // limit
)
```

## Sample Data

The setup includes sample categories:
- Fundamentos (Blue)
- Marketing Digital (Green)
- Vendas (Yellow)
- Gestão (Purple)
- Finanças (Red)
- Desenvolvimento Pessoal (Pink)

## Troubleshooting

### If tables don't appear:
1. Check for SQL errors in the output
2. Verify you have proper permissions
3. Try running queries one at a time

### If RLS policies block access:
1. Check user authentication status
2. Verify organization_users table relationships
3. Test with service role key for debugging

### If functions fail:
1. Ensure uuid-ossp extension is enabled
2. Check function permissions in Supabase Dashboard
3. Verify trigger creation succeeded

## Next Steps

1. **Update Existing Modules**
   - Add cover images to video_modules
   - Assign categories to modules
   - Mark featured content

2. **Test Features**
   - Create test ratings
   - Test continue watching functionality
   - Verify recommendations work

3. **Build UI Components**
   - Netflix-style module cards
   - Rating modal/drawer
   - Continue watching carousel
   - Category filters

## Support

For issues or questions:
1. Check Supabase logs in Dashboard
2. Verify all migrations completed
3. Test with sample data first
4. Check TypeScript types match database schema