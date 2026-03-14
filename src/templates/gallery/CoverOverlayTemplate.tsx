import React from 'react';
import type { TemplateRenderProps } from '../../types';
import { applyFontOverride } from './fontUtils';

const FONT_IMPORT = "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');";

export const CoverOverlayTemplate: React.FC<TemplateRenderProps> = ({
  data, profileName, profileHandle, avatarUrl, accentColor,
}) => {
  const headline: string = data.headline || 'HEADLINE PRINCIPAL AQUI';
  const imageUrl: string = data.imageUrl || '';
  const bodyText: string = data.bodyText || '';
  const footerText: string = data.footerText || '';
  const textPosition: string = data.textPosition || 'bottom';
  const textAlign: string = data.textAlign || 'left';
  const imageOpacity: number = typeof data.imageOpacity === 'number'
    ? data.imageOpacity
    : (parseFloat(data.imageOpacity) || 0.75);

  // Auto-size headline — very large
  const headlineSize = (() => {
    const len = headline.length;
    if (len < 30) return 100;
    if (len < 50) return 80;
    if (len < 80) return 64;
    return 52;
  })();

  const contentJustify = textPosition === 'top'
    ? 'flex-start'
    : textPosition === 'center'
    ? 'center'
    : 'flex-end';

  return (
    <div style={{
      width: '1080px', height: '1080px',
      position: 'relative', overflow: 'hidden',
      backgroundColor: '#111111',
      fontFamily: "'Inter', sans-serif",
      boxSizing: 'border-box',
    }}>
      <style dangerouslySetInnerHTML={{ __html: FONT_IMPORT }} />

      {/* Background image */}
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          style={{
            position: 'absolute', top: 0, left: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            opacity: imageOpacity,
          }}
        />
      ) : (
        /* Dark gradient placeholder */
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          opacity: imageOpacity,
        }} />
      )}

      {/* Gradient overlays for readability */}
      {/* Top shadow */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: '35%',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.3), transparent)',
        pointerEvents: 'none',
      }} />
      {/* Bottom shadow */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: '55%',
        background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
        pointerEvents: 'none',
      }} />

      {/* TOP LEFT: Profile badge */}
      <div style={{
        position: 'absolute',
        top: '44px',
        left: '52px',
        display: 'flex', alignItems: 'center', gap: '14px',
      }}>
        {avatarUrl ? (
          <img src={avatarUrl} alt="" style={{
            width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover',
            border: '2px solid rgba(255,255,255,0.4)',
          }} />
        ) : (
          <div style={{
            width: '44px', height: '44px', borderRadius: '50%',
            background: `linear-gradient(135deg, ${accentColor || '#2563EB'}, ${accentColor || '#2563EB'}80)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#FFFFFF', fontSize: '14px', fontWeight: 700,
            fontFamily: "'Inter', sans-serif",
            border: '2px solid rgba(255,255,255,0.3)',
          }}>
            {profileName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '16px', fontWeight: 700,
            color: '#FFFFFF',
            lineHeight: 1,
          }}>{profileName}</span>
          <span style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '14px', fontWeight: 400,
            color: 'rgba(255,255,255,0.7)',
            lineHeight: 1,
          }}>{profileHandle}</span>
        </div>
      </div>

      {/* MAIN CONTENT positioned by textPosition */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        display: 'flex', flexDirection: 'column',
        justifyContent: contentJustify,
        padding: textPosition === 'top' ? '140px 52px 52px' : '52px 52px 64px',
        boxSizing: 'border-box',
      }}>
        <div style={{
          textAlign: textAlign as 'left' | 'center',
          maxWidth: '980px',
          ...(textAlign === 'center' ? { margin: '0 auto' } : {}),
        }}>
          {/* Huge bold headline */}
          <h1 style={applyFontOverride({
            fontFamily: "'Inter', sans-serif",
            fontSize: `${headlineSize}px`,
            fontWeight: 900,
            color: '#FFFFFF',
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            margin: 0,
            textTransform: 'uppercase',
            textShadow: '0 2px 30px rgba(0,0,0,0.6)',
          }, data, 'headline')}>
            {headline}
          </h1>

          {/* Optional body text */}
          {bodyText && (
            <p style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '28px',
              fontWeight: 400,
              color: 'rgba(255,255,255,0.85)',
              lineHeight: 1.45,
              margin: '28px 0 0 0',
              textShadow: '0 1px 10px rgba(0,0,0,0.4)',
            }}>
              {bodyText}
            </p>
          )}

          {/* Optional footer branded text */}
          {footerText && (
            <p style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '20px',
              fontWeight: 400,
              fontStyle: 'italic',
              color: 'rgba(255,255,255,0.5)',
              lineHeight: 1.4,
              margin: '24px 0 0 0',
            }}>
              {footerText}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
