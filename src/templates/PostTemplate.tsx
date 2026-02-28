import React from 'react';
import type { FontStyle } from '../types';

const FONT_MAP: Record<FontStyle, { family: string; googleFont: string }> = {
  modern: { family: "'Montserrat', sans-serif", googleFont: 'Montserrat:wght@400;500;600;700;800' },
  elegant: { family: "'Playfair Display', serif", googleFont: 'Playfair+Display:wght@400;500;600;700;800' },
  bold: { family: "'Oswald', sans-serif", googleFont: 'Oswald:wght@400;500;600;700' },
  minimal: { family: "'Inter', system-ui, sans-serif", googleFont: 'Inter:wght@400;500;600;700' },
};

function isColorDark(hex: string): boolean {
  const c = hex.replace('#', '');
  if (c.length < 6) return true;
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
}

interface PostTemplateProps {
  backgroundColor: string;
  title?: string;
  titleFontStyle: FontStyle;
  titleFontSize: number;
  body: string;
  bodyFontStyle: FontStyle;
  bodyFontSize: number;
  profileName: string;
  profileHandle: string;
  avatarUrl?: string;
  profilePosition: 'top' | 'bottom';
  inlineImageUrl?: string;
  backgroundImageUrl?: string;
  backgroundImageOpacity?: number;
  slideIndicator?: string;
  accentColor?: string;
  contentSpacing?: number;
  topPadding?: number;
}

export const PostTemplate: React.FC<PostTemplateProps> = ({
  backgroundColor,
  title,
  titleFontStyle,
  titleFontSize,
  body,
  bodyFontStyle,
  bodyFontSize,
  profileName,
  profileHandle,
  avatarUrl,
  profilePosition,
  inlineImageUrl,
  backgroundImageUrl,
  backgroundImageOpacity = 0.15,
  slideIndicator,
  accentColor = '#16A34A',
  contentSpacing = 12,
  topPadding = 52,
}) => {
  const isDark = isColorDark(backgroundColor);
  const textColor = isDark ? '#FFFFFF' : '#111111';
  const subtextColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)';
  const titleFont = FONT_MAP[titleFontStyle];
  const bodyFont = FONT_MAP[bodyFontStyle];

  // Collect unique Google Fonts
  const fontsNeeded = new Set([titleFont.googleFont, bodyFont.googleFont, 'Montserrat:wght@400;500;600;700']);
  const fontImports = Array.from(fontsNeeded)
    .map(f => `@import url('https://fonts.googleapis.com/css2?family=${f}&display=swap');`)
    .join('');

  // Auto-size body based on content length
  const totalLen = (title?.length || 0) + body.length;
  const autoBodySize = (() => {
    if (inlineImageUrl) {
      if (totalLen < 100) return Math.min(bodyFontSize * 1.2, 40);
      if (totalLen < 200) return bodyFontSize;
      return Math.max(bodyFontSize * 0.8, 20);
    }
    if (totalLen < 80) return Math.min(bodyFontSize * 1.5, 52);
    if (totalLen < 150) return Math.min(bodyFontSize * 1.2, 44);
    if (totalLen < 300) return bodyFontSize;
    if (totalLen < 500) return Math.max(bodyFontSize * 0.85, 24);
    return Math.max(bodyFontSize * 0.7, 20);
  })();

  const paragraphs = body.split('\n\n').filter(Boolean);

  const profileSection = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '16px', flexShrink: 0, width: '100%' }}>
      {avatarUrl ? (
        <img src={avatarUrl} alt="" style={{
          width: '56px', height: '56px', borderRadius: '50%',
          objectFit: 'cover', flexShrink: 0, border: `2px solid ${accentColor}50`,
        }} />
      ) : (
        <div style={{
          width: '56px', height: '56px', borderRadius: '50%',
          background: `linear-gradient(135deg, ${accentColor}, ${accentColor}80)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#FFFFFF', fontSize: '20px', fontWeight: 700, flexShrink: 0,
          fontFamily: "'Montserrat', sans-serif",
        }}>
          {profileName.split(' ').map(n => n[0]).join('').slice(0, 2)}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <span style={{
          color: textColor, fontSize: '19px', fontWeight: 700,
          lineHeight: 1.2, letterSpacing: '-0.01em',
          fontFamily: "'Montserrat', sans-serif",
        }}>{profileName}</span>
        <span style={{
          color: accentColor, fontSize: '15px', fontWeight: 500, lineHeight: 1.2,
        }}>{profileHandle}</span>
      </div>
    </div>
  );

  return (
    <div style={{
      width: '1080px', height: '1080px', backgroundColor,
      position: 'relative', overflow: 'hidden',
    }}>
      <style dangerouslySetInnerHTML={{ __html: fontImports }} />

      {/* Background image */}
      {backgroundImageUrl && (
        <>
          <img src={backgroundImageUrl} alt="" style={{
            position: 'absolute', top: 0, left: 0,
            width: '100%', height: '100%', objectFit: 'cover',
            opacity: backgroundImageOpacity,
          }} />
          <div style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            background: isDark
              ? 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.7) 100%)'
              : 'linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0.8) 100%)',
          }} />
        </>
      )}

      {/* Accent line top */}
      <div style={{
        position: 'absolute', top: 0, left: '52px', right: '52px', height: '3px',
        background: `linear-gradient(90deg, ${accentColor}, ${accentColor}60, ${accentColor})`,
        borderRadius: '0 0 2px 2px',
      }} />

      {/* Content */}
      <div style={{
        padding: `${topPadding}px 56px 52px 56px`, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'flex-start',
        height: '100%', boxSizing: 'border-box', position: 'relative', zIndex: 1,
      }}>
        {/* Profile top */}
        {profilePosition === 'top' && (
          <div style={{ marginBottom: `${contentSpacing}px`, flexShrink: 0, width: '100%' }}>
            {profileSection}
          </div>
        )}

        {/* Title */}
        {title && (
          <h2 style={{
            color: textColor, fontFamily: titleFont.family,
            fontSize: `${titleFontSize}px`, fontWeight: 700,
            lineHeight: 1.2, letterSpacing: '-0.02em',
            margin: 0, marginBottom: inlineImageUrl ? '20px' : '24px',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            textAlign: 'left', width: '100%',
          }}>{title}</h2>
        )}

        {/* Inline image with rounded corners */}
        {inlineImageUrl && (
          <div style={{ marginBottom: '24px', flexShrink: 0, width: '100%' }}>
            <img src={inlineImageUrl} alt="" style={{
              width: '100%', maxHeight: '400px',
              objectFit: 'cover', borderRadius: '20px',
            }} />
          </div>
        )}

        {/* Body text */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          gap: '20px', width: '100%', textAlign: 'left',
        }}>
          {paragraphs.map((p, i) => (
            <p key={i} style={{
              color: textColor, fontFamily: bodyFont.family,
              fontSize: `${autoBodySize}px`,
              fontWeight: bodyFontStyle === 'bold' ? 600 : 500,
              lineHeight: 1.45, letterSpacing: '-0.01em',
              margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>{p}</p>
          ))}
        </div>

        {/* Profile bottom */}
        {profilePosition === 'bottom' && (
          <div style={{ marginTop: `${contentSpacing}px`, flexShrink: 0, width: '100%' }}>
            {profileSection}
          </div>
        )}

        {/* Footer: watermark + slide indicator */}
        <div style={{
          marginTop: 'auto', paddingTop: '24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '32px', height: '3px', background: accentColor, borderRadius: '2px' }} />
            <span style={{
              color: subtextColor, fontSize: '13px', fontWeight: 500,
              fontFamily: "'Montserrat', sans-serif",
              letterSpacing: '0.05em', textTransform: 'uppercase' as const,
            }}>Medicos de Resultado</span>
          </div>
          {slideIndicator && (
            <span style={{
              color: subtextColor, fontSize: '16px', fontWeight: 600,
              fontFamily: "'Montserrat', sans-serif",
            }}>{slideIndicator}</span>
          )}
        </div>
      </div>
    </div>
  );
};
