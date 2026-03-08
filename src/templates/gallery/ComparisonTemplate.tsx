import React from 'react';
import type { TemplateRenderProps } from '../../types';
import { applyFontOverride } from './fontUtils';

const FONT_IMPORT = "@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap');";

function isColorDark(hex: string): boolean {
  const c = hex.replace('#', '');
  if (c.length < 6) return true;
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
}

export const ComparisonTemplate: React.FC<TemplateRenderProps> = ({
  data, profileName, profileHandle, avatarUrl, accentColor, backgroundColor,
}) => {
  const isDark = isColorDark(backgroundColor);
  const textColor = isDark ? '#FFFFFF' : '#111111';
  const subtextColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)';
  const headline = data.headline || 'Dois caminhos.';
  const subheadline = data.subheadline || 'Mesma formacao.';
  const leftTitle = data.leftTitle || 'Opcao A';
  const rightTitle = data.rightTitle || 'Opcao B';
  const leftSubtitle = data.leftSubtitle || '';
  const rightSubtitle = data.rightSubtitle || '';
  const leftColor = data.leftColor || '#EF4444';
  const rightColor = data.rightColor || accentColor;
  const leftItems: string[] = data.leftItems || [];
  const rightItems: string[] = data.rightItems || [];
  const leftImageUrl: string = data.leftImageUrl || '';
  const rightImageUrl: string = data.rightImageUrl || '';
  const footerText = data.footerText || '';

  // Check if we have images to adjust layout
  const hasImages = leftImageUrl || rightImageUrl;
  const hasItems = leftItems.length > 0 || rightItems.length > 0;

  // Auto-size title based on content density
  const titleSize = (() => {
    if (hasImages && hasItems) return 22;
    if (hasImages) return 24;
    if (hasItems && (leftItems.length > 3 || rightItems.length > 3)) return 24;
    return 28;
  })();

  // Auto-size items based on count
  const itemFontSize = (() => {
    const maxItems = Math.max(leftItems.length, rightItems.length);
    if (maxItems > 5) return 13;
    if (maxItems > 3) return 14;
    return 16;
  })();

  // Image height based on whether we also have items
  const imageHeight = hasItems ? '180px' : '280px';

  const renderCard = (
    side: 'left' | 'right',
    color: string,
    title: string,
    subtitle: string,
    items: string[],
    imageUrl: string,
  ) => (
    <div style={{
      flex: 1,
      background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
      borderRadius: '20px',
      display: 'flex', flexDirection: 'column',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Color bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
        background: color,
      }} />

      {/* Title area */}
      <div style={{ padding: '32px 28px 0', flexShrink: 0 }}>
        <div style={{
          fontFamily: "'Montserrat', sans-serif",
          fontSize: '18px', fontWeight: 400,
          color: subtextColor, lineHeight: 1.3,
        }}>Medico</div>
        <div style={{
          fontFamily: "'Montserrat', sans-serif",
          fontSize: `${titleSize}px`, fontWeight: 800,
          color: textColor, lineHeight: 1.2,
        }}>{title}</div>
        {subtitle && (
          <div style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '15px', fontWeight: 500,
            color: subtextColor, marginTop: '6px',
          }}>{subtitle}</div>
        )}
      </div>

      {/* Image area */}
      {imageUrl && (
        <div style={{
          padding: '16px 28px 0',
          flexShrink: 0,
        }}>
          <div style={{
            width: '100%', height: imageHeight,
            borderRadius: '12px', overflow: 'hidden',
            background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
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
        </div>
      )}

      {/* Items list */}
      {items.length > 0 && (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: '8px',
          padding: '16px 28px',
          marginTop: imageUrl ? '0' : 'auto',
          flex: imageUrl ? undefined : 1,
          justifyContent: imageUrl ? undefined : 'flex-end',
        }}>
          {items.map((item: string, i: number) => (
            <div key={i} style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: `${itemFontSize}px`, fontWeight: 500,
              color: subtextColor, lineHeight: 1.4,
              display: 'flex', alignItems: 'flex-start', gap: '8px',
            }}>
              <span style={{ color, flexShrink: 0, fontWeight: 700 }}>
                {side === 'left' ? '−' : '+'}
              </span>
              {item}
            </div>
          ))}
        </div>
      )}

      {/* Bottom padding if no items */}
      {items.length === 0 && (
        <div style={{ padding: '0 0 28px' }} />
      )}
    </div>
  );

  return (
    <div style={{
      width: '1080px', height: '1080px', backgroundColor,
      position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      padding: '64px 48px',
      boxSizing: 'border-box',
    }}>
      <style dangerouslySetInnerHTML={{ __html: FONT_IMPORT }} />

      {/* Headline */}
      <div style={{ textAlign: 'center', marginBottom: '40px', flexShrink: 0 }}>
        <h1 style={applyFontOverride({
          fontFamily: "'Montserrat', sans-serif",
          fontSize: '46px', fontWeight: 400,
          color: textColor, lineHeight: 1.2, margin: 0,
        }, data, 'headline')}>
          {headline}
        </h1>
        {subheadline && (
          <h2 style={applyFontOverride({
            fontFamily: "'Montserrat', sans-serif",
            fontSize: '46px', fontWeight: 800,
            color: textColor, lineHeight: 1.2, margin: 0,
          }, data, 'subheadline')}>
            {subheadline}
          </h2>
        )}
      </div>

      {/* Comparison cards */}
      <div style={{
        flex: 1, display: 'flex', gap: '24px',
        alignItems: 'stretch',
        minHeight: 0,
      }}>
        {renderCard('left', leftColor, leftTitle, leftSubtitle, leftItems, leftImageUrl)}
        {renderCard('right', rightColor, rightTitle, rightSubtitle, rightItems, rightImageUrl)}
      </div>

      {/* Footer */}
      <div style={{
        marginTop: '28px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {footerText && (
          <p style={applyFontOverride({
            fontFamily: "'Montserrat', sans-serif",
            fontSize: '18px', fontWeight: 500,
            color: subtextColor, margin: 0,
            flex: 1,
          }, data, 'footerText')}>{footerText}</p>
        )}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          marginLeft: 'auto',
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
            <span style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: '11px', fontWeight: 500, color: subtextColor,
            }}>{profileHandle}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
