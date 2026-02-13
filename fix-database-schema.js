#!/usr/bin/env node

/**
 * Fix Database Schema Issues
 * Fixes the nivel_interesse column type and updates the process function
 */

const { createClient } = require('@supabase/supabase-js')

require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function fixDatabaseSchema() {
  console.log('🔧 Fixing database schema issues...\n')

  try {
    // 1. First, let's check the current column type
    console.log('📋 Checking current column info...')
    const { data: columnInfo, error: columnError } = await supabase
      .rpc('sql', {
        query: `
          SELECT column_name, data_type, is_nullable, column_default 
          FROM information_schema.columns 
          WHERE table_name = 'leads' AND column_name = 'nivel_interesse';
        `
      })

    if (columnError) {
      console.log('ℹ️  Column check failed (might not exist):', columnError.message)
    } else {
      console.log('✅ Current column info:', columnInfo)
    }

    // 2. Alter column to TEXT type
    console.log('\n🔄 Converting nivel_interesse to TEXT type...')
    const { error: alterError } = await supabase
      .rpc('sql', {
        query: `ALTER TABLE leads ALTER COLUMN nivel_interesse TYPE TEXT;`
      })

    if (alterError) {
      console.log('⚠️  Column alter result:', alterError.message)
    } else {
      console.log('✅ Column type updated to TEXT')
    }

    // 3. Create normalization function
    console.log('\n🎯 Creating nivel_interesse normalization function...')
    const { error: functionError } = await supabase
      .rpc('sql', {
        query: `
          CREATE OR REPLACE FUNCTION normalize_nivel_interesse(input_value TEXT)
          RETURNS INTEGER AS $$
          BEGIN
            IF input_value IS NULL THEN
              RETURN 2; -- Default: medio
            END IF;
            
            IF input_value IN ('alto', 'high', '3') THEN
              RETURN 3;
            ELSIF input_value IN ('medio', 'medium', '2') THEN
              RETURN 2;
            ELSIF input_value IN ('baixo', 'low', '1') THEN
              RETURN 1;
            ELSE
              BEGIN
                RETURN input_value::INTEGER;
              EXCEPTION
                WHEN OTHERS THEN
                  RETURN 2; -- Default: medio
              END;
            END IF;
          END;
          $$ LANGUAGE plpgsql;
        `
      })

    if (functionError) {
      console.log('❌ Function creation failed:', functionError.message)
    } else {
      console.log('✅ Normalization function created')
    }

    // 4. Update existing records
    console.log('\n📝 Normalizing existing records...')
    const { error: updateError } = await supabase
      .rpc('sql', {
        query: `
          UPDATE leads 
          SET nivel_interesse = CASE 
            WHEN nivel_interesse IN ('alto', 'high') THEN '3'
            WHEN nivel_interesse IN ('baixo', 'low') THEN '1'
            ELSE '2'
          END
          WHERE nivel_interesse IS NOT NULL AND nivel_interesse NOT IN ('1', '2', '3');
        `
      })

    if (updateError) {
      console.log('⚠️  Update result:', updateError.message)
    } else {
      console.log('✅ Existing records normalized')
    }

    // 5. Test the function
    console.log('\n🧪 Testing normalization function...')
    const { data: testData, error: testError } = await supabase
      .rpc('sql', {
        query: `
          SELECT 
            normalize_nivel_interesse('alto') as texto_alto,
            normalize_nivel_interesse('medio') as texto_medio,
            normalize_nivel_interesse('baixo') as texto_baixo,
            normalize_nivel_interesse('3') as numero_3,
            normalize_nivel_interesse('2') as numero_2,
            normalize_nivel_interesse('1') as numero_1,
            normalize_nivel_interesse(null) as valor_null;
        `
      })

    if (testError) {
      console.log('❌ Test failed:', testError.message)
    } else {
      console.log('✅ Function test results:', testData)
    }

    // 6. Check current distribution
    console.log('\n📊 Current nivel_interesse distribution...')
    const { data: distribution } = await supabase
      .from('leads')
      .select('nivel_interesse')

    if (distribution) {
      const counts = {}
      distribution.forEach(lead => {
        const nivel = lead.nivel_interesse || 'null'
        counts[nivel] = (counts[nivel] || 0) + 1
      })
      console.log('Distribution:', counts)
    }

    console.log('\n✅ Database schema fix completed!')

  } catch (error) {
    console.error('❌ Fix failed:', error.message)
  }
}

fixDatabaseSchema()