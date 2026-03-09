import { supabase } from '@/lib/supabase'

// ─── Types ─────────────────────────────────────────────────────
interface AgendaEvent {
  id: string
  title: string
  description?: string
  start_datetime: string
  end_datetime: string
  all_day: boolean
  lead_id?: string
  mentorado_id?: string
  call_status?: string
  leads?: {
    nome_completo: string
    temperatura?: string
    origem?: string
    fonte_detalhada?: string
  } | null
  mentorados?: {
    nome_completo: string
  } | null
}

// ─── Constants ─────────────────────────────────────────────────
const WEEKDAY_NAMES: Record<number, string> = {
  0: 'Domingo', 1: 'Segunda', 2: 'Terça', 3: 'Quarta',
  4: 'Quinta', 5: 'Sexta', 6: 'Sábado'
}

// ─── Helpers ───────────────────────────────────────────────────
function getTemperaturaTag(temp?: string): string {
  if (!temp) return ''
  const t = temp.toLowerCase()
  if (t === 'quente') return '🔥quente'
  if (t === 'morno') return '🟡morno'
  if (t === 'frio') return '❄️frio'
  if (t === 'elite') return '⭐elite'
  return temp
}

function formatOrigem(origem?: string, fonteDetalhada?: string): string {
  const src = fonteDetalhada || origem
  if (!src) return ''
  const s = src.toLowerCase()
  if (s.includes('instagram') || s.includes('insta')) return 'insta'
  if (s.includes('indica')) return 'ind'
  if (s.includes('google')) return 'google'
  if (s.includes('facebook') || s.includes('fb')) return 'facebook'
  if (s.includes('tiktok')) return 'tiktok'
  if (s.includes('youtube')) return 'youtube'
  if (s.includes('site')) return 'site'
  return src.length > 15 ? src.slice(0, 12) + '...' : src
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo'
  })
}

// ─── Data fetching ─────────────────────────────────────────────
export async function fetchAgendaEvents(
  organizationId: string,
  startDate: Date,
  endDate: Date
): Promise<AgendaEvent[]> {
  const startISO = new Date(
    startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0
  ).toISOString()
  const endISO = new Date(
    endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59
  ).toISOString()

  const { data, error } = await supabase
    .from('calendar_events')
    .select(`
      id, title, description, start_datetime, end_datetime, all_day,
      lead_id, mentorado_id, call_status,
      leads(nome_completo, temperatura, origem, fonte_detalhada),
      mentorados(nome_completo)
    `)
    .eq('organization_id', organizationId)
    .gte('start_datetime', startISO)
    .lte('start_datetime', endISO)
    .order('start_datetime', { ascending: true })

  if (error) {
    console.error('Erro ao buscar eventos da agenda:', error)
    return []
  }
  return (data || []) as AgendaEvent[]
}

// ─── Format single event line ──────────────────────────────────
function formatEventLine(event: AgendaEvent): string {
  const time = formatTime(event.start_datetime)

  // Lead call → 💰
  if (event.lead_id && event.leads) {
    const nome = event.leads.nome_completo
    const origem = formatOrigem(event.leads.origem, event.leads.fonte_detalhada)
    const temp = getTemperaturaTag(event.leads.temperatura)

    const parts: string[] = []
    if (origem) parts.push(origem)
    else parts.push('sem info de fonte')
    if (temp) parts.push(temp)

    return `💰 ${nome} (${parts.join(', ')}) call às ${time}`
  }

  // Lead without join data
  if (event.lead_id && !event.leads) {
    return `💰 ${event.title} (sem info) call às ${time}`
  }

  // Mentorado onboarding → 🎯
  if (event.mentorado_id && event.mentorados) {
    return `🎯 ${event.mentorados.nome_completo} onboarding às ${time}`
  }

  if (event.mentorado_id && !event.mentorados) {
    return `🎯 ${event.title} onboarding às ${time}`
  }

  // Generic event
  return `📋 ${event.title} às ${time}`
}

// ─── Generate day block ────────────────────────────────────────
function generateDayBlock(events: AgendaEvent[], date: Date): string {
  const dayEvents = events.filter(e => {
    const d = new Date(e.start_datetime)
    return d.getFullYear() === date.getFullYear() &&
      d.getMonth() === date.getMonth() &&
      d.getDate() === date.getDate()
  })

  if (dayEvents.length === 0) return ''

  const dayName = WEEKDAY_NAMES[date.getDay()]
  const dayNum = date.getDate().toString().padStart(2, '0')

  let block = `📌 ${dayName} dia ${dayNum}\n`
  dayEvents.forEach(ev => {
    block += `${formatEventLine(ev)}\n`
  })
  return block
}

// ─── Public API ────────────────────────────────────────────────

/** Gera agenda da semana atual (Seg-Dom) */
export async function generateWeeklyAgenda(organizationId: string): Promise<string> {
  const now = new Date()
  // Find Monday
  const monday = new Date(now)
  const dow = monday.getDay()
  const diff = dow === 0 ? -6 : 1 - dow
  monday.setDate(monday.getDate() + diff)
  monday.setHours(0, 0, 0, 0)

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const events = await fetchAgendaEvents(organizationId, monday, sunday)

  if (events.length === 0) {
    return '📅 *Agenda da Semana*\n\nSem eventos agendados para esta semana.'
  }

  let msg = '📅 *Agenda da Semana*\n\n'
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday)
    day.setDate(monday.getDate() + i)
    const block = generateDayBlock(events, day)
    if (block) {
      msg += block + '\n'
    }
  }
  return msg.trim()
}

/** Gera agenda do dia atual */
export async function generateDailyAgenda(organizationId: string): Promise<string> {
  const today = new Date()
  const events = await fetchAgendaEvents(organizationId, today, today)

  const dayName = WEEKDAY_NAMES[today.getDay()]
  const dayNum = today.getDate().toString().padStart(2, '0')

  if (events.length === 0) {
    return `📅 *Agenda do Dia*\n\n📌 ${dayName} dia ${dayNum}\nSem eventos agendados para hoje.`
  }

  let msg = '📅 *Agenda do Dia*\n\n'
  msg += generateDayBlock(events, today)
  return msg.trim()
}
