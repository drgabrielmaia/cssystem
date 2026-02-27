// ============================================================
// ARQUIVO: src/templates/LightTemplate.tsx
// ============================================================

import React from 'react';

/**
 * TEMPLATE LIGHT — Análise pixel a pixel da imagem:
 * 
 * ┌──────────────────────────────────────┐
 * │                                      │
 * │  ~220px espaço vazio topo            │
 * │                                      │
 * │  ┌──┐                                │
 * │  │🟢│ Gabriel Maia          48px L   │
 * │  │  │ @drgabriel.maia                │
 * │  └──┘                                │
 * │  ~28px gap                           │
 * │                                      │
 * │  "A melhor maneira de prever         │
 * │  o futuro é criá-lo."               │
 * │                       ↑ VERDE        │
 * │  ~24px gap                           │
 * │  Peter Drucker                       │
 * │                                      │
 * │  ~espaço restante                    │
 * └──────────────────────────────────────┘
 * 
 * OBSERVAÇÕES:
 * - O avatar + nome NÃO ficam no topo, ficam quase no centro vertical
 * - A citação usa aspas tipográficas curvas \u201C \u201D
 * - O destaque verde é APENAS na palavra específica
 * - O autor fica sem travessão, só o nome em cinza
 * - Font da citação é BOLD e bem grande (~42-46px)
 */

interface LightTemplateProps {
  text: string;
  fontSize: number;
  highlightWord: string;
  author: string;
  profileName: string;
  profileHandle: string;
  avatarUrl?: string;
}

export const LightTemplate: React.FC<LightTemplateProps> = ({
  text,
  fontSize,
  highlightWord,
  author,
  profileName,
  profileHandle,
  avatarUrl,
}) => {
  /**
   * Renderiza o texto com a palavra destacada em verde.
   * 
   * LÓGICA:
   * 1. Busca a highlightWord no texto (case-insensitive)
   * 2. Quebra o texto em partes: antes, highlight, depois
   * 3. Envolve o highlight em <span> verde
   */
  const renderHighlightedText = (content: string) => {
    if (!highlightWord || highlightWord.trim() === '') {
      return content;
    }

    const parts: React.ReactNode[] = [];
    const lowerContent = content.toLowerCase();
    const lowerHighlight = highlightWord.toLowerCase().trim();
    let lastIndex = 0;

    let searchIndex = lowerContent.indexOf(lowerHighlight);
    while (searchIndex !== -1) {
      // Texto antes do highlight
      if (searchIndex > lastIndex) {
        parts.push(content.slice(lastIndex, searchIndex));
      }
      // Palavra destacada
      parts.push(
        <span key={searchIndex} style={{ color: '#16A34A' }}>
          {content.slice(searchIndex, searchIndex + highlightWord.length)}
        </span>
      );
      lastIndex = searchIndex + highlightWord.length;
      searchIndex = lowerContent.indexOf(lowerHighlight, lastIndex);
    }

    // Texto restante
    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex));
    }

    return parts.length > 0 ? parts : content;
  };

  // Limpa o texto: remove aspas que o usuário possa ter digitado
  // (vamos adicionar as tipográficas programaticamente)
  const cleanText = text.replace(/^[""\u201C]|[""\u201D]$/g, '').trim();

  return (
    <div
      style={{
        // ===== CANVAS =====
        width: '1080px',
        height: '1080px',
        backgroundColor: '#FFFFFF',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        // Centraliza o conteúdo verticalmente
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          padding: '0 52px',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {/* ===== HEADER: AVATAR + NOME ===== */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            marginBottom: '32px',
          }}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                objectFit: 'cover',
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#F3F4F6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#16A34A',
                fontSize: '18px',
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {profileName.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span
              style={{
                color: '#111111',
                fontSize: '17px',
                fontWeight: 700,
                lineHeight: 1.2,
              }}
            >
              {profileName}
            </span>
            <span
              style={{
                color: '#6B7280',
                fontSize: '14px',
                fontWeight: 400,
                lineHeight: 1.2,
              }}
            >
              {profileHandle}
            </span>
          </div>
        </div>

        {/* ===== CITAÇÃO ===== */}
        <p
          style={{
            color: '#111111',
            fontSize: `${fontSize}px`,
            fontWeight: 700,
            lineHeight: 1.3,
            letterSpacing: '-0.02em',
            margin: 0,
            marginBottom: '24px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {/* Aspas tipográficas abertas */}
          {'\u201C'}
          {renderHighlightedText(cleanText)}
          {/* Aspas tipográficas fechadas */}
          {'\u201D'}
        </p>

        {/* ===== AUTOR ===== */}
        {author && (
          <p
            style={{
              color: '#6B7280',
              fontSize: '26px',
              fontWeight: 400,
              lineHeight: 1.3,
              margin: 0,
            }}
          >
            {author}
          </p>
        )}
      </div>
    </div>
  );
};