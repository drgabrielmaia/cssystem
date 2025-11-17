// Verificar todos os hashes de senhas dos mentorados
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.log('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function verifyAllHashes() {
  try {
    console.log('🔍 VERIFICANDO TODOS OS HASHES DE MENTORADOS')
    console.log('=' .repeat(60))

    // Buscar todos os mentorados
    const { data: mentorados, error } = await supabase
      .from('mentorados')
      .select('id, nome_completo, email, password_hash, status_login')
      .order('nome_completo')

    if (error) {
      console.log('❌ Erro ao buscar mentorados:', error)
      return
    }

    console.log(`📊 Total de mentorados: ${mentorados.length}`)
    console.log('')

    const senhaCorreta = 'mentoradoindica'
    const hashCorreto = Buffer.from(senhaCorreta, 'utf-8').toString('base64')

    console.log(`🔑 Senha esperada: "${senhaCorreta}"`)
    console.log(`🔐 Hash correto: "${hashCorreto}"`)
    console.log('')

    mentorados.forEach((mentorado, index) => {
      console.log(`${index + 1}. ${mentorado.nome_completo}`)
      console.log(`   Email: ${mentorado.email}`)
      console.log(`   Status: ${mentorado.status_login}`)
      console.log(`   Hash no banco: "${mentorado.password_hash}"`)

      if (!mentorado.password_hash) {
        console.log(`   ❌ HASH VAZIO/NULL`)
      } else if (mentorado.password_hash === hashCorreto) {
        console.log(`   ✅ HASH CORRETO`)
      } else {
        console.log(`   ❌ HASH INCORRETO`)

        try {
          const senhaDecodificada = Buffer.from(mentorado.password_hash, 'base64').toString('utf-8')
          console.log(`   🔓 Decodificado: "${senhaDecodificada}"`)
        } catch (err) {
          console.log(`   ❌ Erro ao decodificar: ${err.message}`)
        }
      }
      console.log('')
    })

    // Contar problemas
    const comProblema = mentorados.filter(m =>
      !m.password_hash || m.password_hash !== hashCorreto
    )

    console.log('📋 RESUMO:')
    console.log(`   Total: ${mentorados.length}`)
    console.log(`   Com hash correto: ${mentorados.length - comProblema.length}`)
    console.log(`   Com problema: ${comProblema.length}`)

    if (comProblema.length > 0) {
      console.log('')
      console.log('🛠️  SQL PARA CORRIGIR OS PROBLEMAS:')
      console.log(`UPDATE mentorados SET password_hash = '${hashCorreto}' WHERE id IN (`)
      comProblema.forEach((m, index) => {
        const comma = index < comProblema.length - 1 ? ',' : ''
        console.log(`  '${m.id}'${comma}`)
      })
      console.log(');')
    }

  } catch (error) {
    console.error('❌ Erro geral:', error)
  }
}

verifyAllHashes()