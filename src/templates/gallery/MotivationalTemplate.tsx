import React from 'react';
import type { TemplateRenderProps } from '../../types';
import { applyFontOverride } from './fontUtils';

const FONT_IMPORT = "@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800&family=Montserrat:wght@400;500;600;700;800&display=swap');";

function isColorDark(hex: string): boolean {
  const c = hex.replace('#', '');
  if (c.length < 6) return true;
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
}

export const MotivationalTemplate: React.FC<TemplateRenderProps> = ({
  data, profileName, profileHandle, avatarUrl, accentColor, backgroundColor,
}) => {
  const isDark = isColorDark(backgroundColor);
  const textColor = isDark ? '#FFFFFF' : '#111111';
  const subtextColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)';
  const text: string = data.text || 'Seu texto motivacional aqui';
  const highlights: Array<{ word: string; color: string }> = data.highlights || [];
  const fontStyle: 'serif' | 'sans' = data.fontStyle || 'serif';
  const fontSize: number = data.fontSize || 64;
  const ctaText: string = data.ctaText || '';

  const fontFamily = fontStyle === 'serif'
    ? "'Playfair Display', serif"
    : "'Montserrat', sans-serif";

  // Auto-size based on text length
  const autoSize = (() => {
    const len = text.length;
    if (len < 40) return Math.min(fontSize, 80);
    if (len < 80) return Math.min(fontSize, 64);
    if (len < 140) return Math.min(fontSize, 52);
    if (len < 250) return Math.min(fontSize, 40);
    return Math.min(fontSize, 32);
  })();

  const renderHighlightedText = () => {
    if (!highlights.length) {
      return <span>{text}</span>;
    }

    let result: React.ReactNode[] = [];
    let remaining = text;
    let keyIdx = 0;

    while (remaining.length > 0) {
      let earliestIdx = remaining.length;
      let matchedHighlight: { word: string; color: string } | null = null;

      for (const h of highlights) {
        const idx = remaining.toLowerCase().indexOf(h.word.toLowerCase());
        if (idx !== -1 && idx < earliestIdx) {
          earliestIdx = idx;
          matchedHighlight = h;
        }
      }

      if (!matchedHighlight) {
        result.push(<span key={keyIdx++}>{remaining}</span>);
        break;
      }

      if (earliestIdx > 0) {
        result.push(<span key={keyIdx++}>{remaining.slice(0, earliestIdx)}</span>);
      }

      const matchedWord = remaining.slice(earliestIdx, earliestIdx + matchedHighlight.word.length);
      result.push(
        <span key={keyIdx++} style={{
          color: matchedHighlight.color,
          fontStyle: 'italic',
        }}>{matchedWord}</span>
      );

      remaining = remaining.slice(earliestIdx + matchedHighlight.word.length);
    }

    return <>{result}</>;
  };

  return (
    <div style={{
      width: '1080px', height: '1080px', backgroundColor,
      position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: 'center',
      padding: '80px 72px',
      boxSizing: 'border-box',
    }}>
      <style dangerouslySetInnerHTML={{ __html: FONT_IMPORT }} />

      {/* Main text */}
      <div style={{
        flex: 1,
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        textAlign: 'center',
      }}>
        <p style={applyFontOverride({
          fontFamily,
          fontSize: `${autoSize}px`,
          fontWeight: fontStyle === 'serif' ? 400 : 700,
          color: textColor,
          lineHeight: 1.2,
          letterSpacing: '-0.02em',
          margin: 0,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }, data, 'text')}>
          {renderHighlightedText()}
        </p>

        {/* Accent divider */}
        <div style={{
          width: '48px', height: '4px',
          background: accentColor,
          borderRadius: '2px',
          marginTop: '36px',
        }} />
      </div>

      {/* CTA text */}
      {ctaText && (
        <div style={{
          flexShrink: 0,
          padding: '24px 0',
          width: '100%',
          textAlign: 'center',
        }}>
          <div style={{
            background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
            borderRadius: '16px',
            padding: '20px 32px',
          }}>
            <p style={applyFontOverride({
              fontFamily: "'Montserrat', sans-serif",
              fontSize: '18px',
              fontWeight: 500,
              color: subtextColor,
              margin: 0,
              lineHeight: 1.5,
            }, data, 'ctaText')}>{ctaText}</p>
          </div>
        </div>
      )}

      {/* Profile */}
      <div style={{
        flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: '14px',
      }}>
        {avatarUrl ? (
          <img src={avatarUrl} alt="" style={{
            width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover',
          }} />
        ) : (
          <div style={{
            width: '44px', height: '44px', borderRadius: '50%',
            background: `linear-gradient(135deg, ${accentColor}, ${accentColor}80)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#FFFFFF', fontSize: '16px', fontWeight: 700,
            fontFamily: "'Montserrat', sans-serif",
          }}>
            {profileName.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
        )}
        <div>
          <div style={{
            fontFamily: "'Montserrat', sans-serif",
            fontSize: '14px', fontWeight: 700, color: textColor,
            letterSpacing: '0.05em', textTransform: 'uppercase' as const,
          }}>{profileName.toUpperCase()}</div>
          <div style={{
            fontFamily: "'Montserrat', sans-serif",
            fontSize: '12px', fontWeight: 500, color: subtextColor,
          }}>{profileHandle}</div>
        </div>
      </div>
    </div>
  );
};
