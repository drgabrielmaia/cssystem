import React from 'react';
import type { TemplateRenderProps } from '../../types';

const FONT_IMPORT = "@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&family=Playfair+Display:wght@400;500;600;700;800&display=swap');";

function isColorDark(hex: string): boolean {
  const c = hex.replace('#', '');
  if (c.length < 6) return true;
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
}

export const CTATemplate: React.FC<TemplateRenderProps> = ({
  data, profileName, profileHandle, avatarUrl, accentColor, backgroundColor,
}) => {
  const isDark = isColorDark(backgroundColor);
  const textColor = isDark ? '#FFFFFF' : '#111111';
  const subtextColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)';
  const headline: string = data.headline || 'Titulo impactante';
  const subtext: string = data.subtext || '';
  const ctaButtonText: string = data.ctaButtonText || 'SAIBA MAIS';
  const ctaColor: string = data.ctaColor || accentColor;
  const engagementPrompt: string = data.engagementPrompt || '';
  const emoji: string = data.emoji || '';

  // Auto-size headline
  const headlineSize = (() => {
    const len = headline.length;
    if (len < 30) return 72;
    if (len < 60) return 56;
    if (len < 100) return 44;
    return 36;
  })();

  return (
    <div style={{
      width: '1080px', height: '1080px', backgroundColor,
      position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      justifyContent: 'space-between', alignItems: 'center',
      padding: '80px 72px',
      boxSizing: 'border-box',
    }}>
      <style dangerouslySetInnerHTML={{ __html: FONT_IMPORT }} />

      {/* Top spacer */}
      <div style={{ flexShrink: 0 }} />

      {/* Center content */}
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', textAlign: 'center',
        gap: '32px',
      }}>
        {/* Emoji */}
        {emoji && (
          <div style={{ fontSize: '72px', lineHeight: 1 }}>{emoji}</div>
        )}

        {/* Headline */}
        <h1 style={{
          fontFamily: "'Montserrat', sans-serif",
          fontSize: `${headlineSize}px`,
          fontWeight: 800,
          color: textColor,
          lineHeight: 1.1,
          letterSpacing: '-0.02em',
          margin: 0,
          whiteSpace: 'pre-wrap',
        }}>{headline}</h1>

        {/* Accent line */}
        <div style={{
          width: '56px', height: '4px',
          background: ctaColor,
          borderRadius: '2px',
        }} />

        {/* Subtext */}
        {subtext && (
          <p style={{
            fontFamily: "'Montserrat', sans-serif",
            fontSize: '22px',
            fontWeight: 500,
            color: subtextColor,
            lineHeight: 1.5,
            margin: 0,
            maxWidth: '800px',
          }}>{subtext}</p>
        )}

        {/* CTA Button */}
        <div style={{
          background: ctaColor,
          borderRadius: '16px',
          padding: '20px 56px',
          marginTop: '16px',
        }}>
          <span style={{
            fontFamily: "'Montserrat', sans-serif",
            fontSize: '22px',
            fontWeight: 800,
            color: '#FFFFFF',
            letterSpacing: '0.08em',
            textTransform: 'uppercase' as const,
          }}>{ctaButtonText}</span>
        </div>
      </div>

      {/* Bottom */}
      <div style={{
        flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: '20px',
        width: '100%',
      }}>
        {/* Engagement prompt */}
        {engagementPrompt && (
          <div style={{
            background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
            borderRadius: '14px',
            padding: '16px 32px',
          }}>
            <p style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: '18px',
              fontWeight: 600,
              color: subtextColor,
              margin: 0,
              textAlign: 'center',
            }}>{engagementPrompt}</p>
          </div>
        )}

        {/* Profile */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="" style={{
              width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover',
            }} />
          ) : (
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%',
              background: `linear-gradient(135deg, ${ctaColor}, ${ctaColor}80)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#FFFFFF', fontSize: '14px', fontWeight: 700,
              fontFamily: "'Montserrat', sans-serif",
            }}>
              {profileName.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
          )}
          <div>
            <div style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: '13px', fontWeight: 700, color: textColor,
              letterSpacing: '0.05em', textTransform: 'uppercase' as const,
            }}>{profileName.toUpperCase()}</div>
            <div style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: '11px', fontWeight: 500, color: subtextColor,
            }}>{profileHandle}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
