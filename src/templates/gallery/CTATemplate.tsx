import React from 'react';
import type { TemplateRenderProps } from '../../types';
import { applyFontOverride } from './fontUtils';

const FONT_IMPORT = "@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;1,400;1,600;1,700&family=Inter:wght@400;500;600;700&display=swap');";

function isColorDark(hex: string): boolean {
  const c = hex.replace('#', '');
  if (c.length < 6) return true;
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
}

// Parse text with *italic* and {colored} markers
function renderRichText(
  text: string,
  highlightColor: string,
  baseStyle: React.CSSProperties,
): React.ReactNode[] {
  // Split by *italic* and {colored} markers
  const parts = text.split(/(\*[^*]+\*|\{[^}]+\})/g);
  return parts.map((part, i) => {
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <span key={i} style={{
          ...baseStyle,
          fontStyle: 'italic',
        }}>{part.slice(1, -1)}</span>
      );
    }
    if (part.startsWith('{') && part.endsWith('}')) {
      return (
        <span key={i} style={{
          ...baseStyle,
          color: highlightColor,
        }}>{part.slice(1, -1)}</span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

// Parse **bold** markers
function renderBoldText(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <span key={i} style={{ fontWeight: 700 }}>{part.slice(2, -2)}</span>;
    }
    return <span key={i}>{part}</span>;
  });
}

export const CTATemplate: React.FC<TemplateRenderProps> = ({
  data, profileName, profileHandle, avatarUrl, accentColor, backgroundColor,
}) => {
  const isDark = isColorDark(backgroundColor);
  const textColor = isDark ? '#FFFFFF' : '#111111';
  const subtextColor = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)';
  const faintColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)';

  const headline: string = data.headline || 'Titulo impactante aqui.';
  const bodyText: string = data.bodyText || '';
  const ctaText: string = data.ctaText || '';
  const imageUrl: string = data.imageUrl || '';
  const highlightColor: string = data.highlightColor || accentColor;
  const textAlign: string = data.textAlign || 'left';
  const align = textAlign as 'left' | 'center';

  // Auto-size headline
  const headlineSize = (() => {
    const len = headline.length;
    if (len < 30) return 72;
    if (len < 60) return 56;
    if (len < 100) return 46;
    if (len < 160) return 38;
    return 32;
  })();

  return (
    <div style={{
      width: '1080px', height: '1080px',
      backgroundColor,
      position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      boxSizing: 'border-box',
    }}>
      <style dangerouslySetInnerHTML={{ __html: FONT_IMPORT }} />

      {/* Background image with overlay */}
      {imageUrl && (
        <>
          <img src={imageUrl} alt="" style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            objectFit: 'cover',
          }} />
          <div style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.7) 100%)',
          }} />
        </>
      )}

      {/* Content */}
      <div style={{
        position: 'relative', zIndex: 1,
        flex: 1,
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center',
        padding: align === 'center' ? '100px 80px' : '100px 88px 100px 96px',
        textAlign: align,
        alignItems: align === 'center' ? 'center' : 'flex-start',
      }}>
        {/* Headline */}
        <h1 style={applyFontOverride({
          fontFamily: "'Playfair Display', serif",
          fontSize: `${headlineSize}px`,
          fontWeight: 700,
          color: imageUrl ? '#FFFFFF' : textColor,
          lineHeight: 1.15,
          letterSpacing: '-0.01em',
          margin: 0,
          maxWidth: align === 'center' ? '900px' : '800px',
        }, data, 'headline')}>
          {renderRichText(headline, highlightColor, {
            fontFamily: "'Playfair Display', serif",
            fontSize: `${headlineSize}px`,
            fontWeight: 700,
            lineHeight: 1.15,
          })}
        </h1>

        {/* Body text */}
        {bodyText && (
          <p style={applyFontOverride({
            fontFamily: "'Playfair Display', serif",
            fontSize: '26px',
            fontWeight: 400,
            color: imageUrl ? 'rgba(255,255,255,0.85)' : subtextColor,
            lineHeight: 1.5,
            margin: '40px 0 0',
            maxWidth: align === 'center' ? '800px' : '700px',
          }, data, 'bodyText')}>
            {renderRichText(bodyText, highlightColor, {
              fontFamily: "'Playfair Display', serif",
              fontSize: '26px',
              fontWeight: 400,
              lineHeight: 1.5,
            })}
          </p>
        )}

        {/* CTA text */}
        {ctaText && (
          <p style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '20px',
            fontWeight: 400,
            color: imageUrl ? 'rgba(255,255,255,0.6)' : faintColor,
            lineHeight: 1.6,
            margin: '48px 0 0',
            maxWidth: align === 'center' ? '700px' : '600px',
          }}>
            {renderBoldText(ctaText)}
          </p>
        )}
      </div>

      {/* Bottom: Profile */}
      <div style={{
        position: 'relative', zIndex: 1,
        flexShrink: 0,
        display: 'flex',
        justifyContent: align === 'center' ? 'center' : 'flex-start',
        padding: align === 'center' ? '0 80px 64px' : '0 88px 64px 96px',
      }}>
        {avatarUrl ? (
          <img src={avatarUrl} alt="" style={{
            width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover',
          }} />
        ) : (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: `linear-gradient(135deg, ${accentColor}, ${accentColor}80)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#FFFFFF', fontSize: '12px', fontWeight: 700,
              fontFamily: "'Inter', sans-serif",
            }}>
              {profileName.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '12px', fontWeight: 600,
              color: imageUrl ? 'rgba(255,255,255,0.4)' : faintColor,
            }}>{profileHandle}</div>
          </div>
        )}
      </div>
    </div>
  );
};
