// Universal Video Module Access Granting Script
// This script can be run manually to grant access to all video modules for all active mentorados

const { createClient } = require('@supabase/supabase-js')

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing required environment variables!')
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function grantUniversalAccess() {
  console.log('🚀 Starting universal video module access granting process...')
  
  try {
    // Get all active mentorados
    console.log('👥 Fetching active mentorados...')
    const { data: mentorados, error: mentoradosError } = await supabase
      .from('mentorados')
      .select('id, nome_completo, organization_id, status_login')
      .eq('status_login', 'ativo')

    if (mentoradosError) {
      throw mentoradosError
    }

    console.log(`📊 Found ${mentorados?.length || 0} active mentorados`)

    // Get all active video modules
    console.log('📚 Fetching active video modules...')
    const { data: modules, error: modulesError } = await supabase
      .from('video_modules')
      .select('id, title, organization_id')
      .eq('is_active', true)

    if (modulesError) {
      throw modulesError
    }

    console.log(`📊 Found ${modules?.length || 0} active modules`)

    // Get existing access controls
    console.log('🔐 Fetching existing access controls...')
    const { data: existingAccess, error: accessError } = await supabase
      .from('video_access_control')
      .select('mentorado_id, module_id, has_access')

    if (accessError) {
      throw accessError
    }

    console.log(`📊 Found ${existingAccess?.length || 0} existing access control records`)

    // Create a map for quick lookup
    const accessMap = new Map()
    existingAccess?.forEach(access => {
      const key = `${access.mentorado_id}-${access.module_id}`
      accessMap.set(key, access)
    })

    // Prepare records to insert/update
    const recordsToInsert = []
    const recordsToUpdate = []
    let skipped = 0

    for (const mentorado of mentorados || []) {
      // Get modules for this mentorado's organization
      const orgModules = modules?.filter(m => m.organization_id === mentorado.organization_id) || []
      
      for (const module of orgModules) {
        const key = `${mentorado.id}-${module.id}`
        const existing = accessMap.get(key)

        if (existing) {
          if (!existing.has_access) {
            recordsToUpdate.push({
              mentorado_id: mentorado.id,
              module_id: module.id
            })
          } else {
            skipped++
          }
        } else {
          recordsToInsert.push({
            mentorado_id: mentorado.id,
            module_id: module.id,
            has_access: true,
            granted_at: new Date().toISOString(),
            granted_by: 'script_universal_grant',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        }
      }
    }

    console.log(`📈 Processing statistics:`)
    console.log(`  - New records to insert: ${recordsToInsert.length}`)
    console.log(`  - Existing records to update: ${recordsToUpdate.length}`)
    console.log(`  - Records already with access (skipped): ${skipped}`)

    // Insert new records
    if (recordsToInsert.length > 0) {
      console.log(`📝 Inserting ${recordsToInsert.length} new access records...`)
      const { error: insertError } = await supabase
        .from('video_access_control')
        .insert(recordsToInsert)

      if (insertError) {
        console.error('❌ Error inserting new records:', insertError)
        throw insertError
      }
      console.log(`✅ Successfully inserted ${recordsToInsert.length} new records`)
    }

    // Update existing records
    if (recordsToUpdate.length > 0) {
      console.log(`🔄 Updating ${recordsToUpdate.length} existing records...`)
      let updated = 0
      let errors = 0

      for (const record of recordsToUpdate) {
        const { error: updateError } = await supabase
          .from('video_access_control')
          .update({
            has_access: true,
            granted_at: new Date().toISOString(),
            granted_by: 'script_universal_grant',
            updated_at: new Date().toISOString(),
            revoked_at: null,
            revoked_by: null
          })
          .eq('mentorado_id', record.mentorado_id)
          .eq('module_id', record.module_id)

        if (updateError) {
          console.error(`❌ Error updating record ${record.mentorado_id}-${record.module_id}:`, updateError)
          errors++
        } else {
          updated++
        }
      }

      console.log(`✅ Successfully updated ${updated} records`)
      if (errors > 0) {
        console.warn(`⚠️ ${errors} records failed to update`)
      }
    }

    console.log('🎉 Universal access granting process completed!')
    console.log(`📊 Final stats: ${recordsToInsert.length} new + ${recordsToUpdate.length - (recordsToUpdate.length - updated)} updated = ${recordsToInsert.length + updated} total processed`)

  } catch (error) {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  }
}

// Run the script
if (require.main === module) {
  grantUniversalAccess()
    .then(() => {
      console.log('✅ Script completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Script failed:', error)
      process.exit(1)
    })
}

module.exports = { grantUniversalAccess }