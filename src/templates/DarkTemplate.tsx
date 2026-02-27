// ============================================================
// ARQUIVO: src/templates/DarkTemplate.tsx
// ============================================================

import React from 'react';

/**
 * TEMPLATE DARK — Análise pixel a pixel da imagem:
 * 
 * ┌──────────────────────────────────────┐
 * │  40px padding top                     │
 * │  ┌──┐                                │
 * │  │🟢│ Gabriel Maia          40px L/R │
 * │  │  │ @drgabriel.maia                │
 * │  └──┘                                │
 * │  ~32px gap                           │
 * │                                      │
 * │  Pare de mentir pra si mesmo.        │
 * │  ~24px gap entre parágrafos          │
 * │  Ao invés de ficar dizendo...        │
 * │  ~24px gap                           │
 * │  Quando você para de mentir...       │
 * │  ~24px gap                           │
 * │  O cérebro adora desculpas.          │
 * │  E maturidade é entender...          │
 * │  ~24px gap                           │
 * │  Se isso fosse sua prioridade...     │
 * │                                      │
 * │  40px padding bottom                 │
 * └──────────────────────────────────────┘
 * 
 * OBSERVAÇÕES DA IMAGEM:
 * - "O cérebro adora desculpas." e "E maturidade é entender..."
 *   NÃO têm gap entre eles (são linhas consecutivas no mesmo parágrafo)
 * - Isso significa que \n simples = mesma linha, \n\n = novo parágrafo
 */

interface DarkTemplateProps {
  text: string;
  fontSize: number;
  profileName: string;
  profileHandle: string;
  avatarUrl?: string;
}

export const DarkTemplate: React.FC<DarkTemplateProps> = ({
  text,
  fontSize,
  profileName,
  profileHandle,
  avatarUrl,
}) => {
  // Separa parágrafos por linha dupla
  const paragraphs = text.split('\n\n').filter(Boolean);

  return (
    <div
      style={{
        // ===== CANVAS =====
        width: '1080px',
        height: '1080px',
        backgroundColor: '#000000',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
      }}
    >
      {/* ===== CONTAINER GERAL COM PADDING ===== */}
      <div
        style={{
          padding: '48px 52px',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          boxSizing: 'border-box',
        }}
      >
        {/* ===== HEADER: AVATAR + NOME ===== */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            marginBottom: '40px',
            flexShrink: 0,
          }}
        >
          {/* Avatar */}
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                objectFit: 'cover',
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                backgroundColor: '#1A1A1A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#16A34A',
                fontSize: '20px',
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {profileName.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
          )}

          {/* Nome + Handle */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span
              style={{
                color: '#FFFFFF',
                fontSize: '18px',
                fontWeight: 700,
                lineHeight: 1.2,
                letterSpacing: '-0.01em',
              }}
            >
              {profileName}
            </span>
            <span
              style={{
                color: '#9CA3AF',
                fontSize: '15px',
                fontWeight: 400,
                lineHeight: 1.2,
              }}
            >
              {profileHandle}
            </span>
          </div>
        </div>

        {/* ===== TEXTO PRINCIPAL ===== */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '28px', // Gap entre parágrafos
            flex: 1,
          }}
        >
          {paragraphs.map((paragraph, index) => (
            <p
              key={index}
              style={{
                color: '#FFFFFF',
                fontSize: `${fontSize}px`,
                fontWeight: 500,
                lineHeight: 1.45,
                letterSpacing: '-0.01em',
                margin: 0,
                padding: 0,
                // Preserva \n simples como quebra de linha dentro do parágrafo
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
};