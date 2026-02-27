// ============================================================
// ARQUIVO: src/components/posts/PostPreview.tsx
// ============================================================

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { DarkTemplate } from '../../templates/DarkTemplate';
import { LightTemplate } from '../../templates/LightTemplate';
import type { PostData } from '../../types';

/**
 * COMPONENTE DE PREVIEW
 * 
 * COMO FUNCIONA O SCALING:
 * 
 * O canvas REAL tem 1080x1080px (para exportar em resolução correta).
 * Mas na tela, precisamos reduzir para caber.
 * 
 * Usamos CSS transform: scale() para VISUALIZAR menor,
 * mas o DOM real continua 1080x1080.
 * 
 * Na hora de exportar, REMOVEMOS o scale temporariamente
 * para capturar os 1080x1080 reais.
 * 
 * ESTRUTURA:
 * ┌─ Container (tamanho visual na tela) ──────────┐
 * │  ┌─ Wrapper (overflow hidden) ──────────────┐ │
 * │  │  ┌─ Canvas 1080x1080 (scale: 0.5) ────┐ │ │
 * │  │  │                                     │ │ │
 * │  │  │   O POST REAL AQUI                  │ │ │
 * │  │  │                                     │ │ │
 * │  │  └─────────────────────────────────────┘ │ │
 * │  └──────────────────────────────────────────┘ │
 * └───────────────────────────────────────────────┘
 */

interface PostPreviewProps {
  data: PostData;
  onCanvasRef: (ref: HTMLDivElement | null) => void;
}

export const PostPreview: React.FC<PostPreviewProps> = ({ data, onCanvasRef }) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  // Calcula o scale baseado no container disponível
  const updateScale = useCallback(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;
      const scaleX = (containerWidth - 32) / 1080; // 32px de margem
      const scaleY = (containerHeight - 32) / 1080;
      setScale(Math.min(scaleX, scaleY, 1)); // Nunca maior que 1
    }
  }, []);

  useEffect(() => {
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [updateScale]);

  useEffect(() => {
    onCanvasRef(canvasRef.current);
  }, [onCanvasRef]);

  const fontSize = data.fontSize || (data.template === 'dark' ? 34 : 44);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Wrapper que define o tamanho visual */}
      <div
        style={{
          width: `${1080 * scale}px`,
          height: `${1080 * scale}px`,
          overflow: 'hidden',
          borderRadius: '8px',
          // Sombra sutil para destacar o canvas
          boxShadow: data.template === 'dark'
            ? '0 4px 24px rgba(255,255,255,0.05)'
            : '0 4px 24px rgba(0,0,0,0.15)',
        }}
      >
        {/* Canvas real 1080x1080 com scale visual */}
        <div
          ref={canvasRef}
          id="post-canvas"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            // IMPORTANTE: Sem width/height aqui — vem do template filho
          }}
        >
          {data.template === 'dark' ? (
            <DarkTemplate
              text={data.text}
              fontSize={fontSize}
              profileName={data.profileName || 'Gabriel Maia'}
              profileHandle={data.profileHandle || '@drgabriel.maia'}
              avatarUrl={data.avatarUrl}
            />
          ) : (
            <LightTemplate
              text={data.text}
              fontSize={fontSize}
              highlightWord={data.highlightWord || ''}
              author={data.author || ''}
              profileName={data.profileName || 'Gabriel Maia'}
              profileHandle={data.profileHandle || '@drgabriel.maia'}
              avatarUrl={data.avatarUrl}
            />
          )}
        </div>
      </div>
    </div>
  );
};