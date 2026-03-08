"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import CanvasPreview, { type CanvasPreviewHandle } from './CanvasPreview';
import TemplateGallery from './TemplateGallery';
import { TEMPLATE_GALLERY } from '@/templates/gallery';
import type { TemplateCategory } from '@/types';
import {
  X, Download, Sparkles, Palette, Loader2,
  MessageSquare, GitCompare, Heart, Quote, Megaphone,
  BookOpen, BarChart3, Moon, ArrowLeft,
} from 'lucide-react';

interface PostCreationModalProps {
  open: boolean;
  onClose: () => void;
  profileName: string;
  profileHandle: string;
  avatarUrl?: string;
  userEmail?: string;
  initialTemplate?: string;
  initialTemplateData?: Record<string, any>;
}

const TEMPLATE_TYPES: { id: TemplateCategory; label: string; icon: React.ReactNode; description: string }[] = [
  { id: 'testimonial', label: 'Depoimento', icon: <MessageSquare className="w-5 h-5" />, description: 'Print de chat com headline' },
  { id: 'comparison', label: 'Comparacao', icon: <GitCompare className="w-5 h-5" />, description: 'Dois lados comparando' },
  { id: 'motivational', label: 'Motivacional', icon: <Heart className="w-5 h-5" />, description: 'Texto grande com destaques' },
  { id: 'quote', label: 'Quote / Post', icon: <Quote className="w-5 h-5" />, description: 'Estilo post de rede social' },
  { id: 'cta', label: 'CTA', icon: <Megaphone className="w-5 h-5" />, description: 'Chamada para acao' },
  { id: 'storytelling', label: 'Storytelling', icon: <BookOpen className="w-5 h-5" />, description: 'Texto narrativo + imagem' },
  { id: 'data-story', label: 'Dados', icon: <BarChart3 className="w-5 h-5" />, description: 'Headline + imagem + dados' },
  { id: 'dark-narrative', label: 'Narrativa Dark', icon: <Moon className="w-5 h-5" />, description: 'Imagem de fundo + texto' },
];

type ModalView = 'type-picker' | 'template-editor' | 'ai-generating';

export default function PostCreationModal({
  open, onClose,
  profileName, profileHandle, avatarUrl,
  userEmail,
  initialTemplate,
  initialTemplateData,
}: PostCreationModalProps) {
  const [view, setView] = useState<ModalView>('type-picker');
  const [selectedType, setSelectedType] = useState<TemplateCategory | null>(null);
  const [previewContent, setPreviewContent] = useState<React.ReactNode>(null);
  const [exporting, setExporting] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTemplate, setAiTemplate] = useState<string | null>(initialTemplate || null);
  const [aiData, setAiData] = useState<Record<string, any> | null>(initialTemplateData || null);
  const [aiError, setAiError] = useState<string | null>(null);
  const canvasRef = useRef<CanvasPreviewHandle>(null);

  // Auto-open template editor when initialTemplate/initialTemplateData change from parent
  useEffect(() => {
    if (open && initialTemplate && initialTemplateData) {
      setAiTemplate(initialTemplate);
      setAiData(initialTemplateData);
      const tmpl = TEMPLATE_GALLERY.find(t => t.id === initialTemplate);
      if (tmpl) setSelectedType(tmpl.category);
      setView('template-editor');
    }
  }, [open, initialTemplate, initialTemplateData]);

  const handleExport = useCallback(async () => {
    if (!canvasRef.current) return;
    setExporting(true);
    try {
      await canvasRef.current.exportPng(`post-${Date.now()}.png`);
    } finally {
      setExporting(false);
    }
  }, []);

  const handleRender = useCallback((element: React.ReactNode) => {
    setPreviewContent(element);
  }, []);

  const handleSelectType = useCallback((type: TemplateCategory) => {
    setSelectedType(type);
    setAiTemplate(null);
    setAiData(null);
    setView('template-editor');
  }, []);

  const handleAIGenerate = useCallback(async () => {
    if (!aiInput.trim()) return;
    setAiLoading(true);
    setAiError(null);
    setView('ai-generating');
    try {
      const res = await fetch('/api/chat-gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Crie um post visual para Instagram sobre: ${aiInput}`,
          userEmail: userEmail,
          context: { tipoPost: 'auto-post' },
        }),
      });
      const json = await res.json();
      if (json.error) {
        setAiError(json.error);
        setView('type-picker');
        return;
      }
      const reply = json.reply || json.message;
      if (reply) {
        try {
          const cleaned = reply.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          const parsed = JSON.parse(cleaned);
          if (parsed.template && parsed.templateData) {
            setAiTemplate(parsed.template);
            setAiData(parsed.templateData);
            // Find the template category to set selectedType
            const tmpl = TEMPLATE_GALLERY.find(t => t.id === parsed.template);
            if (tmpl) setSelectedType(tmpl.category);
            setView('template-editor');
            return;
          }
        } catch {
          // Not JSON, try to extract useful content
        }
      }
      setAiError('A IA nao conseguiu gerar o template. Tente descrever melhor o que voce quer.');
      setView('type-picker');
    } catch (err) {
      console.error('AI error:', err);
      setAiError('Erro de conexao. Tente novamente.');
      setView('type-picker');
    } finally {
      setAiLoading(false);
    }
  }, [aiInput, userEmail]);

  const handleBack = useCallback(() => {
    setView('type-picker');
    setSelectedType(null);
    setPreviewContent(null);
  }, []);

  const handleClose = useCallback(() => {
    setView('type-picker');
    setSelectedType(null);
    setPreviewContent(null);
    setAiTemplate(null);
    setAiData(null);
    setAiInput('');
    setAiError(null);
    onClose();
  }, [onClose]);

  if (!open) return null;

  // Get the template ID for the selected type
  const templateIdForType = selectedType
    ? TEMPLATE_GALLERY.find(t => t.category === selectedType)?.id
    : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full h-full md:w-[95vw] md:max-w-[1400px] md:h-[92vh] md:rounded-2xl bg-[#0f0f11] md:border md:border-white/[0.08] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] flex-shrink-0">
          <div className="flex items-center gap-3">
            {view !== 'type-picker' && (
              <button onClick={handleBack} className="p-1.5 rounded-lg text-[#5a5a5f] hover:text-white hover:bg-white/5 transition-all">
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-400 flex items-center justify-center">
              <Palette className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-sm text-white">
              {view === 'type-picker' ? 'Criar Post' : view === 'ai-generating' ? 'IA gerando...' : `Editando: ${TEMPLATE_TYPES.find(t => t.id === selectedType)?.label || 'Template'}`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {view === 'template-editor' && (
              <button
                onClick={handleExport}
                disabled={exporting || !previewContent}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors disabled:opacity-40"
              >
                {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">Exportar PNG</span>
              </button>
            )}
            <button onClick={handleClose} className="p-2 rounded-lg text-[#5a5a5f] hover:text-white hover:bg-white/5 transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        {view === 'type-picker' && (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10 space-y-8">
              {/* AI Auto section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-semibold text-[#7a7a7f] uppercase tracking-wider">Deixe a IA criar</span>
                </div>
                <div className="relative">
                  <textarea
                    value={aiInput}
                    onChange={e => setAiInput(e.target.value)}
                    rows={3}
                    placeholder="Descreva o post que voce quer... Ex: Post comparando medico plantonista vs empreendedor com dados de faturamento"
                    className="w-full px-4 py-3 bg-[#151518] border border-white/[0.08] rounded-xl text-sm text-white placeholder-[#3a3a3f] focus:outline-none focus:border-purple-500/40 transition-colors resize-none"
                  />
                  <button
                    onClick={handleAIGenerate}
                    disabled={aiLoading || !aiInput.trim()}
                    className="absolute bottom-3 right-3 flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-xs font-medium transition-all disabled:opacity-40"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Gerar com IA
                  </button>
                </div>
                {aiError && (
                  <p className="text-xs text-red-400 px-1">{aiError}</p>
                )}
                {/* Quick examples */}
                <div className="flex flex-wrap gap-2">
                  {[
                    'Post comparando plantonista vs empreendedor',
                    'Depoimento de mentorada que faturou 30k',
                    'Post motivacional sobre mudanca na medicina',
                    'Storytelling com dados do IBGE sobre empresas',
                  ].map((ex, i) => (
                    <button
                      key={i}
                      onClick={() => setAiInput(ex)}
                      className="px-3 py-1.5 rounded-full bg-[#151518] text-[11px] text-[#5a5a5f] hover:text-white hover:bg-[#1a1a1e] border border-white/[0.04] transition-all"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-white/[0.06]" />
                <span className="text-[11px] text-[#3a3a3f] font-medium">ou escolha o tipo</span>
                <div className="flex-1 h-px bg-white/[0.06]" />
              </div>

              {/* Template type grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {TEMPLATE_TYPES.map(type => (
                  <button
                    key={type.id}
                    onClick={() => handleSelectType(type.id)}
                    className="flex flex-col items-center gap-2.5 p-4 sm:p-5 rounded-xl bg-[#151518] border border-white/[0.04] hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all group text-center"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#1a1a1e] group-hover:bg-emerald-500/15 flex items-center justify-center text-[#5a5a5f] group-hover:text-emerald-400 transition-all">
                      {type.icon}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">{type.label}</div>
                      <div className="text-[10px] text-[#4a4a4f] mt-0.5 hidden sm:block">{type.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {view === 'ai-generating' && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="relative mx-auto w-16 h-16">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 blur-xl" />
                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-white animate-pulse" />
                </div>
              </div>
              <div>
                <p className="text-white font-semibold">IA criando seu post...</p>
                <p className="text-[#5a5a5f] text-sm mt-1">Escolhendo template e gerando conteudo</p>
              </div>
              <Loader2 className="w-5 h-5 text-purple-400 animate-spin mx-auto" />
            </div>
          </div>
        )}

        {view === 'template-editor' && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Left panel - Controls */}
            <div className="md:w-[400px] flex-shrink-0 md:border-r border-b md:border-b-0 border-white/[0.06] overflow-y-auto max-h-[40vh] md:max-h-none">
              <TemplateGallery
                profileName={profileName}
                profileHandle={profileHandle}
                avatarUrl={avatarUrl}
                onRender={handleRender}
                initialTemplate={aiTemplate || templateIdForType}
                initialData={aiData || undefined}
                filterCategory={selectedType || undefined}
              />
            </div>

            {/* Right panel - Preview */}
            <CanvasPreview ref={canvasRef} className="flex-1 p-3 sm:p-4 md:p-6 min-h-[50vh] md:min-h-0">
              {previewContent || (
                <div style={{
                  width: '1080px', height: '1080px', background: '#111',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'sans-serif', color: '#555', fontSize: '24px',
                }}>
                  Selecione um template para comecar
                </div>
              )}
            </CanvasPreview>
          </div>
        )}
      </div>
    </div>
  );
}
