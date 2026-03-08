import React from 'react';
import type { TemplateRenderProps } from '../../types';

const FONT_IMPORT = "@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap');";

function isColorDark(hex: string): boolean {
  const c = hex.replace('#', '');
  if (c.length < 6) return true;
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
}

export const QuoteTweetTemplate: React.FC<TemplateRenderProps> = ({
  data, profileName, profileHandle, avatarUrl, accentColor, backgroundColor,
}) => {
  const isDark = isColorDark(backgroundColor);
  const textColor = isDark ? '#FFFFFF' : '#111111';
  const subtextColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)';
  const tweetText: string = data.tweetText || 'Seu texto aqui...';
  const imageUrl: string = data.imageUrl || '';

  // Auto-size text
  const fontSize = (() => {
    const len = tweetText.length;
    if (len < 100) return 28;
    if (len < 200) return 24;
    if (len < 400) return 20;
    return 18;
  })();

  return (
    <div style={{
      width: '1080px', height: '1080px', backgroundColor,
      position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: 'center',
      padding: '72px 64px',
      boxSizing: 'border-box',
    }}>
      <style dangerouslySetInnerHTML={{ __html: FONT_IMPORT }} />

      {/* Tweet card */}
      <div style={{
        width: '100%',
        maxWidth: '860px',
        background: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
        borderRadius: '24px',
        padding: '40px 44px',
        boxShadow: isDark
          ? '0 4px 32px rgba(0,0,0,0.3)'
          : '0 4px 32px rgba(0,0,0,0.08)',
        border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
      }}>
        {/* Profile */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '14px',
          marginBottom: '24px',
        }}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="" style={{
              width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover',
            }} />
          ) : (
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%',
              background: `linear-gradient(135deg, ${accentColor}, ${accentColor}80)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#FFFFFF', fontSize: '20px', fontWeight: 700,
              fontFamily: "'Montserrat', sans-serif",
            }}>
              {profileName.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
          )}
          <div>
            <div style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: '18px', fontWeight: 700,
              color: isDark ? '#FFFFFF' : '#000000',
            }}>{profileName}</div>
            <div style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '15px', fontWeight: 500,
              color: subtextColor,
            }}>{profileHandle}</div>
          </div>
        </div>

        {/* Tweet text */}
        <p style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: `${fontSize}px`,
          fontWeight: 400,
          color: isDark ? 'rgba(255,255,255,0.9)' : '#111111',
          lineHeight: 1.6,
          margin: 0,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>{tweetText}</p>

        {/* Optional image */}
        {imageUrl && (
          <div style={{
            marginTop: '24px',
            borderRadius: '16px',
            overflow: 'hidden',
          }}>
            <img src={imageUrl} alt="" style={{
              width: '100%',
              maxHeight: '400px',
              objectFit: 'cover',
            }} />
          </div>
        )}
      </div>
    </div>
  );
};
