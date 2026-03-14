"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import CanvasPreview, { type CanvasPreviewHandle } from './CanvasPreview';
import TemplateGallery from './TemplateGallery';
import { TEMPLATE_GALLERY } from '@/templates/gallery';
import type { TemplateCategory } from '@/types';
import {
  X, Download, Sparkles, Palette, Loader2,
  MessageSquare, GitCompare, Heart, Quote, Megaphone,
  BookOpen, BarChart3, Moon, ArrowLeft, Plus, Trash2,
  ChevronLeft, ChevronRight, Copy,
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
  initialPages?: Array<{ template: string; templateData: Record<string, any> }>;
}

interface CarouselPage {
  templateId: string;
  data: Record<string, any>;
  bgColor: string;
  accentColor: string;
}

const TEMPLATE_TYPES: { id: TemplateCategory; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: 'testimonial', label: 'Depoimento', icon: <MessageSquare className="w-4 h-4" />, desc: 'Chat + headline' },
  { id: 'comparison', label: 'Comparacao', icon: <GitCompare className="w-4 h-4" />, desc: '2 lados' },
  { id: 'motivational', label: 'Motivacional', icon: <Heart className="w-4 h-4" />, desc: 'Texto grande' },
  { id: 'quote', label: 'Quote', icon: <Quote className="w-4 h-4" />, desc: 'Post social' },
  { id: 'cta', label: 'CTA', icon: <Megaphone className="w-4 h-4" />, desc: 'Chamada' },
  { id: 'storytelling', label: 'Story', icon: <BookOpen className="w-4 h-4" />, desc: 'Narrativa' },
  { id: 'data-story', label: 'Dados', icon: <BarChart3 className="w-4 h-4" />, desc: 'Estatistica' },
  { id: 'dark-narrative', label: 'Dark', icon: <Moon className="w-4 h-4" />, desc: 'Imagem + texto' },
  { id: 'editorial-slide', label: 'Slide', icon: <ChevronRight className="w-4 h-4" />, desc: 'Foto + contador' },
  { id: 'cover-overlay', label: 'Cover', icon: <Sparkles className="w-4 h-4" />, desc: 'Capa impactante' },
  { id: 'pure-editorial', label: 'Editorial', icon: <Copy className="w-4 h-4" />, desc: 'Estilo jornal' },
];

type ModalView = 'type-picker' | 'template-editor' | 'ai-generating';

export default function PostCreationModal({
  open, onClose,
  profileName, profileHandle, avatarUrl,
  userEmail,
  initialTemplate,
  initialTemplateData,
  initialPages,
}: PostCreationModalProps) {
  const [view, setView] = useState<ModalView>('type-picker');
  const [previewContent, setPreviewContent] = useState<React.ReactNode>(null);
  const [exporting, setExporting] = useState(false);
  const [exportingAll, setExportingAll] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const canvasRef = useRef<CanvasPreviewHandle>(null);

  // Carousel pages
  const [pages, setPages] = useState<CarouselPage[]>([]);
  const [currentPageIdx, setCurrentPageIdx] = useState(0);
  const [addingPage, setAddingPage] = useState(false);

  // Track current page data from TemplateGallery
  const latestPageData = useRef<Partial<CarouselPage>>({});

  // Initialize from props
  useEffect(() => {
    if (!open) return;

    if (initialPages && initialPages.length > 0) {
      // Multi-page carousel from AI
      const newPages: CarouselPage[] = initialPages.map(slide => ({
        templateId: slide.template,
        data: slide.templateData || {},
        bgColor: '#052E16',
        accentColor: '#C5A55A',
      }));
      setPages(newPages);
      setCurrentPageIdx(0);
      setView('template-editor');
      setAddingPage(false);
    } else if (initialTemplate && initialTemplateData) {
      // Single page from AI
      setPages([{
        templateId: initialTemplate,
        data: initialTemplateData,
        bgColor: '#052E16',
        accentColor: '#C5A55A',
      }]);
      setCurrentPageIdx(0);
      setView('template-editor');
      setAddingPage(false);
    }
  }, [open, initialTemplate, initialTemplateData, initialPages]);

  // Save current page data before switching
  const saveCurrentPage = useCallback(() => {
    const d = latestPageData.current;
    if (d.templateId && pages.length > 0) {
      setPages(prev => {
        const next = [...prev];
        if (next[currentPageIdx]) {
          next[currentPageIdx] = {
            templateId: d.templateId || next[currentPageIdx].templateId,
            data: d.data || next[currentPageIdx].data,
            bgColor: d.bgColor || next[currentPageIdx].bgColor,
            accentColor: d.accentColor || next[currentPageIdx].accentColor,
          };
        }
        return next;
      });
    }
  }, [currentPageIdx, pages.length]);

  const handlePageDataChange = useCallback((data: { templateId: string; formData: Record<string, any>; bgColor: string; accentColor: string }) => {
    latestPageData.current = {
      templateId: data.templateId,
      data: data.formData,
      bgColor: data.bgColor,
      accentColor: data.accentColor,
    };
    // Auto-save to pages array
    setPages(prev => {
      const next = [...prev];
      if (next[currentPageIdx]) {
        next[currentPageIdx] = {
          templateId: data.templateId,
          data: data.formData,
          bgColor: data.bgColor,
          accentColor: data.accentColor,
        };
      }
      return next;
    });
  }, [currentPageIdx]);

  const switchToPage = useCallback((idx: number) => {
    if (idx === currentPageIdx) return;
    saveCurrentPage();
    setCurrentPageIdx(idx);
    setAddingPage(false);
  }, [currentPageIdx, saveCurrentPage]);

  const handleAddPage = useCallback((templateId?: string) => {
    saveCurrentPage();
    const tmpl = templateId
      ? TEMPLATE_GALLERY.find(t => t.id === templateId)
      : null;

    const newPage: CarouselPage = {
      templateId: tmpl?.id || 'motivational',
      data: tmpl ? { ...tmpl.defaultValues } : {},
      bgColor: pages[currentPageIdx]?.bgColor || '#052E16',
      accentColor: pages[currentPageIdx]?.accentColor || '#C5A55A',
    };

    setPages(prev => [...prev, newPage]);
    setCurrentPageIdx(pages.length);
    setAddingPage(false);
  }, [pages, currentPageIdx, saveCurrentPage]);

  const handleDuplicatePage = useCallback(() => {
    saveCurrentPage();
    const current = pages[currentPageIdx];
    if (!current) return;
    const dup: CarouselPage = {
      ...current,
      data: { ...current.data },
    };
    const newPages = [...pages];
    newPages.splice(currentPageIdx + 1, 0, dup);
    setPages(newPages);
    setCurrentPageIdx(currentPageIdx + 1);
  }, [pages, currentPageIdx, saveCurrentPage]);

  const handleDeletePage = useCallback(() => {
    if (pages.length <= 1) return;
    const newPages = pages.filter((_, i) => i !== currentPageIdx);
    setPages(newPages);
    setCurrentPageIdx(Math.min(currentPageIdx, newPages.length - 1));
  }, [pages, currentPageIdx]);

  const handleExport = useCallback(async () => {
    if (!canvasRef.current) return;
    setExporting(true);
    try {
      const suffix = pages.length > 1 ? `-pagina${currentPageIdx + 1}` : '';
      await canvasRef.current.exportPng(`post${suffix}-${Date.now()}.png`);
    } finally {
      setExporting(false);
    }
  }, [currentPageIdx, pages.length]);

  const handleExportAll = useCallback(async () => {
    if (!canvasRef.current || pages.length <= 1) return;
    setExportingAll(true);
    try {
      // Export current page first (it's already rendered)
      await canvasRef.current.exportPng(`post-pagina${currentPageIdx + 1}-${Date.now()}.png`);

      // For other pages, we need to switch, render, export, then switch back
      for (let i = 0; i < pages.length; i++) {
        if (i === currentPageIdx) continue;
        // Brief delay to let render happen
        setCurrentPageIdx(i);
        await new Promise(r => setTimeout(r, 500));
        await canvasRef.current.exportPng(`post-pagina${i + 1}-${Date.now()}.png`);
      }
      // Switch back
      setCurrentPageIdx(currentPageIdx);
    } finally {
      setExportingAll(false);
    }
  }, [pages, currentPageIdx]);

  const handleRender = useCallback((element: React.ReactNode) => {
    setPreviewContent(element);
  }, []);

  const handleSelectType = useCallback((type: TemplateCategory) => {
    const tmpl = TEMPLATE_GALLERY.find(t => t.category === type);
    if (!tmpl) return;

    if (pages.length === 0) {
      // First page
      setPages([{
        templateId: tmpl.id,
        data: { ...tmpl.defaultValues },
        bgColor: '#052E16',
        accentColor: '#C5A55A',
      }]);
      setCurrentPageIdx(0);
    } else {
      // Adding new page from picker
      handleAddPage(tmpl.id);
    }
    setView('template-editor');
    setAddingPage(false);
  }, [pages.length, handleAddPage]);

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

          if (parsed.carousel && Array.isArray(parsed.slides) && parsed.slides.length > 0) {
            const newPages: CarouselPage[] = parsed.slides.map((slide: any) => ({
              templateId: slide.template,
              data: slide.templateData || {},
              bgColor: parsed.suggestedBackground || '#052E16',
              accentColor: parsed.suggestedAccentColor || '#C5A55A',
            }));
            setPages(newPages);
            setCurrentPageIdx(0);
            setView('template-editor');
            return;
          } else if (parsed.template && parsed.templateData) {
            setPages([{
              templateId: parsed.template,
              data: parsed.templateData,
              bgColor: parsed.suggestedBackground || '#052E16',
              accentColor: parsed.suggestedAccentColor || '#C5A55A',
            }]);
            setCurrentPageIdx(0);
            setView('template-editor');
            return;
          }
        } catch {
          // Not JSON
        }
      }
      setAiError('A IA nao conseguiu gerar o template. Tente descrever melhor.');
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
    if (addingPage) {
      setAddingPage(false);
      return;
    }
    setView('type-picker');
    setPages([]);
    setCurrentPageIdx(0);
    setPreviewContent(null);
  }, [addingPage]);

  const handleClose = useCallback(() => {
    setView('type-picker');
    setPages([]);
    setCurrentPageIdx(0);
    setPreviewContent(null);
    setAiInput('');
    setAiError(null);
    setAddingPage(false);
    onClose();
  }, [onClose]);

  if (!open) return null;

  const currentPage = pages[currentPageIdx] || null;
  const totalPages = pages.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full h-full md:w-[95vw] md:max-w-[1400px] md:h-[92vh] md:rounded-2xl bg-[#0f0f11] md:border md:border-white/[0.08] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] flex-shrink-0">
          <div className="flex items-center gap-2">
            {view !== 'type-picker' && (
              <button onClick={handleBack} className="p-1.5 rounded-lg text-[#5a5a5f] hover:text-white hover:bg-white/5 transition-all">
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-400 flex items-center justify-center">
              <Palette className="w-3 h-3 text-white" />
            </div>
            <span className="font-semibold text-sm text-white">
              {view === 'type-picker' ? 'Criar Post' : view === 'ai-generating' ? 'IA gerando...' : (
                totalPages > 1 ? `Carrossel (${currentPageIdx + 1}/${totalPages})` : 'Editor'
              )}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {view === 'template-editor' && (
              <>
                {totalPages > 1 && (
                  <button
                    onClick={handleExportAll}
                    disabled={exportingAll || !previewContent}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-medium transition-colors disabled:opacity-40"
                  >
                    {exportingAll ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                    <span className="hidden sm:inline">Exportar Todas ({totalPages})</span>
                  </button>
                )}
                <button
                  onClick={handleExport}
                  disabled={exporting || !previewContent}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-medium transition-colors disabled:opacity-40"
                >
                  {exporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                  <span className="hidden sm:inline">{totalPages > 1 ? `Pagina ${currentPageIdx + 1}` : 'Exportar PNG'}</span>
                </button>
              </>
            )}
            <button onClick={handleClose} className="p-1.5 rounded-lg text-[#5a5a5f] hover:text-white hover:bg-white/5 transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        {view === 'type-picker' && (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8 space-y-6">
              {/* AI Auto section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-semibold text-[#7a7a7f] uppercase tracking-wider">IA cria pra voce</span>
                </div>
                <div className="relative">
                  <textarea
                    value={aiInput}
                    onChange={e => setAiInput(e.target.value)}
                    rows={2}
                    placeholder="Ex: Carrossel sobre dia das mulheres na medicina, 4 paginas"
                    className="w-full px-4 py-3 bg-[#151518] border border-white/[0.08] rounded-xl text-sm text-white placeholder-[#3a3a3f] focus:outline-none focus:border-purple-500/40 transition-colors resize-none"
                  />
                  <button
                    onClick={handleAIGenerate}
                    disabled={aiLoading || !aiInput.trim()}
                    className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-[11px] font-medium transition-all disabled:opacity-40"
                  >
                    <Sparkles className="w-3 h-3" />
                    Gerar
                  </button>
                </div>
                {aiError && <p className="text-xs text-red-400 px-1">{aiError}</p>}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Carrossel comparando plantonista vs empreendedor, 4 paginas',
                    'Post motivacional sobre mudanca na medicina',
                    'Depoimento de mentorada que faturou 30k',
                  ].map((ex, i) => (
                    <button
                      key={i}
                      onClick={() => setAiInput(ex)}
                      className="px-2.5 py-1 rounded-full bg-[#151518] text-[10px] text-[#5a5a5f] hover:text-white hover:bg-[#1a1a1e] border border-white/[0.04] transition-all"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-white/[0.06]" />
                <span className="text-[10px] text-[#3a3a3f] font-medium">ou escolha o tipo</span>
                <div className="flex-1 h-px bg-white/[0.06]" />
              </div>

              {/* Template type grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {TEMPLATE_TYPES.map(type => (
                  <button
                    key={type.id}
                    onClick={() => handleSelectType(type.id)}
                    className="flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl bg-[#151518] border border-white/[0.04] hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all group text-center"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#1a1a1e] group-hover:bg-emerald-500/15 flex items-center justify-center text-[#5a5a5f] group-hover:text-emerald-400 transition-all">
                      {type.icon}
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold text-white">{type.label}</div>
                      <div className="text-[9px] text-[#4a4a4f] mt-0.5">{type.desc}</div>
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
              <div className="relative mx-auto w-14 h-14">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 blur-xl" />
                <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                  <Sparkles className="w-7 h-7 text-white animate-pulse" />
                </div>
              </div>
              <div>
                <p className="text-white font-semibold text-sm">IA criando seu post...</p>
                <p className="text-[#5a5a5f] text-xs mt-1">Escolhendo templates e gerando conteudo</p>
              </div>
              <Loader2 className="w-5 h-5 text-purple-400 animate-spin mx-auto" />
            </div>
          </div>
        )}

        {view === 'template-editor' && currentPage && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Left panel - Controls */}
              <div className="md:w-[380px] flex-shrink-0 md:border-r border-b md:border-b-0 border-white/[0.06] overflow-y-auto max-h-[40vh] md:max-h-none">
                {addingPage ? (
                  // Template picker for new page
                  <div className="p-4 space-y-3">
                    <p className="text-xs text-[#7a7a7f] font-semibold">Escolha o template da nova pagina:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {TEMPLATE_TYPES.map(type => {
                        const tmpl = TEMPLATE_GALLERY.find(t => t.category === type.id);
                        return (
                          <button
                            key={type.id}
                            onClick={() => tmpl && handleAddPage(tmpl.id)}
                            className="flex items-center gap-2 p-2.5 rounded-xl bg-[#151518] border border-white/[0.04] hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all text-left"
                          >
                            <div className="w-7 h-7 rounded-lg bg-[#1a1a1e] flex items-center justify-center text-emerald-400 flex-shrink-0">
                              {type.icon}
                            </div>
                            <div>
                              <div className="text-[11px] font-semibold text-white">{type.label}</div>
                              <div className="text-[9px] text-[#4a4a4f]">{type.desc}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <TemplateGallery
                    key={`page-${currentPageIdx}-${currentPage.templateId}`}
                    profileName={profileName}
                    profileHandle={profileHandle}
                    avatarUrl={avatarUrl}
                    onRender={handleRender}
                    initialTemplate={currentPage.templateId}
                    initialData={currentPage.data}
                    initialBgColor={currentPage.bgColor}
                    initialAccentColor={currentPage.accentColor}
                    onDataChange={handlePageDataChange}
                  />
                )}
              </div>

              {/* Right panel - Preview */}
              <CanvasPreview ref={canvasRef} className="flex-1 p-3 sm:p-4 md:p-6 min-h-[50vh] md:min-h-0">
                {previewContent || (
                  <div style={{
                    width: '1080px', height: '1080px', background: '#111',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'sans-serif', color: '#555', fontSize: '24px',
                  }}>
                    Selecione um template
                  </div>
                )}
              </CanvasPreview>
            </div>

            {/* Page strip (carousel navigation) */}
            <div className="flex-shrink-0 border-t border-white/[0.06] bg-[#0c0c0e] px-3 py-2">
              <div className="flex items-center gap-2 overflow-x-auto">
                {/* Page navigation */}
                {pages.map((page, idx) => {
                  const tmplDef = TEMPLATE_GALLERY.find(t => t.id === page.templateId);
                  const typeInfo = TEMPLATE_TYPES.find(t => t.id === tmplDef?.category);
                  return (
                    <button
                      key={idx}
                      onClick={() => switchToPage(idx)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all flex-shrink-0 ${
                        idx === currentPageIdx
                          ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30'
                          : 'bg-[#151518] text-[#6a6a6f] hover:text-white hover:bg-[#1a1a1e] border border-white/[0.04]'
                      }`}
                    >
                      <span className="w-4 h-4 rounded bg-white/10 flex items-center justify-center text-[9px] font-bold">
                        {idx + 1}
                      </span>
                      {typeInfo?.label || 'Pagina'}
                    </button>
                  );
                })}

                {/* Add page */}
                <button
                  onClick={() => setAddingPage(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#151518] text-[11px] text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/5 border border-dashed border-white/[0.08] transition-all flex-shrink-0"
                >
                  <Plus className="w-3 h-3" />
                  Pagina
                </button>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Page actions */}
                {totalPages > 0 && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={handleDuplicatePage}
                      className="p-1.5 rounded-lg text-[#5a5a5f] hover:text-white hover:bg-white/5 transition-all"
                      title="Duplicar pagina"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {totalPages > 1 && (
                      <button
                        onClick={handleDeletePage}
                        className="p-1.5 rounded-lg text-[#5a5a5f] hover:text-red-400 hover:bg-red-500/5 transition-all"
                        title="Remover pagina"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
