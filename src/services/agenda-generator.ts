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
  0: 'DOMINGO', 1: 'SEGUNDA-FEIRA', 2: 'TERÇA-FEIRA', 3: 'QUARTA-FEIRA',
  4: 'QUINTA-FEIRA', 5: 'SEXTA-FEIRA', 6: 'SÁBADO'
}

// ─── Helpers ───────────────────────────────────────────────────
function getTemperaturaTag(temp?: string): string {
  if (!temp) return ''
  const t = temp.toLowerCase()
  if (t === 'quente') return '🔥 Quente'
  if (t === 'morno') return '🟡 Morno'
  if (t === 'frio') return '❄️ Frio'
  if (t === 'elite') return '⭐ Elite'
  return temp
}

function formatOrigem(origem?: string, fonteDetalhada?: string): string {
  const src = fonteDetalhada || origem
  if (!src) return ''
  const s = src.toLowerCase()
  if (s.includes('instagram') || s.includes('insta')) return 'Insta'
  if (s.includes('indica')) return 'Indicação'
  if (s.includes('google')) return 'Google'
  if (s.includes('facebook') || s.includes('fb')) return 'Facebook'
  if (s.includes('tiktok')) return 'TikTok'
  if (s.includes('youtube')) return 'YouTube'
  if (s.includes('site')) return 'Site'
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

    const tags: string[] = []
    if (origem) tags.push(origem)
    if (temp) tags.push(temp)
    const info = tags.length > 0 ? ` _(${tags.join(' · ')})_` : ''

    return `   💰 *${time}* — ${nome}${info}`
  }

  // Lead without join data
  if (event.lead_id && !event.leads) {
    return `   💰 *${time}* — ${event.title}`
  }

  // Mentorado onboarding → 🎯
  if (event.mentorado_id && event.mentorados) {
    return `   🎯 *${time}* — ${event.mentorados.nome_completo} _(Onboarding)_`
  }

  if (event.mentorado_id && !event.mentorados) {
    return `   🎯 *${time}* — ${event.title} _(Onboarding)_`
  }

  // Generic event
  return `   📋 *${time}* — ${event.title}`
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
  const month = (date.getMonth() + 1).toString().padStart(2, '0')

  let block = `*📌 ${dayName} — ${dayNum}/${month}*\n`
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
    return '📅 *AGENDA DA SEMANA*\n\nSem eventos agendados para esta semana.'
  }

  const totalEvents = events.length
  let msg = `📅 *AGENDA DA SEMANA*\n_${totalEvents} evento${totalEvents > 1 ? 's' : ''} agendado${totalEvents > 1 ? 's' : ''}_\n`

  for (let i = 0; i < 7; i++) {
    const day = new Date(monday)
    day.setDate(monday.getDate() + i)
    const block = generateDayBlock(events, day)
    if (block) {
      msg += `\n${block}`
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
  const month = (today.getMonth() + 1).toString().padStart(2, '0')

  if (events.length === 0) {
    return `📅 *AGENDA DO DIA*\n\n*📌 ${dayName} — ${dayNum}/${month}*\n   Sem eventos agendados para hoje.`
  }

  const totalEvents = events.length
  let msg = `📅 *AGENDA DO DIA*\n_${totalEvents} evento${totalEvents > 1 ? 's' : ''} agendado${totalEvents > 1 ? 's' : ''}_\n\n`
  msg += generateDayBlock(events, today)
  return msg.trim()
}
