"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { PostTemplate } from '@/templates/PostTemplate';
import { exportPostAsPng, exportPostAsPngSafe } from '@/utils/exportImage';
import type { FontStyle, PostSlide } from '@/types';
import {
  X, ChevronLeft, ChevronRight, Plus, Trash2, Download,
  Image, Palette, Upload, ChevronDown, Link2,
} from 'lucide-react';
import StockPhotoSearch from './StockPhotoSearch';

// ============ CONSTANTS ============

const COLOR_PRESETS = [
  { name: 'Preto', value: '#000000' },
  { name: 'Branco', value: '#FFFFFF' },
  { name: 'Azul Escuro', value: '#0F172A' },
  { name: 'Verde Escuro', value: '#052E16' },
  { name: 'Vinho', value: '#450A0A' },
  { name: 'Roxo', value: '#2E1065' },
  { name: 'Cinza', value: '#1F2937' },
  { name: 'Bege', value: '#FEF3C7' },
  { name: 'Azul Royal', value: '#1E3A5F' },
  { name: 'Verde Militar', value: '#1A3A2A' },
];

const ACCENT_PRESETS = [
  '#16A34A', '#3B82F6', '#EF4444', '#F59E0B',
  '#8B5CF6', '#EC4899', '#06B6D4', '#FFFFFF',
];

const FONT_OPTIONS: { value: FontStyle; label: string; desc: string }[] = [
  { value: 'modern', label: 'Montserrat', desc: 'Moderna' },
  { value: 'elegant', label: 'Playfair', desc: 'Elegante' },
  { value: 'bold', label: 'Oswald', desc: 'Impacto' },
  { value: 'minimal', label: 'Inter', desc: 'Limpa' },
];

// ============ TYPES ============

interface PostEditorProps {
  open: boolean;
  onClose: () => void;
  initialSlides?: PostSlide[];
  profileName: string;
  profileHandle: string;
  avatarUrl?: string;
}

// ============ COMPONENT ============

export default function PostEditor({
  open, onClose, initialSlides, profileName, profileHandle, avatarUrl,
}: PostEditorProps) {
  // Slides
  const [slides, setSlides] = useState<PostSlide[]>([{ title: '', body: '' }]);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Global settings
  const [bgColor, setBgColor] = useState('#000000');
  const [customColor, setCustomColor] = useState('');
  const [titleFontStyle, setTitleFontStyle] = useState<FontStyle>('bold');
  const [bodyFontStyle, setBodyFontStyle] = useState<FontStyle>('modern');
  const [titleFontSize, setTitleFontSize] = useState(42);
  const [bodyFontSize, setBodyFontSize] = useState(28);
  const [profilePosition, setProfilePosition] = useState<'top' | 'bottom'>('top');
  const [bgImageUrl, setBgImageUrl] = useState('');
  const [bgImageOpacity, setBgImageOpacity] = useState(0.15);
  const [accentColor, setAccentColor] = useState('#16A34A');

  // Collapsible sections
  const [showStyle, setShowStyle] = useState(false);
  const [showImages, setShowImages] = useState(false);
  const [stockSearchOpen, setStockSearchOpen] = useState<'background' | 'inline' | null>(null);

  // Export
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState('');
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inlineImageRef = useRef<HTMLInputElement>(null);
  const bgImageRef = useRef<HTMLInputElement>(null);
  const [scale, setScale] = useState(0.5);

  // Load initial slides when provided
  useEffect(() => {
    if (initialSlides && initialSlides.length > 0) {
      setSlides(initialSlides);
      setCurrentSlide(0);
    }
  }, [initialSlides]);

  // Calculate preview scale
  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        setScale(Math.min((w - 16) / 1080, (h - 16) / 1080, 1));
      }
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [open]);

  // ---- Slide management ----
  const updateSlide = useCallback((field: keyof PostSlide, value: string) => {
    setSlides(prev => {
      const n = [...prev];
      n[currentSlide] = { ...n[currentSlide], [field]: value };
      return n;
    });
  }, [currentSlide]);

  const addSlide = useCallback(() => {
    setSlides(prev => [...prev, { title: '', body: '' }]);
    setCurrentSlide(slides.length);
  }, [slides.length]);

  const removeSlide = useCallback(() => {
    if (slides.length <= 1) return;
    setSlides(prev => prev.filter((_, i) => i !== currentSlide));
    setCurrentSlide(prev => Math.min(prev, slides.length - 2));
  }, [currentSlide, slides.length]);

  const goToSlide = useCallback((dir: -1 | 1) => {
    setCurrentSlide(prev => Math.max(0, Math.min(slides.length - 1, prev + dir)));
  }, [slides.length]);

  // ---- Image handling (with compression) ----
  const compressImage = useCallback((file: File, maxSize: number = 1200): Promise<string> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        let w = img.width;
        let h = img.height;
        if (w > maxSize || h > maxSize) {
          if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
          else { w = Math.round(w * maxSize / h); h = maxSize; }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      };
      img.src = url;
    });
  }, []);

  const handleInlineImage = useCallback(async (file: File) => {
    const compressed = await compressImage(file);
    updateSlide('inlineImageUrl', compressed);
  }, [updateSlide, compressImage]);

  const handleStockPhotoSelect = useCallback((base64: string) => {
    if (stockSearchOpen === 'background') {
      setBgImageUrl(base64);
    } else if (stockSearchOpen === 'inline') {
      updateSlide('inlineImageUrl', base64);
    }
    setStockSearchOpen(null);
  }, [stockSearchOpen, updateSlide]);

  const handleBgImage = useCallback(async (file: File) => {
    const compressed = await compressImage(file);
    setBgImageUrl(compressed);
  }, [compressImage]);

  // ---- Export ----
  const exportSlide = useCallback(async () => {
    if (!canvasRef.current) return;
    setExporting(true);
    try {
      const el = canvasRef.current;
      const origTransform = el.style.transform;
      el.style.transform = 'none';
      el.offsetHeight; // force reflow
      const filename = `post-slide-${currentSlide + 1}-${Date.now()}.png`;
      try {
        await exportPostAsPng(el, filename);
      } catch {
        await exportPostAsPngSafe(el, filename);
      }
      el.style.transform = origTransform;
    } finally {
      setExporting(false);
    }
  }, [currentSlide]);

  const exportAllSlides = useCallback(async () => {
    if (!canvasRef.current) return;
    setExporting(true);
    const origSlide = currentSlide;
    for (let i = 0; i < slides.length; i++) {
      setExportProgress(`Exportando ${i + 1}/${slides.length}...`);
      setCurrentSlide(i);
      // Wait for render
      await new Promise(r => setTimeout(r, 500));
      if (!canvasRef.current) continue;
      const el = canvasRef.current;
      const origTransform = el.style.transform;
      el.style.transform = 'none';
      el.offsetHeight;
      const filename = `post-slide-${i + 1}-${Date.now()}.png`;
      try {
        await exportPostAsPng(el, filename);
      } catch {
        await exportPostAsPngSafe(el, filename);
      }
      el.style.transform = origTransform;
    }
    setCurrentSlide(origSlide);
    setExportProgress('');
    setExporting(false);
  }, [currentSlide, slides.length]);

  if (!open) return null;

  const slide = slides[currentSlide] || { title: '', body: '' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full h-full md:w-[95vw] md:max-w-[1300px] md:h-[92vh] md:rounded-2xl bg-[#0f0f11] md:border md:border-white/[0.08] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-400 flex items-center justify-center">
              <Palette className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-sm text-white">Editor de Post</span>
            <span className="text-[11px] text-[#5a5a5f] ml-1">{slides.length} slide{slides.length > 1 ? 's' : ''}</span>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-[#5a5a5f] hover:text-white hover:bg-white/5 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Controls - scrollable */}
          <div className="md:w-[340px] flex-shrink-0 md:border-r border-b md:border-b-0 border-white/[0.06] overflow-y-auto max-h-[40vh] md:max-h-none p-4 space-y-3">

            {/* Slide navigation */}
            <div className="flex items-center gap-2">
              <button onClick={() => goToSlide(-1)} disabled={currentSlide === 0}
                className="p-1.5 rounded-lg bg-[#1a1a1e] text-[#5a5a5f] hover:text-white disabled:opacity-30 transition-all">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex-1 flex items-center justify-center gap-1.5">
                {slides.map((_, i) => (
                  <button key={i} onClick={() => setCurrentSlide(i)}
                    className={`w-7 h-7 rounded-lg text-[11px] font-bold transition-all ${
                      i === currentSlide
                        ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30'
                        : 'bg-[#1a1a1e] text-[#5a5a5f] hover:text-white'
                    }`}>
                    {i + 1}
                  </button>
                ))}
              </div>
              <button onClick={() => goToSlide(1)} disabled={currentSlide >= slides.length - 1}
                className="p-1.5 rounded-lg bg-[#1a1a1e] text-[#5a5a5f] hover:text-white disabled:opacity-30 transition-all">
                <ChevronRight className="w-4 h-4" />
              </button>
              <button onClick={addSlide} className="p-1.5 rounded-lg bg-[#1a1a1e] text-emerald-400 hover:bg-emerald-500/15 transition-all" title="Adicionar slide">
                <Plus className="w-4 h-4" />
              </button>
              {slides.length > 1 && (
                <button onClick={removeSlide} className="p-1.5 rounded-lg bg-[#1a1a1e] text-red-400 hover:bg-red-500/15 transition-all" title="Remover slide">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Title */}
            <input value={slide.title} onChange={(e) => updateSlide('title', e.target.value)}
              placeholder="Titulo do slide..."
              className="w-full px-3 py-2.5 bg-[#1a1a1e] border border-white/[0.06] rounded-lg text-[14px] text-white placeholder-[#2a2a2f] focus:outline-none focus:border-emerald-500/40 transition-colors font-semibold"
            />

            {/* Body */}
            <textarea value={slide.body} onChange={(e) => updateSlide('body', e.target.value)}
              rows={4} placeholder="Texto do slide..."
              className="w-full px-3 py-2.5 bg-[#1a1a1e] border border-white/[0.06] rounded-lg text-[13px] text-white placeholder-[#2a2a2f] focus:outline-none focus:border-emerald-500/40 transition-colors resize-none"
            />

            {/* Quick image add per slide */}
            <input ref={inlineImageRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) handleInlineImage(e.target.files[0]); e.target.value = ''; }}
            />
            {slide.inlineImageUrl ? (
              <div className="relative rounded-lg overflow-hidden h-16">
                <img src={slide.inlineImageUrl} alt="" className="w-full h-full object-cover" />
                <button onClick={() => updateSlide('inlineImageUrl', '')}
                  className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-white hover:bg-red-500/80 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <button onClick={() => inlineImageRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-white/[0.08] text-[#5a5a5f] hover:text-white hover:border-white/20 transition-all text-xs">
                  <Image className="w-4 h-4" /> Adicionar imagem ao slide
                </button>
                <button onClick={() => setStockSearchOpen(stockSearchOpen === 'inline' ? null : 'inline')}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-white/[0.08] text-[#5a5a5f] hover:text-emerald-400 hover:border-emerald-500/20 transition-all text-xs">
                  <Link2 className="w-3.5 h-3.5" /> Usar imagem da web
                </button>
                {stockSearchOpen === 'inline' && (
                  <StockPhotoSearch onSelect={handleStockPhotoSelect} onClose={() => setStockSearchOpen(null)} />
                )}
              </div>
            )}

            {/* Background color - always visible, compact */}
            <div>
              <label className="block text-[10px] font-semibold text-[#5a5a5f] mb-1.5 uppercase tracking-wider">Cor de Fundo</label>
              <div className="flex flex-wrap gap-1.5">
                {COLOR_PRESETS.map((c) => (
                  <button key={c.value} onClick={() => setBgColor(c.value)} title={c.name}
                    className={`w-7 h-7 rounded-lg transition-all ${
                      bgColor === c.value ? 'ring-2 ring-emerald-400 scale-110' : 'ring-1 ring-white/10 hover:scale-105'
                    }`}
                    style={{ backgroundColor: c.value }}
                  />
                ))}
              </div>
            </div>

            {/* === Collapsible: Estilo Avancado === */}
            <button onClick={() => setShowStyle(!showStyle)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[#151518] ring-1 ring-white/[0.04] text-xs font-medium text-[#7a7a7f] hover:text-white transition-colors">
              <span className="flex items-center gap-2"><Palette className="w-3.5 h-3.5" /> Estilo Avancado</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showStyle ? 'rotate-180' : ''}`} />
            </button>
            {showStyle && (
              <div className="space-y-3 pl-1">
                {/* Accent color */}
                <div>
                  <label className="block text-[10px] font-semibold text-[#5a5a5f] mb-1.5 uppercase tracking-wider">Cor de Destaque</label>
                  <div className="flex flex-wrap gap-1.5">
                    {ACCENT_PRESETS.map((c) => (
                      <button key={c} onClick={() => setAccentColor(c)}
                        className={`w-6 h-6 rounded-full transition-all ${
                          accentColor === c ? 'ring-2 ring-white scale-110' : 'ring-1 ring-white/10 hover:scale-105'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                {/* Custom hex */}
                <div className="flex gap-2">
                  <input value={customColor} onChange={(e) => setCustomColor(e.target.value)}
                    onBlur={() => { if (/^#[0-9a-fA-F]{6}$/.test(customColor)) setBgColor(customColor); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' && /^#[0-9a-fA-F]{6}$/.test(customColor)) setBgColor(customColor); }}
                    placeholder="#HEX personalizado" className="flex-1 px-2 py-1.5 bg-[#1a1a1e] border border-white/[0.06] rounded-lg text-[11px] text-white placeholder-[#2a2a2f] focus:outline-none"
                  />
                  <div className="w-8 h-8 rounded-lg ring-1 ring-white/10" style={{ backgroundColor: bgColor }} />
                </div>

                {/* Font styles */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-[#5a5a5f] mb-1.5 uppercase tracking-wider">Fonte Titulo</label>
                    <div className="space-y-1">
                      {FONT_OPTIONS.map((f) => (
                        <button key={f.value} onClick={() => setTitleFontStyle(f.value)}
                          className={`w-full px-2 py-1.5 rounded-lg text-left text-[11px] transition-all ${
                            titleFontStyle === f.value ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30' : 'bg-[#1a1a1e] text-[#5a5a5f] hover:text-white'
                          }`}>
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[#5a5a5f] mb-1.5 uppercase tracking-wider">Fonte Corpo</label>
                    <div className="space-y-1">
                      {FONT_OPTIONS.map((f) => (
                        <button key={f.value} onClick={() => setBodyFontStyle(f.value)}
                          className={`w-full px-2 py-1.5 rounded-lg text-left text-[11px] transition-all ${
                            bodyFontStyle === f.value ? 'bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/30' : 'bg-[#1a1a1e] text-[#5a5a5f] hover:text-white'
                          }`}>
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Font sizes */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-[#5a5a5f] mb-1">Titulo: {titleFontSize}px</label>
                    <input type="range" min={24} max={64} value={titleFontSize}
                      onChange={(e) => setTitleFontSize(Number(e.target.value))} className="w-full accent-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#5a5a5f] mb-1">Corpo: {bodyFontSize}px</label>
                    <input type="range" min={16} max={48} value={bodyFontSize}
                      onChange={(e) => setBodyFontSize(Number(e.target.value))} className="w-full accent-blue-500" />
                  </div>
                </div>

                {/* Profile position */}
                <div>
                  <label className="block text-[10px] font-semibold text-[#5a5a5f] mb-1.5 uppercase tracking-wider">Posicao do Perfil</label>
                  <div className="flex gap-2">
                    {(['top', 'bottom'] as const).map((pos) => (
                      <button key={pos} onClick={() => setProfilePosition(pos)}
                        className={`flex-1 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                          profilePosition === pos ? 'bg-white text-black' : 'bg-[#1a1a1e] text-[#5a5a5f] hover:text-white ring-1 ring-white/[0.04]'
                        }`}>
                        {pos === 'top' ? 'Topo' : 'Rodape'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* === Collapsible: Imagens === */}
            <button onClick={() => setShowImages(!showImages)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[#151518] ring-1 ring-white/[0.04] text-xs font-medium text-[#7a7a7f] hover:text-white transition-colors">
              <span className="flex items-center gap-2"><Image className="w-3.5 h-3.5" /> Imagem de Fundo</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showImages ? 'rotate-180' : ''}`} />
            </button>
            {showImages && (
              <div className="pl-1">
                <input ref={bgImageRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { if (e.target.files?.[0]) handleBgImage(e.target.files[0]); e.target.value = ''; }}
                />
                {bgImageUrl ? (
                  <div className="space-y-2">
                    <div className="relative rounded-lg overflow-hidden h-14">
                      <img src={bgImageUrl} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => setBgImageUrl('')}
                        className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-white hover:bg-red-500/80">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <div>
                      <label className="block text-[10px] text-[#5a5a5f] mb-1">Opacidade: {Math.round(bgImageOpacity * 100)}%</label>
                      <input type="range" min={5} max={80} value={bgImageOpacity * 100}
                        onChange={(e) => setBgImageOpacity(Number(e.target.value) / 100)} className="w-full accent-emerald-500" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <button onClick={() => bgImageRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-white/[0.08] text-[#5a5a5f] hover:text-white hover:border-white/20 transition-all text-xs">
                      <Upload className="w-3.5 h-3.5" /> Selecionar imagem de fundo
                    </button>
                    <button onClick={() => setStockSearchOpen(stockSearchOpen === 'background' ? null : 'background')}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-white/[0.08] text-[#5a5a5f] hover:text-emerald-400 hover:border-emerald-500/20 transition-all text-xs">
                      <Link2 className="w-3.5 h-3.5" /> Usar imagem da web
                    </button>
                    {stockSearchOpen === 'background' && (
                      <StockPhotoSearch onSelect={handleStockPhotoSelect} onClose={() => setStockSearchOpen(null)} />
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Export buttons */}
            <div className="space-y-2 pt-2">
              <button onClick={exportSlide} disabled={exporting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors disabled:opacity-50">
                <Download className="w-4 h-4" />
                {exporting && !exportProgress ? 'Exportando...' : 'Exportar Slide'}
              </button>
              {slides.length > 1 && (
                <button onClick={exportAllSlides} disabled={exporting}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50">
                  <Download className="w-4 h-4" />
                  {exportProgress || `Exportar Todos (${slides.length})`}
                </button>
              )}
            </div>
          </div>

          {/* Preview */}
          <div ref={containerRef} className="flex-1 flex items-center justify-center p-4 md:p-6 bg-[#0a0a0c] min-h-[50vh] md:min-h-0">
            <div style={{
              width: `${1080 * scale}px`,
              height: `${1080 * scale}px`,
              overflow: 'hidden',
              borderRadius: '8px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
            }}>
              <div ref={canvasRef} style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
                <PostTemplate
                  backgroundColor={bgColor}
                  title={slide.title || undefined}
                  titleFontStyle={titleFontStyle}
                  titleFontSize={titleFontSize}
                  body={slide.body || ' '}
                  bodyFontStyle={bodyFontStyle}
                  bodyFontSize={bodyFontSize}
                  profileName={profileName}
                  profileHandle={profileHandle}
                  avatarUrl={avatarUrl}
                  profilePosition={profilePosition}
                  inlineImageUrl={slide.inlineImageUrl}
                  backgroundImageUrl={bgImageUrl || undefined}
                  backgroundImageOpacity={bgImageOpacity}
                  slideIndicator={slides.length > 1 ? `${currentSlide + 1}/${slides.length}` : undefined}
                  accentColor={accentColor}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
