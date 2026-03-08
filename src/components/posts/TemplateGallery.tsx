"use client";

import React, { useState, useCallback } from 'react';
import { TEMPLATE_GALLERY } from '@/templates/gallery';
import type { TemplateDefinition, TemplateRenderProps } from '@/types';
import { MessageSquare, GitCompare, Heart, Quote, Megaphone, BookOpen, BarChart3, Moon, X, Plus, Trash2 } from 'lucide-react';
import type { TemplateCategory } from '@/types';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  testimonial: <MessageSquare className="w-4 h-4" />,
  comparison: <GitCompare className="w-4 h-4" />,
  motivational: <Heart className="w-4 h-4" />,
  quote: <Quote className="w-4 h-4" />,
  cta: <Megaphone className="w-4 h-4" />,
  storytelling: <BookOpen className="w-4 h-4" />,
  'data-story': <BarChart3 className="w-4 h-4" />,
  'dark-narrative': <Moon className="w-4 h-4" />,
};

interface TemplateGalleryProps {
  profileName: string;
  profileHandle: string;
  avatarUrl?: string;
  onRender: (element: React.ReactNode) => void;
  initialTemplate?: string;
  initialData?: Record<string, any>;
  filterCategory?: TemplateCategory;
}

export default function TemplateGallery({
  profileName, profileHandle, avatarUrl, onRender,
  initialTemplate, initialData,
  filterCategory,
}: TemplateGalleryProps) {
  const filteredTemplates = filterCategory
    ? TEMPLATE_GALLERY.filter(t => t.category === filterCategory)
    : TEMPLATE_GALLERY;

  // Auto-select: if initialTemplate is set OR only one template in filtered list
  const autoSelect = (() => {
    if (initialTemplate) return TEMPLATE_GALLERY.find(t => t.id === initialTemplate) || null;
    if (filteredTemplates.length === 1) return filteredTemplates[0];
    return null;
  })();

  const [selectedTemplate, setSelectedTemplate] = useState<TemplateDefinition | null>(autoSelect);
  const [formData, setFormData] = useState<Record<string, any>>(
    initialData || (autoSelect ? { ...autoSelect.defaultValues } : {})
  );
  const [bgColor, setBgColor] = useState('#052E16');
  const [accentColor, setAccentColor] = useState('#C5A55A');

  const BG_PRESETS = [
    '#000000', '#052E16', '#0F172A', '#450A0A', '#2E1065',
    '#1F2937', '#1A3A2A', '#1E3A5F', '#FFFFFF', '#FEF3C7',
  ];

  const ACCENT_PRESETS = [
    '#C5A55A', '#16A34A', '#3B82F6', '#EF4444', '#F59E0B',
    '#8B5CF6', '#EC4899', '#06B6D4', '#FFFFFF',
  ];

  const handleSelectTemplate = useCallback((tmpl: TemplateDefinition) => {
    setSelectedTemplate(tmpl);
    setFormData(initialData && initialTemplate === tmpl.id ? initialData : { ...tmpl.defaultValues });
  }, [initialData, initialTemplate]);

  const updateField = useCallback((key: string, value: any) => {
    setFormData(prev => {
      const next = { ...prev, [key]: value };
      return next;
    });
  }, []);

  // Keep preview in sync
  React.useEffect(() => {
    if (!selectedTemplate) {
      onRender(
        <div style={{
          width: '1080px', height: '1080px', background: '#111',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'sans-serif', color: '#555', fontSize: '24px',
        }}>
          Selecione um template
        </div>
      );
      return;
    }
    const Component = selectedTemplate.component;
    const props: TemplateRenderProps = {
      data: formData,
      profileName,
      profileHandle,
      avatarUrl,
      accentColor,
      backgroundColor: bgColor,
    };
    onRender(<Component {...props} />);
  }, [selectedTemplate, formData, bgColor, accentColor, profileName, profileHandle, avatarUrl, onRender]);

  const renderFieldInput = (field: typeof selectedTemplate extends null ? never : NonNullable<typeof selectedTemplate>['fields'][number]) => {
    const value = formData[field.key];

    if (field.type === 'text') {
      return (
        <input
          value={value || ''}
          onChange={e => updateField(field.key, e.target.value)}
          placeholder={field.placeholder}
          className="w-full px-3 py-2 bg-[#1a1a1e] border border-white/[0.06] rounded-lg text-[13px] text-white placeholder-[#3a3a3f] focus:outline-none focus:border-emerald-500/40"
        />
      );
    }

    if (field.type === 'textarea') {
      return (
        <textarea
          value={value || ''}
          onChange={e => updateField(field.key, e.target.value)}
          placeholder={field.placeholder}
          rows={3}
          className="w-full px-3 py-2 bg-[#1a1a1e] border border-white/[0.06] rounded-lg text-[13px] text-white placeholder-[#3a3a3f] focus:outline-none focus:border-emerald-500/40 resize-none"
        />
      );
    }

    if (field.type === 'color') {
      return (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={value || accentColor}
            onChange={e => updateField(field.key, e.target.value)}
            className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
          />
          <input
            value={value || ''}
            onChange={e => updateField(field.key, e.target.value)}
            placeholder="#HEXCOLOR"
            className="flex-1 px-2 py-1.5 bg-[#1a1a1e] border border-white/[0.06] rounded-lg text-[11px] text-white placeholder-[#3a3a3f] focus:outline-none"
          />
        </div>
      );
    }

    if (field.type === 'select') {
      return (
        <select
          value={value || ''}
          onChange={e => updateField(field.key, e.target.value)}
          className="w-full px-3 py-2 bg-[#1a1a1e] border border-white/[0.06] rounded-lg text-[13px] text-white focus:outline-none focus:border-emerald-500/40"
        >
          {field.options?.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );
    }

    if (field.type === 'highlights') {
      const highlights: Array<{ word: string; color: string }> = value || [];
      return (
        <div className="space-y-2">
          {highlights.map((h: { word: string; color: string }, i: number) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={h.word}
                onChange={e => {
                  const next = [...highlights];
                  next[i] = { ...next[i], word: e.target.value };
                  updateField(field.key, next);
                }}
                placeholder="Palavra"
                className="flex-1 px-2 py-1.5 bg-[#1a1a1e] border border-white/[0.06] rounded-lg text-[11px] text-white placeholder-[#3a3a3f] focus:outline-none"
              />
              <input
                type="color"
                value={h.color}
                onChange={e => {
                  const next = [...highlights];
                  next[i] = { ...next[i], color: e.target.value };
                  updateField(field.key, next);
                }}
                className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
              />
              <button onClick={() => {
                updateField(field.key, highlights.filter((_: any, j: number) => j !== i));
              }} className="p-1 text-red-400 hover:text-red-300">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <button onClick={() => updateField(field.key, [...highlights, { word: '', color: accentColor }])}
            className="flex items-center gap-1.5 text-[11px] text-emerald-400 hover:text-emerald-300">
            <Plus className="w-3.5 h-3.5" /> Adicionar destaque
          </button>
        </div>
      );
    }

    if (field.type === 'chat-messages') {
      const messages: Array<{ text: string; isUser: boolean; senderName?: string; senderTag?: string }> = value || [];
      return (
        <div className="space-y-2">
          {messages.map((msg: any, i: number) => (
            <div key={i} className="space-y-1.5 p-2 bg-[#151518] rounded-lg">
              <div className="flex items-center gap-2">
                <input
                  value={msg.senderName || ''}
                  onChange={e => {
                    const next = [...messages];
                    next[i] = { ...next[i], senderName: e.target.value };
                    updateField(field.key, next);
                  }}
                  placeholder="Nome"
                  className="flex-1 px-2 py-1 bg-[#1a1a1e] border border-white/[0.06] rounded text-[10px] text-white placeholder-[#3a3a3f] focus:outline-none"
                />
                <input
                  value={msg.senderTag || ''}
                  onChange={e => {
                    const next = [...messages];
                    next[i] = { ...next[i], senderTag: e.target.value };
                    updateField(field.key, next);
                  }}
                  placeholder="Tag"
                  className="w-24 px-2 py-1 bg-[#1a1a1e] border border-white/[0.06] rounded text-[10px] text-white placeholder-[#3a3a3f] focus:outline-none"
                />
                <button onClick={() => updateField(field.key, messages.filter((_: any, j: number) => j !== i))}
                  className="p-1 text-red-400 hover:text-red-300">
                  <X className="w-3 h-3" />
                </button>
              </div>
              <textarea
                value={msg.text}
                onChange={e => {
                  const next = [...messages];
                  next[i] = { ...next[i], text: e.target.value };
                  updateField(field.key, next);
                }}
                rows={2}
                placeholder="Texto da mensagem..."
                className="w-full px-2 py-1.5 bg-[#1a1a1e] border border-white/[0.06] rounded text-[11px] text-white placeholder-[#3a3a3f] focus:outline-none resize-none"
              />
            </div>
          ))}
          <button onClick={() => updateField(field.key, [...messages, { text: '', isUser: false, senderName: '', senderTag: '' }])}
            className="flex items-center gap-1.5 text-[11px] text-emerald-400 hover:text-emerald-300">
            <Plus className="w-3.5 h-3.5" /> Adicionar mensagem
          </button>
        </div>
      );
    }

    if (field.type === 'image') {
      return (
        <input
          value={value || ''}
          onChange={e => updateField(field.key, e.target.value)}
          placeholder="URL da imagem (cole aqui)"
          className="w-full px-3 py-2 bg-[#1a1a1e] border border-white/[0.06] rounded-lg text-[13px] text-white placeholder-[#3a3a3f] focus:outline-none focus:border-emerald-500/40"
        />
      );
    }

    if (field.type === 'list') {
      const items: string[] = value || [];
      return (
        <div className="space-y-2">
          {items.map((item: string, i: number) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={item}
                onChange={e => {
                  const next = [...items];
                  next[i] = e.target.value;
                  updateField(field.key, next);
                }}
                placeholder={field.placeholder || 'Item'}
                className="flex-1 px-2 py-1.5 bg-[#1a1a1e] border border-white/[0.06] rounded-lg text-[11px] text-white placeholder-[#3a3a3f] focus:outline-none"
              />
              <button onClick={() => updateField(field.key, items.filter((_: string, j: number) => j !== i))}
                className="p-1 text-red-400 hover:text-red-300">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <button onClick={() => updateField(field.key, [...items, ''])}
            className="flex items-center gap-1.5 text-[11px] text-emerald-400 hover:text-emerald-300">
            <Plus className="w-3.5 h-3.5" /> Adicionar item
          </button>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {!selectedTemplate ? (
        /* Template selection grid */
        <div className="p-4 space-y-3 overflow-y-auto">
          <p className="text-xs text-[#5a5a5f] font-medium">Escolha um template:</p>
          <div className="grid grid-cols-1 gap-3">
            {filteredTemplates.map(tmpl => (
              <button
                key={tmpl.id}
                onClick={() => handleSelectTemplate(tmpl)}
                className="flex items-start gap-3 p-3 rounded-xl bg-[#151518] border border-white/[0.04] hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all text-left"
              >
                <div className="w-9 h-9 rounded-lg bg-[#1a1a1e] flex items-center justify-center text-emerald-400 flex-shrink-0">
                  {CATEGORY_ICONS[tmpl.category]}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{tmpl.name}</div>
                  <div className="text-[11px] text-[#5a5a5f] mt-0.5">{tmpl.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* Template customization */
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Back button + template name */}
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => setSelectedTemplate(null)}
              className="p-1.5 rounded-lg bg-[#1a1a1e] text-[#5a5a5f] hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-emerald-500/15 flex items-center justify-center text-emerald-400">
                {CATEGORY_ICONS[selectedTemplate.category]}
              </div>
              <span className="text-sm font-semibold text-white">{selectedTemplate.name}</span>
            </div>
          </div>

          {/* Fields */}
          {selectedTemplate.fields.map(field => (
            <div key={field.key}>
              <label className="block text-[10px] font-semibold text-[#5a5a5f] mb-1.5 uppercase tracking-wider">
                {field.label} {field.required && <span className="text-red-400">*</span>}
              </label>
              {renderFieldInput(field)}
            </div>
          ))}

          {/* Background color */}
          <div>
            <label className="block text-[10px] font-semibold text-[#5a5a5f] mb-1.5 uppercase tracking-wider">Cor de Fundo</label>
            <div className="flex flex-wrap gap-1.5">
              {BG_PRESETS.map(c => (
                <button key={c} onClick={() => setBgColor(c)}
                  className={`w-7 h-7 rounded-lg transition-all ${
                    bgColor === c ? 'ring-2 ring-emerald-400 scale-110' : 'ring-1 ring-white/10 hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Accent color */}
          <div>
            <label className="block text-[10px] font-semibold text-[#5a5a5f] mb-1.5 uppercase tracking-wider">Cor de Destaque</label>
            <div className="flex flex-wrap gap-1.5">
              {ACCENT_PRESETS.map(c => (
                <button key={c} onClick={() => setAccentColor(c)}
                  className={`w-6 h-6 rounded-full transition-all ${
                    accentColor === c ? 'ring-2 ring-white scale-110' : 'ring-1 ring-white/10 hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
