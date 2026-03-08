"use client";

import React, { useState, useRef, useCallback } from 'react';
import CanvasPreview, { type CanvasPreviewHandle } from './CanvasPreview';
import TemplateGallery from './TemplateGallery';
import type { PostCreationMode, PostSlide } from '@/types';
import {
  X, Download, Layout, PenTool, Sparkles, Palette, Loader2,
} from 'lucide-react';

interface PostCreationModalProps {
  open: boolean;
  onClose: () => void;
  profileName: string;
  profileHandle: string;
  avatarUrl?: string;
  initialMode?: PostCreationMode;
  initialSlides?: PostSlide[];
  initialTemplate?: string;
  initialTemplateData?: Record<string, any>;
  initialAIDescription?: string;
}

const MODE_TABS: { id: PostCreationMode; label: string; icon: React.ReactNode }[] = [
  { id: 'template-gallery', label: 'Templates', icon: <Layout className="w-4 h-4" /> },
  { id: 'visual-editor', label: 'Editor', icon: <PenTool className="w-4 h-4" /> },
  { id: 'ai-auto', label: 'IA Auto', icon: <Sparkles className="w-4 h-4" /> },
];

export default function PostCreationModal({
  open, onClose,
  profileName, profileHandle, avatarUrl,
  initialMode = 'template-gallery',
  initialSlides,
  initialTemplate,
  initialTemplateData,
  initialAIDescription,
}: PostCreationModalProps) {
  const [mode, setMode] = useState<PostCreationMode>(initialMode);
  const [previewContent, setPreviewContent] = useState<React.ReactNode>(null);
  const [exporting, setExporting] = useState(false);
  const [aiInput, setAiInput] = useState(initialAIDescription || '');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTemplate, setAiTemplate] = useState<string | null>(null);
  const [aiData, setAiData] = useState<Record<string, any> | null>(null);
  const canvasRef = useRef<CanvasPreviewHandle>(null);

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

  const handleAIGenerate = useCallback(async () => {
    if (!aiInput.trim()) return;
    setAiLoading(true);
    try {
      const res = await fetch('/api/chat-gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: aiInput,
          context: { tipoPost: 'auto-post' },
        }),
      });
      const json = await res.json();
      if (json.reply) {
        try {
          // Try to parse as JSON
          const cleaned = json.reply.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          const parsed = JSON.parse(cleaned);
          if (parsed.template && parsed.templateData) {
            setAiTemplate(parsed.template);
            setAiData({
              ...parsed.templateData,
            });
            // Switch to template gallery with AI data
            setMode('template-gallery');
          }
        } catch {
          // If not JSON, show as text
          console.log('AI response (not JSON):', json.reply);
        }
      }
    } catch (err) {
      console.error('AI error:', err);
    } finally {
      setAiLoading(false);
    }
  }, [aiInput]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full h-full md:w-[95vw] md:max-w-[1400px] md:h-[92vh] md:rounded-2xl bg-[#0f0f11] md:border md:border-white/[0.08] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-400 flex items-center justify-center">
              <Palette className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-sm text-white">Criar Post</span>

            {/* Mode tabs */}
            <div className="flex items-center gap-1 ml-3 bg-[#1a1a1e] rounded-lg p-0.5">
              {MODE_TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setMode(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                    mode === tab.id
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : 'text-[#5a5a5f] hover:text-white'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              disabled={exporting || !previewContent}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors disabled:opacity-40"
            >
              {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Exportar PNG
            </button>
            <button onClick={onClose} className="p-2 rounded-lg text-[#5a5a5f] hover:text-white hover:bg-white/5 transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left panel - Controls */}
          <div className="md:w-[360px] flex-shrink-0 md:border-r border-b md:border-b-0 border-white/[0.06] overflow-hidden max-h-[40vh] md:max-h-none">
            {mode === 'template-gallery' && (
              <TemplateGallery
                profileName={profileName}
                profileHandle={profileHandle}
                avatarUrl={avatarUrl}
                onRender={handleRender}
                initialTemplate={aiTemplate || initialTemplate}
                initialData={aiData || initialTemplateData}
              />
            )}

            {mode === 'visual-editor' && (
              <div className="p-4 flex flex-col items-center justify-center h-full text-center">
                <PenTool className="w-10 h-10 text-[#2a2a2f] mb-3" />
                <p className="text-sm text-[#5a5a5f] font-medium">Editor Visual</p>
                <p className="text-xs text-[#3a3a3f] mt-1">Drag & drop em breve</p>
              </div>
            )}

            {mode === 'ai-auto' && (
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-[10px] font-semibold text-[#5a5a5f] mb-2 uppercase tracking-wider">
                    Descreva o post que voce quer
                  </label>
                  <textarea
                    value={aiInput}
                    onChange={e => setAiInput(e.target.value)}
                    rows={4}
                    placeholder="Ex: Post de depoimento com print do WhatsApp de uma mentorada falando que faturou 30k em uma manha..."
                    className="w-full px-3 py-2.5 bg-[#1a1a1e] border border-white/[0.06] rounded-lg text-[13px] text-white placeholder-[#3a3a3f] focus:outline-none focus:border-emerald-500/40 transition-colors resize-none"
                  />
                </div>
                <button
                  onClick={handleAIGenerate}
                  disabled={aiLoading || !aiInput.trim()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white text-sm font-medium transition-all disabled:opacity-40"
                >
                  {aiLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> IA criando seu post...</>
                  ) : (
                    <><Sparkles className="w-4 h-4" /> Gerar com IA</>
                  )}
                </button>

                {aiTemplate && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                    <p className="text-xs text-emerald-300 font-medium">
                      IA escolheu: <span className="font-bold">{aiTemplate}</span>
                    </p>
                    <p className="text-[10px] text-emerald-400/60 mt-1">
                      Voce foi redirecionado para o template. Edite os campos como quiser.
                    </p>
                  </div>
                )}

                <div className="space-y-2 pt-2">
                  <p className="text-[10px] text-[#3a3a3f] font-medium uppercase tracking-wider">Exemplos:</p>
                  {[
                    'Post comparando medico plantonista vs empreendedor',
                    'Depoimento de mentorada que faturou 30k em uma manha',
                    'Post motivacional sobre mudanca silenciosa na medicina',
                    'CTA pedindo para comentar LIBERDADE',
                  ].map((ex, i) => (
                    <button
                      key={i}
                      onClick={() => setAiInput(ex)}
                      className="w-full text-left px-3 py-2 rounded-lg bg-[#151518] text-[11px] text-[#5a5a5f] hover:text-white hover:bg-[#1a1a1e] transition-all"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right panel - Preview */}
          <CanvasPreview ref={canvasRef} className="flex-1 p-4 md:p-6 min-h-[50vh] md:min-h-0">
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
      </div>
    </div>
  );
}
