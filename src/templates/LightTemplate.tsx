import React from 'react';
import type { FontStyle } from '../types';

/**
 * TEMPLATE LIGHT — Post 1080x1080 com suporte a:
 * - 4 estilos de fonte (modern, elegant, bold, minimal)
 * - Imagem de fundo com overlay
 * - Palavra destacada em verde
 */

const FONT_CONFIG: Record<FontStyle, {
  family: string;
  googleFont: string;
  weight: number;
  lineHeight: number;
  letterSpacing: string;
  nameFont?: string;
}> = {
  modern: {
    family: "'Montserrat', sans-serif",
    googleFont: 'Montserrat:wght@400;500;600;700;800',
    weight: 700,
    lineHeight: 1.35,
    letterSpacing: '-0.02em',
  },
  elegant: {
    family: "'Playfair Display', serif",
    googleFont: 'Playfair+Display:wght@400;500;600;700;800',
    weight: 700,
    lineHeight: 1.3,
    letterSpacing: '0em',
    nameFont: "'Montserrat', sans-serif",
  },
  bold: {
    family: "'Oswald', sans-serif",
    googleFont: 'Oswald:wght@400;500;600;700',
    weight: 600,
    lineHeight: 1.3,
    letterSpacing: '0.02em',
  },
  minimal: {
    family: "'Inter', system-ui, sans-serif",
    googleFont: 'Inter:wght@400;500;600;700',
    weight: 700,
    lineHeight: 1.3,
    letterSpacing: '-0.02em',
  },
};

interface LightTemplateProps {
  text: string;
  fontSize: number;
  fontStyle?: FontStyle;
  highlightWord: string;
  author: string;
  profileName: string;
  profileHandle: string;
  avatarUrl?: string;
  imageUrl?: string;
  imageOpacity?: number;
}

export const LightTemplate: React.FC<LightTemplateProps> = ({
  text,
  fontSize,
  fontStyle = 'modern',
  highlightWord,
  author,
  profileName,
  profileHandle,
  avatarUrl,
  imageUrl,
  imageOpacity = 0.1,
}) => {
  const font = FONT_CONFIG[fontStyle];

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
      if (searchIndex > lastIndex) {
        parts.push(content.slice(lastIndex, searchIndex));
      }
      parts.push(
        <span key={searchIndex} style={{ color: '#16A34A' }}>
          {content.slice(searchIndex, searchIndex + highlightWord.length)}
        </span>
      );
      lastIndex = searchIndex + highlightWord.length;
      searchIndex = lowerContent.indexOf(lowerHighlight, lastIndex);
    }

    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex));
    }

    return parts.length > 0 ? parts : content;
  };

  const cleanText = text.replace(/^[""\u201C]|[""\u201D]$/g, '').trim();

  return (
    <div
      style={{
        width: '1080px',
        height: '1080px',
        backgroundColor: '#FFFFFF',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: font.family,
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {/* Google Fonts embed */}
      <style
        dangerouslySetInnerHTML={{
          __html: `@import url('https://fonts.googleapis.com/css2?family=${font.googleFont}&display=swap');${
            font.nameFont
              ? `@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap');`
              : ''
          }`,
        }}
      />

      {/* Background image with overlay */}
      {imageUrl && (
        <>
          <img
            src={imageUrl}
            alt=""
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: imageOpacity,
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0.8) 100%)',
            }}
          />
        </>
      )}

      {/* Accent line at left */}
      <div
        style={{
          position: 'absolute',
          top: '52px',
          bottom: '52px',
          left: 0,
          width: '4px',
          background: 'linear-gradient(180deg, #16A34A, #22D3EE)',
          borderRadius: '0 2px 2px 0',
        }}
      />

      <div
        style={{
          padding: '0 56px',
          width: '100%',
          boxSizing: 'border-box',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Header: Avatar + Name */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '14px',
            marginBottom: '36px',
            width: '100%',
          }}
        >
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
                border: '2px solid rgba(22, 163, 74, 0.3)',
              }}
            />
          ) : (
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #16A34A 0%, #0D7A2E 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontSize: '18px',
                fontWeight: 700,
                flexShrink: 0,
                fontFamily: "'Montserrat', sans-serif",
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
                fontFamily: font.nameFont || font.family,
              }}
            >
              {profileName}
            </span>
            <span
              style={{
                color: '#16A34A',
                fontSize: '14px',
                fontWeight: 500,
                lineHeight: 1.2,
              }}
            >
              {profileHandle}
            </span>
          </div>
        </div>

        {/* Quote */}
        <p
          style={{
            color: '#111111',
            fontSize: `${fontSize}px`,
            fontWeight: font.weight,
            lineHeight: font.lineHeight,
            letterSpacing: font.letterSpacing,
            margin: 0,
            marginBottom: '24px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            ...(fontStyle === 'bold' ? { textTransform: 'uppercase' as const } : {}),
          }}
        >
          {'\u201C'}
          {renderHighlightedText(cleanText)}
          {'\u201D'}
        </p>

        {/* Author */}
        {author && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '24px',
                height: '2px',
                background: '#16A34A',
                borderRadius: '1px',
              }}
            />
            <p
              style={{
                color: '#6B7280',
                fontSize: '24px',
                fontWeight: 500,
                lineHeight: 1.3,
                margin: 0,
                fontFamily: font.nameFont || font.family,
              }}
            >
              {author}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
