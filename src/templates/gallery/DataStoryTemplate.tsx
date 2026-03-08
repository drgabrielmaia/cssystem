import React from 'react';
import type { TemplateRenderProps } from '../../types';

const FONT_IMPORT = "@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;1,400;1,700&family=Inter:wght@400;500;600;700&display=swap');";

function isColorDark(hex: string): boolean {
  const c = hex.replace('#', '');
  if (c.length < 6) return true;
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
}

export const DataStoryTemplate: React.FC<TemplateRenderProps> = ({
  data, profileName, profileHandle, avatarUrl, accentColor, backgroundColor,
}) => {
  const isDark = isColorDark(backgroundColor);
  const textColor = isDark ? '#FFFFFF' : '#111111';
  const subtextColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)';

  const headline: string = data.headline || 'Titulo com dados impactantes.';
  const imageUrl: string = data.imageUrl || '';
  const bodyText: string = data.bodyText || '';
  const highlightText: string = data.highlightText || '';
  const sourceText: string = data.sourceText || '';

  // Auto-size headline
  const headlineSize = (() => {
    const len = headline.length;
    if (len < 40) return 56;
    if (len < 80) return 44;
    if (len < 120) return 36;
    return 30;
  })();

  // Render body text with italic portions (text between _ markers)
  const renderBodyText = (text: string) => {
    // Split by *italic* markers
    const parts = text.split(/(\*[^*]+\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('*') && part.endsWith('*')) {
        return (
          <span key={i} style={{
            fontFamily: "'Playfair Display', serif",
            fontStyle: 'italic',
            fontWeight: 600,
          }}>{part.slice(1, -1)}</span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div style={{
      width: '1080px', height: '1080px', backgroundColor,
      position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      boxSizing: 'border-box',
    }}>
      <style dangerouslySetInnerHTML={{ __html: FONT_IMPORT }} />

      {/* Top: Headline */}
      <div style={{
        padding: '72px 72px 40px',
        flexShrink: 0,
        textAlign: 'center',
      }}>
        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: `${headlineSize}px`,
          fontWeight: 800,
          color: textColor,
          lineHeight: 1.15,
          letterSpacing: '-0.02em',
          margin: 0,
          textTransform: 'uppercase',
        }}>{headline}</h1>
      </div>

      {/* Middle: Image */}
      {imageUrl && (
        <div style={{
          flex: 1,
          margin: '0 56px',
          borderRadius: '4px',
          overflow: 'hidden',
          position: 'relative',
          minHeight: 0,
        }}>
          <img
            src={imageUrl}
            alt=""
            style={{
              width: '100%', height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        </div>
      )}

      {/* Bottom: Body text + profile */}
      <div style={{
        padding: imageUrl ? '40px 72px 56px' : '0 72px 56px',
        flexShrink: 0,
        textAlign: 'center',
        flex: imageUrl ? undefined : 1,
        display: 'flex', flexDirection: 'column',
        justifyContent: imageUrl ? undefined : 'center',
        alignItems: 'center',
      }}>
        {bodyText && (
          <p style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '22px',
            fontWeight: 400,
            color: subtextColor,
            lineHeight: 1.5,
            margin: 0,
            maxWidth: '850px',
          }}>{renderBodyText(bodyText)}</p>
        )}

        {highlightText && (
          <p style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '22px',
            fontWeight: 400,
            fontStyle: 'italic',
            color: textColor,
            lineHeight: 1.5,
            margin: bodyText ? '8px 0 0' : 0,
            maxWidth: '850px',
          }}>{highlightText}</p>
        )}

        {sourceText && (
          <p style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '13px',
            fontWeight: 400,
            color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)',
            margin: '12px 0 0',
          }}>({sourceText})</p>
        )}

        {/* Profile */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          marginTop: '28px',
        }}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="" style={{
              width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover',
            }} />
          ) : (
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: `linear-gradient(135deg, ${accentColor}, ${accentColor}80)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#FFFFFF', fontSize: '11px', fontWeight: 700,
              fontFamily: "'Inter', sans-serif",
            }}>
              {profileName.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
          )}
          <div style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '12px', fontWeight: 600, color: subtextColor,
          }}>{profileHandle}</div>
        </div>
      </div>
    </div>
  );
};
