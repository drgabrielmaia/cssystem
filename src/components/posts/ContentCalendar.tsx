"use client";

import React, { useState, useCallback } from 'react';
import {
  X, Sparkles, Loader2, ChevronLeft, ChevronRight,
  MessageSquare, GitCompare, Heart, Quote, Megaphone,
  BookOpen, BarChart3, Moon, Plus,
} from 'lucide-react';

interface CalendarDay {
  day: number;
  type?: string;
  topic?: string;
  hook?: string;
}

interface ContentCalendarProps {
  open: boolean;
  onClose: () => void;
  userEmail?: string;
  onCreatePost: () => void;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  testimonial: <MessageSquare className="w-3 h-3" />,
  comparison: <GitCompare className="w-3 h-3" />,
  motivational: <Heart className="w-3 h-3" />,
  quote: <Quote className="w-3 h-3" />,
  cta: <Megaphone className="w-3 h-3" />,
  storytelling: <BookOpen className="w-3 h-3" />,
  'data-story': <BarChart3 className="w-3 h-3" />,
  'dark-narrative': <Moon className="w-3 h-3" />,
};

const TYPE_COLORS: Record<string, string> = {
  testimonial: 'bg-blue-500/20 text-blue-300 ring-blue-500/30',
  comparison: 'bg-orange-500/20 text-orange-300 ring-orange-500/30',
  motivational: 'bg-pink-500/20 text-pink-300 ring-pink-500/30',
  quote: 'bg-cyan-500/20 text-cyan-300 ring-cyan-500/30',
  cta: 'bg-green-500/20 text-green-300 ring-green-500/30',
  storytelling: 'bg-purple-500/20 text-purple-300 ring-purple-500/30',
  'data-story': 'bg-yellow-500/20 text-yellow-300 ring-yellow-500/30',
  'dark-narrative': 'bg-slate-500/20 text-slate-300 ring-slate-500/30',
};

const TYPE_LABELS: Record<string, string> = {
  testimonial: 'Depoimento',
  comparison: 'Comparacao',
  motivational: 'Motivacional',
  quote: 'Quote',
  cta: 'CTA',
  storytelling: 'Storytelling',
  'data-story': 'Dados',
  'dark-narrative': 'Narrativa',
};

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export default function ContentCalendar({ open, onClose, userEmail, onCreatePost }: ContentCalendarProps) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [calendar, setCalendar] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setCalendar([]);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setCalendar([]);
  };

  const generateCalendar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/chat-gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Gere um calendario de conteudo para Instagram para o mes de ${MONTH_NAMES[month]} ${year}. O mes tem ${daysInMonth} dias. Para cada dia util (seg a sex), sugira um post. Sabado e domingo podem ter posts opcionais.

Retorne APENAS um JSON array com objetos no formato:
[
  { "day": 1, "type": "motivational", "topic": "Tema do post", "hook": "Hook principal do post" },
  ...
]

Tipos disponiveis: testimonial, comparison, motivational, quote, cta, storytelling, data-story, dark-narrative

Alterne os tipos para ter variedade. Temas devem ser relevantes para medicos empreendedores. Gere para TODOS os ${daysInMonth} dias.`,
          userEmail: userEmail,
          context: { tipoPost: 'calendario' },
        }),
      });
      const json = await res.json();
      const reply = json.reply || json.message;
      if (reply) {
        try {
          const cleaned = reply.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          const parsed = JSON.parse(cleaned);
          if (Array.isArray(parsed)) {
            setCalendar(parsed);
          }
        } catch {
          console.error('Failed to parse calendar:', reply);
        }
      }
    } catch (err) {
      console.error('Calendar generation error:', err);
    } finally {
      setLoading(false);
    }
  }, [month, year, daysInMonth, userEmail]);

  if (!open) return null;

  const getCalendarDay = (day: number) => calendar.find(d => d.day === day);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full h-full md:w-[90vw] md:max-w-[1100px] md:h-[85vh] md:rounded-2xl bg-[#0f0f11] md:border md:border-white/[0.08] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-pink-400 flex items-center justify-center">
              <BookOpen className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-sm text-white">Calendario de Conteudo</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={generateCalendar}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-xs font-medium transition-all disabled:opacity-40"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {loading ? 'Gerando...' : 'Gerar com IA'}
            </button>
            <button onClick={onClose} className="p-2 rounded-lg text-[#5a5a5f] hover:text-white hover:bg-white/5 transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Month navigation */}
        <div className="flex items-center justify-center gap-4 px-4 py-3 border-b border-white/[0.06] flex-shrink-0">
          <button onClick={prevMonth} className="p-1.5 rounded-lg text-[#5a5a5f] hover:text-white hover:bg-white/5 transition-all">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-semibold text-white min-w-[160px] text-center">
            {MONTH_NAMES[month]} {year}
          </span>
          <button onClick={nextMonth} className="p-1.5 rounded-lg text-[#5a5a5f] hover:text-white hover:bg-white/5 transition-all">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Calendar grid */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center text-[10px] sm:text-xs font-semibold text-[#5a5a5f] uppercase py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {/* Empty cells before first day */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[60px] sm:min-h-[80px] md:min-h-[100px]" />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const calDay = getCalendarDay(day);
              const isToday = day === now.getDate() && month === now.getMonth() && year === now.getFullYear();

              return (
                <button
                  key={day}
                  onClick={() => calDay && setSelectedDay(calDay)}
                  className={`min-h-[60px] sm:min-h-[80px] md:min-h-[100px] rounded-lg sm:rounded-xl p-1.5 sm:p-2 flex flex-col text-left transition-all ${
                    calDay ? 'bg-[#151518] border border-white/[0.06] hover:border-emerald-500/30 cursor-pointer' : 'bg-[#0d0d0f]'
                  } ${isToday ? 'ring-1 ring-emerald-500/40' : ''}`}
                >
                  <span className={`text-[10px] sm:text-xs font-medium ${isToday ? 'text-emerald-400' : 'text-[#5a5a5f]'}`}>
                    {day}
                  </span>
                  {calDay && calDay.type && (
                    <div className="mt-1 flex-1 flex flex-col gap-1">
                      <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-medium ring-1 w-fit ${TYPE_COLORS[calDay.type] || 'bg-white/10 text-white/60 ring-white/20'}`}>
                        {TYPE_ICONS[calDay.type]}
                        <span className="hidden sm:inline">{TYPE_LABELS[calDay.type] || calDay.type}</span>
                      </div>
                      {calDay.topic && (
                        <p className="text-[8px] sm:text-[10px] text-[#6a6a6f] line-clamp-2 leading-tight">
                          {calDay.topic}
                        </p>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {calendar.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-4">
                <Sparkles className="w-7 h-7 text-purple-400" />
              </div>
              <p className="text-[#5a5a5f] text-sm">Clique em "Gerar com IA" para criar seu calendario de conteudo</p>
              <p className="text-[#3a3a3f] text-xs mt-1">A IA vai sugerir posts para cada dia do mes</p>
            </div>
          )}
        </div>

        {/* Selected day detail */}
        {selectedDay && (
          <div className="border-t border-white/[0.06] px-4 py-3 flex items-center gap-4 flex-shrink-0 bg-[#111114]">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-white">Dia {selectedDay.day}</span>
                {selectedDay.type && (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ring-1 ${TYPE_COLORS[selectedDay.type] || ''}`}>
                    {TYPE_ICONS[selectedDay.type]}
                    {TYPE_LABELS[selectedDay.type]}
                  </span>
                )}
              </div>
              {selectedDay.topic && <p className="text-xs text-[#7a7a7f]">{selectedDay.topic}</p>}
              {selectedDay.hook && <p className="text-[11px] text-[#5a5a5f] mt-0.5 italic">"{selectedDay.hook}"</p>}
            </div>
            <button
              onClick={onCreatePost}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors flex-shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Criar este post
            </button>
            <button onClick={() => setSelectedDay(null)} className="p-1.5 text-[#5a5a5f] hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
