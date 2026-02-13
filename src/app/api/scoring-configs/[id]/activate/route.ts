import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'Configuration ID required' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // First, get the config to find the organization_id
    const { data: config, error: configError } = await supabase
      .from('scoring_configurations')
      .select('organization_id')
      .eq('id', id)
      .single()

    if (configError || !config) {
      return NextResponse.json({ error: 'Configuration not found' }, { status: 404 })
    }

    // Deactivate all configs for this organization
    await supabase
      .from('scoring_configurations')
      .update({ is_active: false })
      .eq('organization_id', config.organization_id)

    // Activate the selected config
    const { data, error } = await supabase
      .from('scoring_configurations')
      .update({ 
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}