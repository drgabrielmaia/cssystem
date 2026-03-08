"use client";

import React, { useState, useCallback, useRef } from 'react';
import { TEMPLATE_GALLERY } from '@/templates/gallery';
import type { TemplateDefinition, TemplateRenderProps, TemplateCategory } from '@/types';
import {
  MessageSquare, GitCompare, Heart, Quote, Megaphone, BookOpen, BarChart3, Moon,
  X, Plus, Trash2, Upload, ImageIcon, Type, AlignLeft, Palette as PaletteIcon,
  List, MessageCircle, Highlighter, ChevronDown, ChevronRight, Minus, Settings2,
} from 'lucide-react';

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
  initialBgColor?: string;
  initialAccentColor?: string;
  filterCategory?: TemplateCategory;
  onDataChange?: (data: { templateId: string; formData: Record<string, any>; bgColor: string; accentColor: string }) => void;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function TemplateGallery({
  profileName, profileHandle, avatarUrl, onRender,
  initialTemplate, initialData,
  initialBgColor, initialAccentColor,
  filterCategory,
  onDataChange,
}: TemplateGalleryProps) {
  const filteredTemplates = filterCategory
    ? TEMPLATE_GALLERY.filter(t => t.category === filterCategory)
    : TEMPLATE_GALLERY;

  const autoSelect = (() => {
    if (initialTemplate) return TEMPLATE_GALLERY.find(t => t.id === initialTemplate) || null;
    if (filteredTemplates.length === 1) return filteredTemplates[0];
    return null;
  })();

  const [selectedTemplate, setSelectedTemplate] = useState<TemplateDefinition | null>(autoSelect);
  const [formData, setFormData] = useState<Record<string, any>>(
    initialData || (autoSelect ? { ...autoSelect.defaultValues } : {})
  );
  const [bgColor, setBgColor] = useState(initialBgColor || '#052E16');
  const [accentColor, setAccentColor] = useState(initialAccentColor || '#C5A55A');
  const [expandedFontField, setExpandedFontField] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const imageInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

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
    setFormData(prev => ({ ...prev, [key]: value }));
  }, []);

  const getFontSettings = (fieldKey: string) => {
    const fonts = formData._fonts || {};
    return fonts[fieldKey] || {};
  };
  const updateFontSetting = useCallback((fieldKey: string, prop: string, value: any) => {
    setFormData(prev => {
      const fonts = { ...(prev._fonts || {}) };
      fonts[fieldKey] = { ...(fonts[fieldKey] || {}), [prop]: value };
      return { ...prev, _fonts: fonts };
    });
  }, []);

  const handleImageUpload = useCallback(async (fieldKey: string, file: File) => {
    try {
      const dataUrl = await fileToDataUrl(file);
      updateField(fieldKey, dataUrl);
    } catch (err) {
      console.error('Image upload error:', err);
    }
  }, [updateField]);

  const handleDrop = useCallback((fieldKey: string, e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleImageUpload(fieldKey, file);
    }
  }, [handleImageUpload]);

  const toggleSection = useCallback((title: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  }, []);

  // Keep preview in sync + report data changes to parent
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
    onDataChange?.({
      templateId: selectedTemplate.id,
      formData,
      bgColor,
      accentColor,
    });
  }, [selectedTemplate, formData, bgColor, accentColor, profileName, profileHandle, avatarUrl, onRender, onDataChange]);

  // Group fields into sections
  const getFieldSections = (fields: TemplateDefinition['fields']) => {
    const textFields = fields.filter(f => f.type === 'text' || f.type === 'textarea' || f.type === 'select');
    const imageFields = fields.filter(f => f.type === 'image');
    const listFields = fields.filter(f => f.type === 'list' || f.type === 'highlights' || f.type === 'chat-messages');
    const colorFields = fields.filter(f => f.type === 'color');

    const sections: { title: string; icon: React.ReactNode; fields: typeof fields }[] = [];
    if (textFields.length > 0) sections.push({ title: 'Textos', icon: <Type className="w-3.5 h-3.5" />, fields: textFields });
    if (imageFields.length > 0) sections.push({ title: 'Imagens', icon: <ImageIcon className="w-3.5 h-3.5" />, fields: imageFields });
    if (listFields.length > 0) sections.push({ title: 'Listas & Detalhes', icon: <List className="w-3.5 h-3.5" />, fields: listFields });
    if (colorFields.length > 0) sections.push({ title: 'Cores', icon: <PaletteIcon className="w-3.5 h-3.5" />, fields: colorFields });
    return sections;
  };

  const renderFieldInput = (field: TemplateDefinition['fields'][number]) => {
    const value = formData[field.key];

    if (field.type === 'text') {
      return (
        <input
          value={value || ''}
          onChange={e => updateField(field.key, e.target.value)}
          placeholder={field.placeholder}
          className="w-full px-3 py-2 bg-[#1a1a1e] border border-white/[0.06] rounded-lg text-[13px] text-white placeholder-[#3a3a3f] focus:outline-none focus:border-emerald-500/40 transition-colors"
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
          className="w-full px-3 py-2 bg-[#1a1a1e] border border-white/[0.06] rounded-lg text-[13px] text-white placeholder-[#3a3a3f] focus:outline-none focus:border-emerald-500/40 resize-none transition-colors"
        />
      );
    }

    if (field.type === 'color') {
      return (
        <div className="flex items-center gap-2">
          <input type="color" value={value || accentColor} onChange={e => updateField(field.key, e.target.value)}
            className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0" />
          <input value={value || ''} onChange={e => updateField(field.key, e.target.value)} placeholder="#HEX"
            className="flex-1 px-2 py-1.5 bg-[#1a1a1e] border border-white/[0.06] rounded-lg text-[11px] text-white placeholder-[#3a3a3f] focus:outline-none" />
        </div>
      );
    }

    if (field.type === 'select') {
      return (
        <select value={value || ''} onChange={e => updateField(field.key, e.target.value)}
          className="w-full px-3 py-2 bg-[#1a1a1e] border border-white/[0.06] rounded-lg text-[13px] text-white focus:outline-none focus:border-emerald-500/40">
          {field.options?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      );
    }

    if (field.type === 'highlights') {
      const highlights: Array<{ word: string; color: string }> = value || [];
      return (
        <div className="space-y-1.5">
          {highlights.map((h: { word: string; color: string }, i: number) => (
            <div key={i} className="flex items-center gap-1.5 p-1.5 bg-[#151518] rounded-lg">
              <input value={h.word} onChange={e => {
                const next = [...highlights]; next[i] = { ...next[i], word: e.target.value }; updateField(field.key, next);
              }} placeholder="Palavra" className="flex-1 px-2 py-1 bg-[#1a1a1e] border border-white/[0.06] rounded text-[11px] text-white placeholder-[#3a3a3f] focus:outline-none" />
              <input type="color" value={h.color} onChange={e => {
                const next = [...highlights]; next[i] = { ...next[i], color: e.target.value }; updateField(field.key, next);
              }} className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 flex-shrink-0" />
              <button onClick={() => updateField(field.key, highlights.filter((_: any, j: number) => j !== i))}
                className="p-0.5 text-red-400/50 hover:text-red-300 flex-shrink-0"><Trash2 className="w-3 h-3" /></button>
            </div>
          ))}
          <button onClick={() => updateField(field.key, [...highlights, { word: '', color: accentColor }])}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#151518] text-[10px] text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/5 w-full justify-center border border-dashed border-white/[0.06]">
            <Plus className="w-3 h-3" /> Adicionar
          </button>
        </div>
      );
    }

    if (field.type === 'chat-messages') {
      const messages: Array<{ text: string; isUser: boolean; senderName?: string; senderTag?: string }> = value || [];
      return (
        <div className="space-y-1.5">
          {messages.map((msg: any, i: number) => (
            <div key={i} className="p-2 bg-[#151518] rounded-lg space-y-1.5">
              <div className="flex items-center gap-1.5">
                <input value={msg.senderName || ''} onChange={e => {
                  const next = [...messages]; next[i] = { ...next[i], senderName: e.target.value }; updateField(field.key, next);
                }} placeholder="Nome" className="flex-1 px-2 py-1 bg-[#1a1a1e] border border-white/[0.06] rounded text-[10px] text-white placeholder-[#3a3a3f] focus:outline-none" />
                <button onClick={() => updateField(field.key, messages.filter((_: any, j: number) => j !== i))}
                  className="p-0.5 text-red-400/50 hover:text-red-300 flex-shrink-0"><X className="w-3 h-3" /></button>
              </div>
              <textarea value={msg.text} onChange={e => {
                const next = [...messages]; next[i] = { ...next[i], text: e.target.value }; updateField(field.key, next);
              }} rows={2} placeholder="Mensagem..."
                className="w-full px-2 py-1 bg-[#1a1a1e] border border-white/[0.06] rounded text-[11px] text-white placeholder-[#3a3a3f] focus:outline-none resize-none" />
            </div>
          ))}
          <button onClick={() => updateField(field.key, [...messages, { text: '', isUser: false, senderName: '', senderTag: '' }])}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#151518] text-[10px] text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/5 w-full justify-center border border-dashed border-white/[0.06]">
            <Plus className="w-3 h-3" /> Mensagem
          </button>
        </div>
      );
    }

    if (field.type === 'image') {
      const hasImage = value && value.length > 0;
      return (
        <div>
          {hasImage && (
            <div className="relative mb-1.5 rounded-lg overflow-hidden bg-[#151518]">
              <img src={value} alt="" className="w-full h-28 object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <button onClick={() => updateField(field.key, '')}
                className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center hover:bg-red-500/80 transition-colors">
                <X className="w-2.5 h-2.5 text-white" />
              </button>
            </div>
          )}
          <div onDragOver={e => e.preventDefault()} onDrop={e => handleDrop(field.key, e)}
            onClick={() => imageInputRefs.current[field.key]?.click()}
            className={`flex items-center gap-3 px-3 py-3 rounded-lg border-2 border-dashed cursor-pointer transition-all ${
              hasImage ? 'border-white/[0.06] hover:border-emerald-500/30 bg-[#0d0d0f]' : 'border-white/[0.08] hover:border-emerald-500/40 bg-[#151518]'
            }`}>
            <Upload className="w-4 h-4 text-[#5a5a5f] flex-shrink-0" />
            <span className="text-[11px] text-[#6a6a6f]">{hasImage ? 'Trocar imagem' : 'Clique ou arraste'}</span>
            <input ref={el => { imageInputRefs.current[field.key] = el; }} type="file" accept="image/*" className="hidden"
              onChange={e => { const file = e.target.files?.[0]; if (file) handleImageUpload(field.key, file); e.target.value = ''; }} />
          </div>
          <input value={value?.startsWith('data:') ? '' : (value || '')} onChange={e => updateField(field.key, e.target.value)}
            placeholder="ou cole URL" className="w-full mt-1 px-2.5 py-1 bg-[#0d0d0f] border border-white/[0.04] rounded text-[10px] text-[#5a5a5f] placeholder-[#2a2a2f] focus:outline-none focus:border-emerald-500/30 focus:text-white" />
        </div>
      );
    }

    if (field.type === 'list') {
      const items: string[] = value || [];
      return (
        <div className="space-y-1.5">
          {items.map((item: string, i: number) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="text-[9px] text-[#3a3a3f] font-mono w-3 text-right flex-shrink-0">{i + 1}</span>
              <input value={item} onChange={e => {
                const next = [...items]; next[i] = e.target.value; updateField(field.key, next);
              }} placeholder={field.placeholder || 'Item'} className="flex-1 px-2 py-1.5 bg-[#1a1a1e] border border-white/[0.06] rounded-lg text-[12px] text-white placeholder-[#3a3a3f] focus:outline-none focus:border-emerald-500/30" />
              <button onClick={() => updateField(field.key, items.filter((_: string, j: number) => j !== i))}
                className="p-0.5 text-red-400/40 hover:text-red-300 flex-shrink-0"><Trash2 className="w-3 h-3" /></button>
            </div>
          ))}
          <button onClick={() => updateField(field.key, [...items, ''])}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#151518] text-[10px] text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/5 w-full justify-center border border-dashed border-white/[0.06]">
            <Plus className="w-3 h-3" /> Adicionar
          </button>
        </div>
      );
    }

    return null;
  };

  // Font controls - only shown when expanded for a specific field
  const renderFontControls = (fieldKey: string) => {
    const isExpanded = expandedFontField === fieldKey;
    const fs = getFontSettings(fieldKey);
    const hasOverrides = fs.weight || fs.size || fs.color || fs.highlight;

    return (
      <div className="mt-0.5">
        <button
          onClick={() => setExpandedFontField(isExpanded ? null : fieldKey)}
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] transition-all ${
            hasOverrides
              ? 'text-emerald-400 bg-emerald-500/10'
              : 'text-[#4a4a4f] hover:text-[#7a7a7f]'
          }`}
        >
          <Settings2 className="w-2.5 h-2.5" />
          {hasOverrides ? 'Fonte customizada' : 'Personalizar fonte'}
          <ChevronRight className={`w-2.5 h-2.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        </button>

        {isExpanded && (
          <div className="flex items-center gap-1 mt-1 flex-wrap p-1.5 bg-[#0d0d0f] rounded-lg">
            {/* Weight */}
            <div className="flex items-center bg-[#151518] rounded overflow-hidden border border-white/[0.04]">
              {[{ v: 400, l: 'Aa' }, { v: 700, l: 'Aa' }, { v: 900, l: 'Aa' }].map((w, i) => (
                <button key={w.v} onClick={() => updateFontSetting(fieldKey, 'weight', w.v)}
                  className={`px-1.5 py-0.5 text-[9px] transition-all ${
                    (fs.weight || 400) === w.v ? 'bg-emerald-500/20 text-emerald-300' : 'text-[#5a5a5f] hover:text-white hover:bg-white/5'
                  }`} style={{ fontWeight: w.v }}>{w.l}</button>
              ))}
            </div>

            {/* Size */}
            <div className="flex items-center gap-0.5 bg-[#151518] rounded border border-white/[0.04]">
              <button onClick={() => updateFontSetting(fieldKey, 'size', Math.max(12, (fs.size || 0) - 4))}
                className="p-0.5 text-[#5a5a5f] hover:text-white"><Minus className="w-2.5 h-2.5" /></button>
              <span className="text-[8px] text-[#7a7a7f] min-w-[20px] text-center font-mono">{fs.size || 'Auto'}</span>
              <button onClick={() => updateFontSetting(fieldKey, 'size', (fs.size || 32) + 4)}
                className="p-0.5 text-[#5a5a5f] hover:text-white"><Plus className="w-2.5 h-2.5" /></button>
            </div>

            {/* Color */}
            <div className="flex items-center bg-[#151518] rounded border border-white/[0.04] px-1">
              <span className="text-[8px] text-[#5a5a5f]">A</span>
              <input type="color" value={fs.color || '#FFFFFF'} onChange={e => updateFontSetting(fieldKey, 'color', e.target.value)}
                className="w-4 h-4 rounded cursor-pointer bg-transparent border-0" />
            </div>

            {/* Highlight */}
            <div className="flex items-center bg-[#151518] rounded border border-white/[0.04] px-1">
              <Highlighter className="w-2.5 h-2.5 text-[#5a5a5f]" />
              <input type="color" value={fs.highlight || '#00000000'} onChange={e => updateFontSetting(fieldKey, 'highlight', e.target.value)}
                className="w-4 h-4 rounded cursor-pointer bg-transparent border-0" />
              {fs.highlight && (
                <button onClick={() => updateFontSetting(fieldKey, 'highlight', '')} className="text-[#5a5a5f] hover:text-red-400">
                  <X className="w-2 h-2" /></button>
              )}
            </div>

            {hasOverrides && (
              <button onClick={() => {
                setFormData(prev => { const fonts = { ...(prev._fonts || {}) }; delete fonts[fieldKey]; return { ...prev, _fonts: fonts }; });
              }} className="px-1 py-0.5 text-[8px] text-red-400/60 hover:text-red-300">Reset</button>
            )}
          </div>
        )}
      </div>
    );
  };

  // Collapsible section wrapper
  const renderSection = (title: string, icon: React.ReactNode, children: React.ReactNode) => {
    const isCollapsed = collapsedSections.has(title);
    return (
      <div className="border-b border-white/[0.04] last:border-b-0">
        <button
          onClick={() => toggleSection(title)}
          className="flex items-center gap-2 w-full px-4 py-2.5 hover:bg-white/[0.02] transition-colors"
        >
          <div className="w-5 h-5 rounded bg-white/[0.04] flex items-center justify-center text-[#6a6a6f]">
            {icon}
          </div>
          <span className="text-[11px] font-bold text-[#8a8a8f] uppercase tracking-wider flex-1 text-left">{title}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-[#4a4a4f] transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
        </button>
        {!isCollapsed && (
          <div className="px-4 pb-3 space-y-3">
            {children}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {!selectedTemplate ? (
        /* Template selection grid */
        <div className="p-3 space-y-2 overflow-y-auto">
          <p className="text-[11px] text-[#6a6a6f] font-medium px-1">Escolha o layout:</p>
          <div className="space-y-1.5">
            {filteredTemplates.map(tmpl => (
              <button
                key={tmpl.id}
                onClick={() => handleSelectTemplate(tmpl)}
                className="flex items-center gap-3 w-full p-2.5 rounded-xl bg-[#151518] border border-white/[0.04] hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-[#1a1a1e] flex items-center justify-center text-emerald-400 flex-shrink-0">
                  {CATEGORY_ICONS[tmpl.category]}
                </div>
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold text-white">{tmpl.name}</div>
                  <div className="text-[10px] text-[#5a5a5f] truncate">{tmpl.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* Template editing with collapsible sections */
        <div className="flex-1 overflow-y-auto">
          {/* Template header */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.06] bg-[#0c0c0e] sticky top-0 z-10">
            <button onClick={() => setSelectedTemplate(null)}
              className="p-1 rounded bg-[#1a1a1e] text-[#5a5a5f] hover:text-white transition-all flex-shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
            <div className="w-5 h-5 rounded bg-emerald-500/15 flex items-center justify-center text-emerald-400 flex-shrink-0">
              {CATEGORY_ICONS[selectedTemplate.category]}
            </div>
            <span className="text-[12px] font-semibold text-white truncate">{selectedTemplate.name}</span>
          </div>

          {/* Field sections */}
          {getFieldSections(selectedTemplate.fields).map((section, si) => (
            <React.Fragment key={si}>
              {renderSection(section.title, section.icon, (
                <>
                  {section.fields.map(field => (
                    <div key={field.key} className="space-y-1">
                      <label className="text-[11px] font-medium text-[#7a7a7f] flex items-center gap-1">
                        {field.label}
                        {field.required && <span className="text-red-400/60 text-[9px]">*</span>}
                      </label>
                      {renderFieldInput(field)}
                      {(field.type === 'text' || field.type === 'textarea') && renderFontControls(field.key)}
                    </div>
                  ))}
                </>
              ))}
            </React.Fragment>
          ))}

          {/* Appearance section */}
          {renderSection('Aparencia', <PaletteIcon className="w-3.5 h-3.5" />, (
            <>
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-[#7a7a7f]">Cor de Fundo</label>
                <div className="flex flex-wrap gap-1.5">
                  {BG_PRESETS.map(c => (
                    <button key={c} onClick={() => setBgColor(c)}
                      className={`w-7 h-7 rounded-lg transition-all ${
                        bgColor === c ? 'ring-2 ring-emerald-400 scale-110' : 'ring-1 ring-white/10 hover:scale-105'
                      }`} style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-[#7a7a7f]">Cor de Destaque</label>
                <div className="flex flex-wrap gap-1.5">
                  {ACCENT_PRESETS.map(c => (
                    <button key={c} onClick={() => setAccentColor(c)}
                      className={`w-6 h-6 rounded-full transition-all ${
                        accentColor === c ? 'ring-2 ring-white scale-110' : 'ring-1 ring-white/10 hover:scale-105'
                      }`} style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            </>
          ))}
        </div>
      )}
    </div>
  );
}
