import React from 'react';
import type { TemplateRenderProps } from '../../types';

const FONT_IMPORT = "@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;1,400;1,700&family=Inter:wght@400;500;600;700&display=swap');";

export const DarkNarrativeTemplate: React.FC<TemplateRenderProps> = ({
  data, profileName, profileHandle, avatarUrl, accentColor,
}) => {
  const headline: string = data.headline || 'Titulo principal.';
  const midText: string = data.midText || '';
  const midSubtext: string = data.midSubtext || '';
  const footerText: string = data.footerText || '';
  const imageUrl: string = data.imageUrl || '';

  // Auto-size headline
  const headlineSize = (() => {
    const len = headline.length;
    if (len < 40) return 52;
    if (len < 80) return 42;
    if (len < 120) return 34;
    return 28;
  })();

  const footerSize = (() => {
    const len = footerText.length;
    if (len < 40) return 44;
    if (len < 80) return 36;
    return 28;
  })();

  return (
    <div style={{
      width: '1080px', height: '1080px',
      position: 'relative', overflow: 'hidden',
      backgroundColor: '#000000',
    }}>
      <style dangerouslySetInnerHTML={{ __html: FONT_IMPORT }} />

      {/* Background image with overlay */}
      {imageUrl && (
        <>
          <img
            src={imageUrl}
            alt=""
            style={{
              position: 'absolute', top: 0, left: 0,
              width: '100%', height: '100%',
              objectFit: 'cover',
              opacity: 0.5,
            }}
          />
          {/* Dark gradient overlays */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            height: '40%',
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)',
          }} />
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: '40%',
            background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)',
          }} />
        </>
      )}

      {/* Content overlay */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '72px 64px',
        boxSizing: 'border-box',
      }}>
        {/* Top: Headline */}
        <div style={{ textAlign: 'center' }}>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: `${headlineSize}px`,
            fontWeight: 800,
            color: '#FFFFFF',
            lineHeight: 1.15,
            letterSpacing: '-0.01em',
            margin: 0,
            textTransform: 'uppercase',
            textShadow: '0 2px 20px rgba(0,0,0,0.5)',
          }}>{headline}</h1>
        </div>

        {/* Middle: Accent text */}
        {(midText || midSubtext) && (
          <div style={{ textAlign: 'center' }}>
            {midText && (
              <p style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: '32px',
                fontWeight: 400,
                fontStyle: 'italic',
                color: accentColor,
                lineHeight: 1.3,
                margin: 0,
                textShadow: '0 2px 15px rgba(0,0,0,0.4)',
              }}>{midText}</p>
            )}
            {midSubtext && (
              <p style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '18px',
                fontWeight: 400,
                color: 'rgba(255,255,255,0.6)',
                lineHeight: 1.5,
                margin: '16px auto 0',
                maxWidth: '700px',
                textShadow: '0 1px 10px rgba(0,0,0,0.3)',
              }}>{midSubtext}</p>
            )}
          </div>
        )}

        {/* Bottom: Footer + Profile */}
        <div style={{ textAlign: 'center' }}>
          {footerText && (
            <p style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: `${footerSize}px`,
              fontWeight: 800,
              fontStyle: 'italic',
              color: '#FFFFFF',
              lineHeight: 1.2,
              margin: '0 0 32px 0',
              textTransform: 'uppercase',
              letterSpacing: '-0.01em',
              textShadow: '0 2px 20px rgba(0,0,0,0.5)',
            }}>{footerText}</p>
          )}

          {/* Profile */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
          }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="" style={{
                width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover',
                border: '2px solid rgba(255,255,255,0.2)',
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
              fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.5)',
            }}>{profileHandle}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
