import React from 'react';
import type { FontStyle } from '../types';

/**
 * TEMPLATE DARK — Post 1080x1080 com suporte a:
 * - 4 estilos de fonte (modern, elegant, bold, minimal)
 * - Imagem de fundo com overlay
 * - Avatar do perfil
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
    weight: 600,
    lineHeight: 1.5,
    letterSpacing: '-0.01em',
  },
  elegant: {
    family: "'Playfair Display', serif",
    googleFont: 'Playfair+Display:wght@400;500;600;700;800',
    weight: 600,
    lineHeight: 1.45,
    letterSpacing: '0em',
    nameFont: "'Montserrat', sans-serif",
  },
  bold: {
    family: "'Oswald', sans-serif",
    googleFont: 'Oswald:wght@400;500;600;700',
    weight: 500,
    lineHeight: 1.4,
    letterSpacing: '0.02em',
  },
  minimal: {
    family: "'Inter', system-ui, sans-serif",
    googleFont: 'Inter:wght@400;500;600;700',
    weight: 500,
    lineHeight: 1.45,
    letterSpacing: '-0.01em',
  },
};

interface DarkTemplateProps {
  text: string;
  fontSize: number;
  fontStyle?: FontStyle;
  profileName: string;
  profileHandle: string;
  avatarUrl?: string;
  imageUrl?: string;
  imageOpacity?: number;
  contentSpacing?: number;
  topPadding?: number;
}

export const DarkTemplate: React.FC<DarkTemplateProps> = ({
  text,
  fontSize,
  fontStyle = 'modern',
  profileName,
  profileHandle,
  avatarUrl,
  imageUrl,
  imageOpacity = 0.15,
  contentSpacing = 44,
  topPadding = 52,
}) => {
  const paragraphs = text.split('\n\n').filter(Boolean);
  const font = FONT_CONFIG[fontStyle];

  return (
    <div
      style={{
        width: '1080px',
        height: '1080px',
        backgroundColor: '#000000',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: font.family,
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
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
          {/* Gradient overlay for readability */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: `linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.7) 100%)`,
            }}
          />
        </>
      )}

      {/* Accent line at top */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '52px',
          right: '52px',
          height: '3px',
          background: 'linear-gradient(90deg, #16A34A, #22D3EE, #16A34A)',
          borderRadius: '0 0 2px 2px',
        }}
      />

      {/* Content container */}
      <div
        style={{
          padding: `${topPadding}px 56px 52px 56px`,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
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
            justifyContent: 'flex-start',
            gap: '16px',
            marginBottom: `${contentSpacing}px`,
            flexShrink: 0,
            width: '100%',
          }}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                objectFit: 'cover',
                flexShrink: 0,
                border: '2px solid rgba(22, 163, 74, 0.5)',
              }}
            />
          ) : (
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #16A34A 0%, #0D7A2E 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontSize: '20px',
                fontWeight: 700,
                flexShrink: 0,
                fontFamily: "'Montserrat', sans-serif",
              }}
            >
              {profileName.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <span
              style={{
                color: '#FFFFFF',
                fontSize: '19px',
                fontWeight: 700,
                lineHeight: 1.2,
                letterSpacing: '-0.01em',
                fontFamily: font.nameFont || font.family,
              }}
            >
              {profileName}
            </span>
            <span
              style={{
                color: '#16A34A',
                fontSize: '15px',
                fontWeight: 500,
                lineHeight: 1.2,
              }}
            >
              {profileHandle}
            </span>
          </div>
        </div>

        {/* Main text */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: fontStyle === 'bold' ? '24px' : '28px',
            flex: 1,
          }}
        >
          {paragraphs.map((paragraph, index) => (
            <p
              key={index}
              style={{
                color: '#FFFFFF',
                fontSize: `${fontSize}px`,
                fontWeight: font.weight,
                lineHeight: font.lineHeight,
                letterSpacing: font.letterSpacing,
                margin: 0,
                padding: 0,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                textAlign: 'left',
                ...(fontStyle === 'bold' ? { textTransform: 'uppercase' as const } : {}),
              }}
            >
              {paragraph}
            </p>
          ))}
        </div>

        {/* Bottom accent */}
        <div
          style={{
            marginTop: 'auto',
            paddingTop: '32px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: '32px',
              height: '3px',
              background: '#16A34A',
              borderRadius: '2px',
            }}
          />
          <span
            style={{
              color: 'rgba(255,255,255,0.3)',
              fontSize: '13px',
              fontWeight: 500,
              fontFamily: "'Montserrat', sans-serif",
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            Médicos de Resultado
          </span>
        </div>
      </div>
    </div>
  );
};
