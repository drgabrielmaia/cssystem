import React from 'react';
import type { TemplateRenderProps } from '../../types';
import { applyFontOverride } from './fontUtils';

const FONT_IMPORT = "@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;1,400;1,700&family=Inter:wght@400;500;600&display=swap');";

function isColorDark(hex: string): boolean {
  const c = hex.replace('#', '');
  if (c.length < 6) return true;
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
}

export const StorytellingTemplate: React.FC<TemplateRenderProps> = ({
  data, profileName, profileHandle, avatarUrl, accentColor, backgroundColor,
}) => {
  const isDark = isColorDark(backgroundColor);
  const textColor = isDark ? '#FFFFFF' : '#111111';
  const subtextColor = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)';

  const headline: string = data.headline || 'Titulo impactante.';
  const bodyText: string = data.bodyText || '';
  const highlightText: string = data.highlightText || '';
  const highlightStyle: string = data.highlightStyle || 'bold';
  const imageUrl: string = data.imageUrl || '';
  const footerText: string = data.footerText || '';
  const statNumber: string = data.statNumber || '';
  const statLabel: string = data.statLabel || '';
  const sourceText: string = data.sourceText || '';

  // Auto-size headline
  const headlineSize = (() => {
    const len = headline.length;
    if (len < 30) return 56;
    if (len < 60) return 46;
    if (len < 100) return 38;
    return 32;
  })();

  return (
    <div style={{
      width: '1080px', height: '1080px', backgroundColor,
      position: 'relative', overflow: 'hidden',
      display: 'flex',
      boxSizing: 'border-box',
    }}>
      <style dangerouslySetInnerHTML={{ __html: FONT_IMPORT }} />

      {/* Left side - Text */}
      <div style={{
        width: imageUrl ? '55%' : '100%',
        padding: '72px 56px',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between',
        boxSizing: 'border-box',
      }}>
        {/* Top: Headline */}
        <div>
          <h1 style={applyFontOverride({
            fontFamily: "'Playfair Display', serif",
            fontSize: `${headlineSize}px`,
            fontWeight: 800,
            color: textColor,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            margin: 0,
            whiteSpace: 'pre-wrap',
          }, data, 'headline')}>{headline}</h1>
        </div>

        {/* Middle: Body text */}
        <div style={{ margin: '32px 0' }}>
          {bodyText && (
            <p style={applyFontOverride({
              fontFamily: "'Inter', sans-serif",
              fontSize: '18px',
              fontWeight: 400,
              color: subtextColor,
              lineHeight: 1.7,
              margin: '0 0 24px 0',
            }, data, 'bodyText')}>{bodyText}</p>
          )}

          {/* Highlight stat/text */}
          {highlightText && (
            <div style={{
              borderLeft: `4px solid ${accentColor}`,
              paddingLeft: '20px',
              margin: '24px 0',
            }}>
              <p style={{
                fontFamily: highlightStyle === 'italic' ? "'Playfair Display', serif" : "'Inter', sans-serif",
                fontSize: '20px',
                fontWeight: highlightStyle === 'italic' ? 400 : 600,
                fontStyle: highlightStyle === 'italic' ? 'italic' : 'normal',
                color: textColor,
                lineHeight: 1.5,
                margin: 0,
              }}>{highlightText}</p>
            </div>
          )}

          {/* Stat number */}
          {statNumber && (
            <div style={{ margin: '24px 0' }}>
              <div style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: '48px',
                fontWeight: 800,
                fontStyle: 'italic',
                color: accentColor,
                lineHeight: 1,
              }}>{statNumber}</div>
              {statLabel && (
                <div style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '15px',
                  fontWeight: 500,
                  color: subtextColor,
                  marginTop: '8px',
                }}>{statLabel}</div>
              )}
            </div>
          )}

          {sourceText && (
            <p style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '13px',
              fontWeight: 400,
              color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)',
              margin: '16px 0 0',
            }}>({sourceText})</p>
          )}
        </div>

        {/* Bottom: Footer + Profile */}
        <div>
          {footerText && (
            <p style={applyFontOverride({
              fontFamily: "'Playfair Display', serif",
              fontSize: '28px',
              fontWeight: 800,
              color: textColor,
              lineHeight: 1.2,
              margin: '0 0 24px 0',
              textTransform: 'uppercase',
              letterSpacing: '-0.01em',
            }, data, 'footerText')}>{footerText}</p>
          )}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
          }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="" style={{
                width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover',
              }} />
            ) : (
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%',
                background: `linear-gradient(135deg, ${accentColor}, ${accentColor}80)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#FFFFFF', fontSize: '12px', fontWeight: 700,
                fontFamily: "'Inter', sans-serif",
              }}>
                {profileName.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
            )}
            <div>
              <div style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '12px', fontWeight: 700, color: textColor,
                letterSpacing: '0.05em', textTransform: 'uppercase',
              }}>{profileName.toUpperCase()}</div>
              <div style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '11px', fontWeight: 500, color: subtextColor,
              }}>{profileHandle}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Image */}
      {imageUrl && (
        <div style={{
          width: '45%',
          position: 'relative',
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
          {/* Gradient overlay blending image into background */}
          <div style={{
            position: 'absolute', top: 0, left: 0, bottom: 0,
            width: '80px',
            background: `linear-gradient(to right, ${backgroundColor}, transparent)`,
          }} />
        </div>
      )}
    </div>
  );
};
