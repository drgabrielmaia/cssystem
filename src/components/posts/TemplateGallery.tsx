"use client";

import React, { useState, useCallback, useRef } from 'react';
import { TEMPLATE_GALLERY } from '@/templates/gallery';
import type { TemplateDefinition, TemplateRenderProps, TemplateCategory } from '@/types';
import {
  MessageSquare, GitCompare, Heart, Quote, Megaphone, BookOpen, BarChart3, Moon,
  X, Plus, Trash2, Upload, ImageIcon, Type, AlignLeft, Palette as PaletteIcon,
  List, MessageCircle, Highlighter, ChevronDown, Bold, Minus,
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

// Visual field type icons for clarity
const FIELD_TYPE_ICONS: Record<string, React.ReactNode> = {
  text: <Type className="w-3 h-3" />,
  textarea: <AlignLeft className="w-3 h-3" />,
  color: <PaletteIcon className="w-3 h-3" />,
  image: <ImageIcon className="w-3 h-3" />,
  select: <ChevronDown className="w-3 h-3" />,
  highlights: <Highlighter className="w-3 h-3" />,
  'chat-messages': <MessageCircle className="w-3 h-3" />,
  list: <List className="w-3 h-3" />,
};

// Friendly descriptions for fields
const FIELD_HINTS: Record<string, string> = {
  headline: 'O titulo principal que chama atencao',
  highlightWord: 'Palavra que fica em cor diferente',
  bodyText: 'O texto narrativo do post',
  highlightText: 'Texto que recebe destaque visual',
  footerText: 'Frase de impacto no rodape',
  imageUrl: 'Arraste ou clique para enviar',
  leftImageUrl: 'Imagem do lado esquerdo',
  rightImageUrl: 'Imagem do lado direito',
  chatMessages: 'Adicione mensagens do WhatsApp',
  leftItems: 'Lista de pontos do lado esquerdo',
  rightItems: 'Lista de pontos do lado direito',
  midText: 'Texto em destaque no centro',
  midSubtext: 'Explicacao abaixo do destaque',
  statNumber: 'Ex: 737 mil, 60%, R$30k',
  sourceText: 'De onde veio esse dado',
  tweetText: 'O texto do seu post',
  subtext: 'Texto explicativo abaixo do titulo',
  engagementPrompt: 'Ex: Comente EU QUERO',
  ctaButtonText: 'Texto dentro do botao',
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

// Helper: convert file to base64 data URL
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

  // Font overrides per field
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

  // Group fields into sections for better UX
  const getFieldSections = (fields: TemplateDefinition['fields']) => {
    const textFields = fields.filter(f => f.type === 'text' || f.type === 'textarea' || f.type === 'select');
    const imageFields = fields.filter(f => f.type === 'image');
    const listFields = fields.filter(f => f.type === 'list' || f.type === 'highlights' || f.type === 'chat-messages');
    const colorFields = fields.filter(f => f.type === 'color');

    const sections: { title: string; icon: React.ReactNode; fields: typeof fields }[] = [];

    if (textFields.length > 0) {
      sections.push({ title: 'Textos', icon: <Type className="w-3.5 h-3.5" />, fields: textFields });
    }
    if (imageFields.length > 0) {
      sections.push({ title: 'Imagens', icon: <ImageIcon className="w-3.5 h-3.5" />, fields: imageFields });
    }
    if (listFields.length > 0) {
      sections.push({ title: 'Listas & Detalhes', icon: <List className="w-3.5 h-3.5" />, fields: listFields });
    }
    if (colorFields.length > 0) {
      sections.push({ title: 'Cores', icon: <PaletteIcon className="w-3.5 h-3.5" />, fields: colorFields });
    }

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
          className="w-full px-3 py-2.5 bg-[#1a1a1e] border border-white/[0.06] rounded-xl text-[13px] text-white placeholder-[#3a3a3f] focus:outline-none focus:border-emerald-500/40 transition-colors"
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
          className="w-full px-3 py-2.5 bg-[#1a1a1e] border border-white/[0.06] rounded-xl text-[13px] text-white placeholder-[#3a3a3f] focus:outline-none focus:border-emerald-500/40 resize-none transition-colors"
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
            className="w-9 h-9 rounded-xl cursor-pointer bg-transparent border-0"
          />
          <input
            value={value || ''}
            onChange={e => updateField(field.key, e.target.value)}
            placeholder="#HEXCOLOR"
            className="flex-1 px-2.5 py-2 bg-[#1a1a1e] border border-white/[0.06] rounded-xl text-[11px] text-white placeholder-[#3a3a3f] focus:outline-none"
          />
        </div>
      );
    }

    if (field.type === 'select') {
      return (
        <select
          value={value || ''}
          onChange={e => updateField(field.key, e.target.value)}
          className="w-full px-3 py-2.5 bg-[#1a1a1e] border border-white/[0.06] rounded-xl text-[13px] text-white focus:outline-none focus:border-emerald-500/40"
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
            <div key={i} className="flex items-center gap-2 p-2 bg-[#151518] rounded-xl">
              <input
                value={h.word}
                onChange={e => {
                  const next = [...highlights];
                  next[i] = { ...next[i], word: e.target.value };
                  updateField(field.key, next);
                }}
                placeholder="Palavra a destacar"
                className="flex-1 px-2.5 py-1.5 bg-[#1a1a1e] border border-white/[0.06] rounded-lg text-[11px] text-white placeholder-[#3a3a3f] focus:outline-none"
              />
              <input
                type="color"
                value={h.color}
                onChange={e => {
                  const next = [...highlights];
                  next[i] = { ...next[i], color: e.target.value };
                  updateField(field.key, next);
                }}
                className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0 flex-shrink-0"
              />
              <button onClick={() => {
                updateField(field.key, highlights.filter((_: any, j: number) => j !== i));
              }} className="p-1 text-red-400/60 hover:text-red-300 flex-shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <button onClick={() => updateField(field.key, [...highlights, { word: '', color: accentColor }])}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#151518] text-[11px] text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/5 transition-all w-full justify-center border border-dashed border-white/[0.06]">
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
            <div key={i} className="p-2.5 bg-[#151518] rounded-xl space-y-2">
              <div className="flex items-center gap-2">
                <input
                  value={msg.senderName || ''}
                  onChange={e => {
                    const next = [...messages];
                    next[i] = { ...next[i], senderName: e.target.value };
                    updateField(field.key, next);
                  }}
                  placeholder="Nome do remetente"
                  className="flex-1 px-2.5 py-1.5 bg-[#1a1a1e] border border-white/[0.06] rounded-lg text-[10px] text-white placeholder-[#3a3a3f] focus:outline-none"
                />
                <button onClick={() => updateField(field.key, messages.filter((_: any, j: number) => j !== i))}
                  className="p-1 text-red-400/60 hover:text-red-300 flex-shrink-0">
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
                className="w-full px-2.5 py-1.5 bg-[#1a1a1e] border border-white/[0.06] rounded-lg text-[11px] text-white placeholder-[#3a3a3f] focus:outline-none resize-none"
              />
            </div>
          ))}
          <button onClick={() => updateField(field.key, [...messages, { text: '', isUser: false, senderName: '', senderTag: '' }])}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#151518] text-[11px] text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/5 transition-all w-full justify-center border border-dashed border-white/[0.06]">
            <Plus className="w-3.5 h-3.5" /> Adicionar mensagem
          </button>
        </div>
      );
    }

    if (field.type === 'image') {
      const hasImage = value && value.length > 0;
      return (
        <div>
          {/* Image preview */}
          {hasImage && (
            <div className="relative mb-2 rounded-xl overflow-hidden bg-[#151518]">
              <img src={value} alt="" className="w-full h-32 object-cover" onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }} />
              <button
                onClick={() => updateField(field.key, '')}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center hover:bg-red-500/80 transition-colors"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          )}
          {/* Upload area */}
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={e => handleDrop(field.key, e)}
            onClick={() => imageInputRefs.current[field.key]?.click()}
            className={`flex flex-col items-center gap-2 px-4 py-4 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
              hasImage
                ? 'border-white/[0.06] hover:border-emerald-500/30 bg-[#0d0d0f]'
                : 'border-white/[0.08] hover:border-emerald-500/40 bg-[#151518] hover:bg-emerald-500/[0.03]'
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-[#1a1a1e] flex items-center justify-center">
              <Upload className="w-4 h-4 text-[#5a5a5f]" />
            </div>
            <div className="text-center">
              <p className="text-[11px] text-[#7a7a7f] font-medium">
                {hasImage ? 'Trocar imagem' : 'Clique ou arraste uma imagem'}
              </p>
              <p className="text-[10px] text-[#3a3a3f] mt-0.5">PNG, JPG ou WEBP</p>
            </div>
            <input
              ref={el => { imageInputRefs.current[field.key] = el; }}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(field.key, file);
                e.target.value = '';
              }}
            />
          </div>
          {/* URL input as fallback */}
          <input
            value={value?.startsWith('data:') ? '' : (value || '')}
            onChange={e => updateField(field.key, e.target.value)}
            placeholder="ou cole a URL da imagem"
            className="w-full mt-2 px-3 py-1.5 bg-[#0d0d0f] border border-white/[0.04] rounded-lg text-[11px] text-[#5a5a5f] placeholder-[#2a2a2f] focus:outline-none focus:border-emerald-500/30 focus:text-white transition-colors"
          />
        </div>
      );
    }

    if (field.type === 'list') {
      const items: string[] = value || [];
      return (
        <div className="space-y-2">
          {items.map((item: string, i: number) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[9px] text-[#3a3a3f] font-mono w-4 text-right flex-shrink-0">{i + 1}.</span>
              <input
                value={item}
                onChange={e => {
                  const next = [...items];
                  next[i] = e.target.value;
                  updateField(field.key, next);
                }}
                placeholder={field.placeholder || 'Item'}
                className="flex-1 px-2.5 py-2 bg-[#1a1a1e] border border-white/[0.06] rounded-xl text-[12px] text-white placeholder-[#3a3a3f] focus:outline-none focus:border-emerald-500/30 transition-colors"
              />
              <button onClick={() => updateField(field.key, items.filter((_: string, j: number) => j !== i))}
                className="p-1 text-red-400/50 hover:text-red-300 flex-shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <button onClick={() => updateField(field.key, [...items, ''])}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#151518] text-[11px] text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/5 transition-all w-full justify-center border border-dashed border-white/[0.06]">
            <Plus className="w-3.5 h-3.5" /> Adicionar item
          </button>
        </div>
      );
    }

    return null;
  };

  // Mini font toolbar for text/textarea fields
  const renderFontControls = (fieldKey: string) => {
    const fs = getFontSettings(fieldKey);
    const WEIGHTS = [
      { value: 400, label: 'Regular' },
      { value: 700, label: 'Bold' },
      { value: 900, label: 'Extra Bold' },
    ];
    return (
      <div className="flex items-center gap-1 mt-1 flex-wrap">
        {/* Weight */}
        <div className="flex items-center bg-[#151518] rounded-lg overflow-hidden border border-white/[0.04]">
          {WEIGHTS.map(w => (
            <button
              key={w.value}
              onClick={() => updateFontSetting(fieldKey, 'weight', w.value)}
              className={`px-2 py-1 text-[9px] transition-all ${
                (fs.weight || 400) === w.value
                  ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                  : 'text-[#5a5a5f] hover:text-white hover:bg-white/5'
              }`}
              title={w.label}
            >
              {w.label === 'Regular' ? 'Aa' : w.label === 'Bold' ? <span className="font-bold">Aa</span> : <span className="font-black">Aa</span>}
            </button>
          ))}
        </div>

        {/* Size */}
        <div className="flex items-center gap-0.5 bg-[#151518] rounded-lg border border-white/[0.04]">
          <button
            onClick={() => updateFontSetting(fieldKey, 'size', Math.max(12, (fs.size || 0) - 4))}
            className="p-1 text-[#5a5a5f] hover:text-white transition-all"
            title="Diminuir"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="text-[9px] text-[#7a7a7f] min-w-[24px] text-center font-mono">
            {fs.size || 'Auto'}
          </span>
          <button
            onClick={() => updateFontSetting(fieldKey, 'size', (fs.size || 32) + 4)}
            className="p-1 text-[#5a5a5f] hover:text-white transition-all"
            title="Aumentar"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {/* Text color */}
        <div className="flex items-center bg-[#151518] rounded-lg border border-white/[0.04] px-1">
          <span className="text-[9px] text-[#5a5a5f] mr-1">A</span>
          <input
            type="color"
            value={fs.color || '#FFFFFF'}
            onChange={e => updateFontSetting(fieldKey, 'color', e.target.value)}
            className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
            title="Cor do texto"
          />
        </div>

        {/* Highlight / marker */}
        <div className="flex items-center bg-[#151518] rounded-lg border border-white/[0.04] px-1">
          <Highlighter className="w-3 h-3 text-[#5a5a5f] mr-1" />
          <input
            type="color"
            value={fs.highlight || '#00000000'}
            onChange={e => updateFontSetting(fieldKey, 'highlight', e.target.value)}
            className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
            title="Marca-texto"
          />
          {fs.highlight && (
            <button
              onClick={() => updateFontSetting(fieldKey, 'highlight', '')}
              className="ml-0.5 text-[#5a5a5f] hover:text-red-400"
              title="Remover marca-texto"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          )}
        </div>

        {/* Reset */}
        {(fs.weight || fs.size || fs.color || fs.highlight) && (
          <button
            onClick={() => {
              setFormData(prev => {
                const fonts = { ...(prev._fonts || {}) };
                delete fonts[fieldKey];
                return { ...prev, _fonts: fonts };
              });
            }}
            className="px-1.5 py-1 text-[9px] text-[#5a5a5f] hover:text-red-300 transition-all"
            title="Resetar fonte"
          >
            Reset
          </button>
        )}
      </div>
    );
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
        /* Template customization - grouped by sections */
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Back button + template name */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedTemplate(null)}
              className="p-1.5 rounded-lg bg-[#1a1a1e] text-[#5a5a5f] hover:text-white transition-all flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-6 h-6 rounded-md bg-emerald-500/15 flex items-center justify-center text-emerald-400 flex-shrink-0">
                {CATEGORY_ICONS[selectedTemplate.category]}
              </div>
              <span className="text-sm font-semibold text-white truncate">{selectedTemplate.name}</span>
            </div>
          </div>

          {/* Grouped fields by section */}
          {getFieldSections(selectedTemplate.fields).map((section, si) => (
            <div key={si} className="space-y-3">
              {/* Section header */}
              <div className="flex items-center gap-2 pt-1">
                <div className="w-5 h-5 rounded-md bg-white/[0.04] flex items-center justify-center text-[#5a5a5f]">
                  {section.icon}
                </div>
                <span className="text-[11px] font-semibold text-[#5a5a5f] uppercase tracking-wider">{section.title}</span>
                <div className="flex-1 h-px bg-white/[0.04]" />
              </div>

              {/* Section fields */}
              {section.fields.map(field => (
                <div key={field.key} className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#5a5a5f]">{FIELD_TYPE_ICONS[field.type]}</span>
                    <label className="text-[11px] font-semibold text-[#7a7a7f]">
                      {field.label}
                      {field.required && <span className="text-red-400 ml-0.5">*</span>}
                    </label>
                  </div>
                  {FIELD_HINTS[field.key] && (
                    <p className="text-[10px] text-[#3a3a3f] -mt-0.5 ml-5">{FIELD_HINTS[field.key]}</p>
                  )}
                  {renderFieldInput(field)}
                  {(field.type === 'text' || field.type === 'textarea') && renderFontControls(field.key)}
                </div>
              ))}
            </div>
          ))}

          {/* Appearance section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pt-1">
              <div className="w-5 h-5 rounded-md bg-white/[0.04] flex items-center justify-center text-[#5a5a5f]">
                <PaletteIcon className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-semibold text-[#5a5a5f] uppercase tracking-wider">Aparencia</span>
              <div className="flex-1 h-px bg-white/[0.04]" />
            </div>

            {/* Background color */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[#7a7a7f] ml-5">Cor de Fundo</label>
              <div className="flex flex-wrap gap-1.5 ml-5">
                {BG_PRESETS.map(c => (
                  <button key={c} onClick={() => setBgColor(c)}
                    className={`w-7 h-7 rounded-lg transition-all ${
                      bgColor === c ? 'ring-2 ring-emerald-400 scale-110' : 'ring-1 ring-white/10 hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
            </div>

            {/* Accent color */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[#7a7a7f] ml-5">Cor de Destaque</label>
              <div className="flex flex-wrap gap-1.5 ml-5">
                {ACCENT_PRESETS.map(c => (
                  <button key={c} onClick={() => setAccentColor(c)}
                    className={`w-6 h-6 rounded-full transition-all ${
                      accentColor === c ? 'ring-2 ring-white scale-110' : 'ring-1 ring-white/10 hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
