// Script para configurar a plataforma Netflix-style no Supabase
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://udzmlnnztzzwrphhizol.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU'

const supabase = createClient(supabaseUrl, supabaseKey)

async function setupNetflixPlatform() {
  try {
    console.log('🎬 Configurando plataforma Netflix-style...')

    // 1. Verificar se as tabelas foram criadas
    console.log('\n📊 Verificando estrutura das tabelas...')

    const { data: moduleRatings, error: mrError } = await supabase
      .from('module_ratings')
      .select('*')
      .limit(1)

    if (mrError) {
      console.error('❌ Erro com tabela module_ratings:', mrError.message)
      console.log('💡 Execute o script SQL netflix-platform-tables.sql no Supabase primeiro!')
      return
    }

    console.log('✅ Tabela module_ratings encontrada')

    // 2. Buscar módulos existentes
    const { data: modules, error: modulesError } = await supabase
      .from('video_modules')
      .select('*')
      .eq('is_active', true)

    if (modulesError) {
      console.error('❌ Erro ao buscar módulos:', modulesError)
      return
    }

    console.log(`📺 Módulos encontrados: ${modules?.length || 0}`)

    // 3. Adicionar dados de exemplo se necessário
    if (!modules || modules.length === 0) {
      console.log('📝 Criando módulos de exemplo...')

      // Buscar organização do temp2@admin.com
      const { data: orgUser, error: orgError } = await supabase
        .from('organization_users')
        .select('organization_id')
        .eq('email', 'temp2@admin.com')
        .eq('role', 'owner')
        .single()

      if (orgError || !orgUser) {
        console.error('❌ Erro ao buscar organização:', orgError)
        return
      }

      // Criar módulos de exemplo
      const sampleModules = [
        {
          title: 'Fundamentos do Marketing Digital',
          description: 'Aprenda os conceitos básicos do marketing digital e como aplicá-los no seu negócio.',
          order_index: 1,
          cover_image_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=450&fit=crop&crop=faces',
          featured: true,
          difficulty_level: 'beginner',
          tags: ['marketing', 'digital', 'fundamentos'],
          organization_id: orgUser.organization_id,
          is_active: true
        },
        {
          title: 'Estratégias de Vendas Avançadas',
          description: 'Técnicas avançadas de vendas para maximizar suas conversões e aumentar sua receita.',
          order_index: 2,
          cover_image_url: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=450&fit=crop&crop=faces',
          featured: true,
          difficulty_level: 'advanced',
          tags: ['vendas', 'conversão', 'estratégia'],
          organization_id: orgUser.organization_id,
          is_active: true
        },
        {
          title: 'Gestão Financeira para Empreendedores',
          description: 'Controle suas finanças e tome decisões inteligentes para o crescimento do seu negócio.',
          order_index: 3,
          cover_image_url: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=450&fit=crop&crop=faces',
          featured: false,
          difficulty_level: 'intermediate',
          tags: ['finanças', 'gestão', 'empreendedorismo'],
          organization_id: orgUser.organization_id,
          is_active: true
        }
      ]

      const { data: newModules, error: createError } = await supabase
        .from('video_modules')
        .insert(sampleModules)
        .select()

      if (createError) {
        console.error('❌ Erro ao criar módulos:', createError)
      } else {
        console.log(`✅ ${newModules?.length || 0} módulos criados`)
      }
    } else {
      // Atualizar módulos existentes com capas
      console.log('🖼️ Atualizando módulos existentes com capas...')

      const covers = [
        'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=450&fit=crop&crop=faces',
        'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=450&fit=crop&crop=faces',
        'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=450&fit=crop&crop=faces',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=450&fit=crop&crop=faces',
        'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=450&fit=crop&crop=faces'
      ]

      for (let i = 0; i < Math.min(modules.length, covers.length); i++) {
        const module = modules[i]
        const cover = covers[i]

        await supabase
          .from('video_modules')
          .update({
            cover_image_url: cover,
            featured: i < 2, // Primeiros 2 como destaque
            difficulty_level: i === 0 ? 'beginner' : i === 1 ? 'advanced' : 'intermediate'
          })
          .eq('id', module.id)
      }

      console.log('✅ Módulos atualizados com capas')
    }

    // 4. Buscar mentorado para criar dados de exemplo
    const { data: mentorados, error: mentoradosError } = await supabase
      .from('mentorados')
      .select('*')
      .limit(5)

    if (mentoradosError) {
      console.error('❌ Erro ao buscar mentorados:', mentoradosError)
      return
    }

    console.log(`👥 Mentorados encontrados: ${mentorados?.length || 0}`)

    // 5. Criar dados de exemplo se houver mentorados
    if (mentorados && mentorados.length > 0) {
      const { data: updatedModules } = await supabase
        .from('video_modules')
        .select('*')
        .eq('is_active', true)
        .limit(3)

      if (updatedModules && updatedModules.length > 0) {
        console.log('📝 Criando avaliações de exemplo...')

        // Criar algumas avaliações de exemplo
        const sampleRatings = []
        for (const module of updatedModules) {
          for (const mentorado of mentorados.slice(0, 3)) {
            const rating = Math.floor(Math.random() * 5) + 6 // 6-10
            const feedbacks = [
              'Excelente módulo! Aprendi muito e já estou aplicando no meu negócio.',
              'Conteúdo muito bem estruturado e didático. Recomendo!',
              'Poderia ter mais exemplos práticos, mas o conteúdo é sólido.',
              'Ótimo! Me ajudou a entender conceitos que tinha dificuldade.',
              'Muito bom, mas achei um pouco longo. Poderia ser mais direto.'
            ]

            sampleRatings.push({
              module_id: module.id,
              mentorado_id: mentorado.id,
              rating,
              feedback: rating >= 8 ? feedbacks[Math.floor(Math.random() * feedbacks.length)] : null,
              organization_id: mentorado.organization_id
            })
          }
        }

        const { error: ratingsError } = await supabase
          .from('module_ratings')
          .upsert(sampleRatings, {
            onConflict: 'module_id,mentorado_id',
            ignoreDuplicates: false
          })

        if (ratingsError) {
          console.error('❌ Erro ao criar avaliações:', ratingsError)
        } else {
          console.log(`✅ ${sampleRatings.length} avaliações de exemplo criadas`)
        }

        // 6. Criar metas de exemplo
        console.log('🎯 Criando metas de exemplo...')

        const sampleGoal = {
          mentorado_id: mentorados[0].id,
          title: 'Aumentar Receita Mensal',
          description: 'Meta de crescimento de receita mensal do negócio',
          goal_type: 'financial',
          priority_level: 'high',
          status: 'active',
          progress_percentage: 0,
          initial_value: 10000,
          current_value: 10000,
          target_value: 50000,
          due_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          organization_id: mentorados[0].organization_id
        }

        const { data: newGoal, error: goalError } = await supabase
          .from('video_learning_goals')
          .insert([sampleGoal])
          .select()
          .single()

        if (goalError) {
          console.error('❌ Erro ao criar meta:', goalError)
        } else {
          console.log('✅ Meta de exemplo criada')

          // Criar checkpoints para a meta
          const checkpoints = [
            { target_value: 20000, title: 'Checkpoint 1: R$ 20.000', description: 'Primeira meta intermediária' },
            { target_value: 30000, title: 'Checkpoint 2: R$ 30.000', description: 'Segunda meta intermediária' },
            { target_value: 40000, title: 'Checkpoint 3: R$ 40.000', description: 'Terceira meta intermediária' },
            { target_value: 50000, title: 'Checkpoint 4: R$ 50.000', description: 'Meta final' }
          ].map((checkpoint, index) => ({
            goal_id: newGoal.id,
            title: checkpoint.title,
            description: checkpoint.description,
            target_value: checkpoint.target_value,
            current_value: 10000,
            progress: Math.min(100, Math.round((10000 / checkpoint.target_value) * 100)),
            order_index: index + 1,
            organization_id: mentorados[0].organization_id
          }))

          const { error: checkpointsError } = await supabase
            .from('goal_checkpoints')
            .insert(checkpoints)

          if (checkpointsError) {
            console.error('❌ Erro ao criar checkpoints:', checkpointsError)
          } else {
            console.log(`✅ ${checkpoints.length} checkpoints criados`)
          }
        }
      }
    }

    console.log('\n🎉 Setup da plataforma Netflix-style concluído!')
    console.log('\n📋 PRÓXIMOS PASSOS:')
    console.log('1. Acesse /mentorado/videos/netflix para ver a nova interface')
    console.log('2. Acesse /mentorado/metas para ver o sistema de metas')
    console.log('3. Acesse /formularios para ver as avaliações dos módulos')
    console.log('4. Configure capas personalizadas dos módulos no admin')

  } catch (error) {
    console.error('💥 Erro geral:', error)
  }
}

setupNetflixPlatform()