import React from 'react';
import type { TemplateRenderProps } from '../../types';
import { applyFontOverride } from './fontUtils';

const FONT_IMPORT = "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');";

export const PureEditorialTemplate: React.FC<TemplateRenderProps> = ({
  data, profileName, profileHandle, avatarUrl, accentColor, backgroundColor,
}) => {
  const headline: string = data.headline || 'Headline principal aqui';
  const bodyText: string = data.bodyText || '';
  const imageUrl: string = data.imageUrl || '';
  const headerLabel: string = data.headerLabel || 'IA para conteúdo';
  const headerRight: string = data.headerRight || 'Copyright © 2025';
  const ctaText: string = data.ctaText || 'Arrasta para o lado >';

  const bg = backgroundColor || '#F5F5F5';
  const accent = accentColor || '#2563EB';

  // Auto-size headline
  const headlineSize = (() => {
    const len = headline.length;
    if (len < 40) return 80;
    if (len < 80) return 64;
    if (len < 120) return 52;
    return 42;
  })();

  // Auto-size body text
  const bodyTextSize = (() => {
    const len = bodyText.length;
    if (len < 100) return 30;
    if (len < 200) return 26;
    return 22;
  })();

  return (
    <div style={{
      width: '1080px', height: '1080px',
      position: 'relative', overflow: 'hidden',
      backgroundColor: bg,
      fontFamily: "'Inter', sans-serif",
      display: 'flex', flexDirection: 'column',
      boxSizing: 'border-box',
    }}>
      <style dangerouslySetInnerHTML={{ __html: FONT_IMPORT }} />

      {/* TOP: Header bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 56px',
        height: '80px',
        flexShrink: 0,
        borderBottom: '2px solid #222222',
        boxSizing: 'border-box',
      }}>
        {/* Left: profile handle */}
        <span style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: '18px',
          fontWeight: 600,
          color: '#444444',
          letterSpacing: '0.01em',
        }}>
          {profileHandle}
        </span>

        {/* Center: label */}
        <span style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: '18px',
          fontWeight: 700,
          color: '#111111',
          letterSpacing: '0.02em',
          textTransform: 'uppercase',
        }}>
          {headerLabel}
        </span>

        {/* Right */}
        <span style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: '16px',
          fontWeight: 400,
          color: '#888888',
        }}>
          {headerRight}
        </span>
      </div>

      {/* MIDDLE: Main content */}
      <div style={{
        flex: 1,
        display: 'flex', flexDirection: 'column',
        padding: '52px 56px 40px',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}>
        {/* Headline */}
        <h1 style={applyFontOverride({
          fontFamily: "'Inter', sans-serif",
          fontSize: `${headlineSize}px`,
          fontWeight: 800,
          color: '#111111',
          lineHeight: 1.1,
          letterSpacing: '-0.025em',
          margin: 0,
        }, data, 'headline')}>
          {headline}
        </h1>

        {/* Optional image */}
        {imageUrl && (
          <div style={{
            marginTop: '36px',
            borderRadius: '16px',
            overflow: 'hidden',
            flex: bodyText ? '0 0 auto' : '1',
            maxHeight: '380px',
          }}>
            <img
              src={imageUrl}
              alt=""
              style={{
                width: '100%', height: '100%',
                objectFit: 'cover',
                display: 'block',
                maxHeight: '380px',
              }}
            />
          </div>
        )}

        {/* Optional body text */}
        {bodyText && (
          <p style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: `${bodyTextSize}px`,
            fontWeight: 400,
            color: '#666666',
            lineHeight: 1.5,
            margin: '28px 0 0 0',
          }}>
            {bodyText}
          </p>
        )}
      </div>

      {/* BOTTOM: Footer bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 56px',
        height: '88px',
        flexShrink: 0,
        borderTop: '2px solid #222222',
        boxSizing: 'border-box',
      }}>
        {/* Left: avatar + name + handle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="" style={{
              width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover',
            }} />
          ) : (
            <div style={{
              width: '48px', height: '48px', borderRadius: '50%',
              background: `linear-gradient(135deg, ${accent}, ${accent}80)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#FFFFFF', fontSize: '16px', fontWeight: 700,
              fontFamily: "'Inter', sans-serif",
            }}>
              {profileName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <span style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '18px', fontWeight: 700,
              color: '#111111', lineHeight: 1,
            }}>{profileName}</span>
            <span style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '15px', fontWeight: 400,
              color: '#888888', lineHeight: 1,
            }}>{profileHandle}</span>
          </div>
        </div>

        {/* Right: CTA text */}
        <span style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: '20px',
          fontWeight: 700,
          color: '#111111',
          letterSpacing: '-0.01em',
        }}>
          {ctaText}
        </span>
      </div>
    </div>
  );
};
