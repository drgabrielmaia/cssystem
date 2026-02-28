"use client";

import { useState } from "react";
import { Link2, Loader2, X, ExternalLink } from "lucide-react";

interface StockPhotoSearchProps {
  onSelect: (base64DataUrl: string) => void;
  onClose: () => void;
}

export default function StockPhotoSearch({ onSelect, onClose }: StockPhotoSearchProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState("");

  const fetchImage = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;

    // Basic URL validation
    try { new URL(trimmed); } catch {
      setError("URL invalida. Cole o link completo da imagem.");
      return;
    }

    setLoading(true);
    setError("");
    setPreview("");

    try {
      const proxyUrl = `/api/stock-photos/proxy-image?url=${encodeURIComponent(trimmed)}`;
      const res = await fetch(proxyUrl);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Nao foi possivel baixar a imagem");
      }

      const blob = await res.blob();
      if (!blob.type.startsWith("image/")) {
        throw new Error("O link nao aponta para uma imagem");
      }

      const base64 = await new Promise<string>((resolve, reject) => {
        const img = new window.Image();
        const objUrl = URL.createObjectURL(blob);
        img.onload = () => {
          URL.revokeObjectURL(objUrl);
          const canvas = document.createElement("canvas");
          const maxSize = 1200;
          let w = img.width, h = img.height;
          if (w > maxSize || h > maxSize) {
            if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
            else { w = Math.round(w * maxSize / h); h = maxSize; }
          }
          canvas.width = w;
          canvas.height = h;
          canvas.getContext("2d")?.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/jpeg", 0.85));
        };
        img.onerror = () => { URL.revokeObjectURL(objUrl); reject(new Error("Falha ao carregar imagem")); };
        img.src = objUrl;
      });

      setPreview(base64);
    } catch (err: any) {
      setError(err.message || "Erro ao processar imagem");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchImage();
  };

  const confirmSelection = () => {
    if (preview) {
      onSelect(preview);
    }
  };

  return (
    <div className="mt-2 rounded-xl border border-white/[0.08] bg-[#111114] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
        <span className="text-[11px] font-medium text-[#8a8a8f] flex items-center gap-1.5">
          <Link2 className="w-3 h-3" /> Imagem da Web
        </span>
        <button onClick={onClose} className="p-1 rounded text-[#5a5a5f] hover:text-white transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* URL input */}
      <form onSubmit={handleSubmit} className="p-2 space-y-2">
        <div className="flex gap-1.5">
          <input
            type="text"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(""); }}
            placeholder="Cole o link da imagem aqui..."
            className="flex-1 px-3 py-2 bg-[#1a1a1e] border border-white/[0.06] rounded-lg text-xs text-white placeholder-[#3a3a3f] focus:outline-none focus:border-blue-500/30"
            autoFocus
          />
          <button
            type="submit"
            disabled={!url.trim() || loading}
            className="px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors flex-shrink-0"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Buscar"}
          </button>
        </div>

        {/* Quick links to free image sites */}
        <div className="flex flex-wrap gap-1.5">
          {[
            { name: "Unsplash", url: "https://unsplash.com" },
            { name: "Pexels", url: "https://pexels.com" },
            { name: "Pixabay", url: "https://pixabay.com" },
          ].map((site) => (
            <a
              key={site.name}
              href={site.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#1a1a1e] text-[10px] text-[#6a6a6f] hover:text-emerald-400 transition-colors ring-1 ring-white/[0.04]"
            >
              {site.name} <ExternalLink className="w-2.5 h-2.5" />
            </a>
          ))}
          <span className="text-[9px] text-[#3a3a3f] self-center ml-1">Clique com direito na foto → Copiar link da imagem</span>
        </div>

        {/* Error */}
        {error && (
          <p className="text-[11px] text-red-400 px-1">{error}</p>
        )}

        {/* Preview */}
        {preview && (
          <div className="space-y-2">
            <div className="relative rounded-lg overflow-hidden aspect-video bg-[#1a1a1e]">
              <img src={preview} alt="" className="w-full h-full object-contain" />
            </div>
            <button
              type="button"
              onClick={confirmSelection}
              className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors"
            >
              Usar esta imagem
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
