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
  const footerText = data.footerText || '';

  return (
    <div style={{
      width: '1080px', height: '1080px', backgroundColor,
      position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      padding: '72px 56px',
      boxSizing: 'border-box',
    }}>
      <style dangerouslySetInnerHTML={{ __html: FONT_IMPORT }} />

      {/* Headline */}
      <div style={{ textAlign: 'center', marginBottom: '48px', flexShrink: 0 }}>
        <h1 style={{
          fontFamily: "'Montserrat', sans-serif",
          fontSize: '48px', fontWeight: 400,
          color: textColor, lineHeight: 1.2, margin: 0,
        }}>
          {headline}
        </h1>
        {subheadline && (
          <h2 style={{
            fontFamily: "'Montserrat', sans-serif",
            fontSize: '48px', fontWeight: 800,
            color: textColor, lineHeight: 1.2, margin: 0,
          }}>
            {subheadline}
          </h2>
        )}
      </div>

      {/* Comparison cards */}
      <div style={{
        flex: 1, display: 'flex', gap: '24px',
        alignItems: 'stretch',
      }}>
        {/* Left card */}
        <div style={{
          flex: 1,
          background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
          borderRadius: '20px',
          padding: '36px 28px',
          display: 'flex', flexDirection: 'column',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
            background: leftColor,
          }} />
          <div style={{ marginBottom: '16px' }}>
            <div style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: '20px', fontWeight: 400,
              color: subtextColor, lineHeight: 1.3,
            }}>Medico</div>
            <div style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: '28px', fontWeight: 800,
              color: textColor, lineHeight: 1.2,
            }}>{leftTitle}</div>
            {leftSubtitle && (
              <div style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '16px', fontWeight: 500,
                color: subtextColor, marginTop: '6px',
              }}>{leftSubtitle}</div>
            )}
          </div>
          {leftItems.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: 'auto' }}>
              {leftItems.map((item: string, i: number) => (
                <div key={i} style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '16px', fontWeight: 500,
                  color: subtextColor, lineHeight: 1.4,
                  display: 'flex', alignItems: 'flex-start', gap: '8px',
                }}>
                  <span style={{ color: leftColor, flexShrink: 0 }}>-</span>
                  {item}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right card */}
        <div style={{
          flex: 1,
          background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
          borderRadius: '20px',
          padding: '36px 28px',
          display: 'flex', flexDirection: 'column',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
            background: rightColor,
          }} />
          <div style={{ marginBottom: '16px' }}>
            <div style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: '20px', fontWeight: 400,
              color: subtextColor, lineHeight: 1.3,
            }}>Medico</div>
            <div style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: '28px', fontWeight: 800,
              color: textColor, lineHeight: 1.2,
            }}>{rightTitle}</div>
            {rightSubtitle && (
              <div style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '16px', fontWeight: 500,
                color: subtextColor, marginTop: '6px',
              }}>{rightSubtitle}</div>
            )}
          </div>
          {rightItems.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: 'auto' }}>
              {rightItems.map((item: string, i: number) => (
                <div key={i} style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '16px', fontWeight: 500,
                  color: subtextColor, lineHeight: 1.4,
                  display: 'flex', alignItems: 'flex-start', gap: '8px',
                }}>
                  <span style={{ color: rightColor, flexShrink: 0 }}>+</span>
                  {item}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        marginTop: '32px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {footerText && (
          <p style={{
            fontFamily: "'Montserrat', sans-serif",
            fontSize: '18px', fontWeight: 500,
            color: subtextColor, margin: 0,
          }}>{footerText}</p>
        )}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          marginLeft: 'auto',
        }}>
          <div style={{
            fontFamily: "'Montserrat', sans-serif",
            fontSize: '14px', fontWeight: 700, color: textColor,
            letterSpacing: '0.05em', textTransform: 'uppercase' as const,
          }}>{profileName.toUpperCase()}</div>
          <span style={{
            fontFamily: "'Montserrat', sans-serif",
            fontSize: '12px', fontWeight: 500, color: subtextColor,
          }}>{profileHandle}</span>
        </div>
      </div>
    </div>
  );
};
