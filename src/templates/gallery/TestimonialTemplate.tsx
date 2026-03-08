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

export const TestimonialTemplate: React.FC<TemplateRenderProps> = ({
  data, profileName, profileHandle, avatarUrl, accentColor, backgroundColor,
}) => {
  const isDark = isColorDark(backgroundColor);
  const textColor = isDark ? '#FFFFFF' : '#111111';
  const subtextColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)';
  const headline = data.headline || 'Titulo aqui';
  const highlightWord = data.highlightWord || '';
  const chatMessages: Array<{ text: string; isUser: boolean; senderName?: string; senderTag?: string }> = data.chatMessages || [
    { text: 'Mensagem de exemplo aqui...', isUser: false, senderName: 'Mentorada' },
  ];
  const footerText = data.footerText || '';

  const renderHeadline = () => {
    if (!highlightWord) {
      return <span>{headline}</span>;
    }
    const idx = headline.toLowerCase().indexOf(highlightWord.toLowerCase());
    if (idx === -1) return <span>{headline}</span>;
    return (
      <>
        {headline.slice(0, idx)}
        <span style={{ color: accentColor, fontStyle: 'italic' }}>{headline.slice(idx, idx + highlightWord.length)}</span>
        {headline.slice(idx + highlightWord.length)}
      </>
    );
  };

  return (
    <div style={{
      width: '1080px', height: '1080px', backgroundColor,
      position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      padding: '72px 64px',
      boxSizing: 'border-box',
    }}>
      <style dangerouslySetInnerHTML={{ __html: FONT_IMPORT }} />

      {/* Headline */}
      <div style={{ flexShrink: 0 }}>
        <h1 style={applyFontOverride({
          fontFamily: "'Playfair Display', serif",
          fontSize: headline.length > 40 ? '52px' : '64px',
          fontWeight: 700,
          color: textColor,
          lineHeight: 1.1,
          letterSpacing: '-0.02em',
          margin: 0,
        }, data, 'headline')}>
          {renderHeadline()}
        </h1>
        <div style={{
          width: '48px', height: '4px', background: accentColor,
          borderRadius: '2px', marginTop: '24px',
        }} />
      </div>

      {/* WhatsApp chat bubble */}
      <div style={{
        flex: 1,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        gap: '8px', padding: '32px 0',
      }}>
        <div style={{
          background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
          borderRadius: '16px',
          padding: '20px',
          maxWidth: '85%',
          alignSelf: 'center',
        }}>
          {chatMessages.map((msg, i) => (
            <div key={i} style={{ marginBottom: i < chatMessages.length - 1 ? '12px' : 0 }}>
              {msg.senderName && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  marginBottom: '6px',
                }}>
                  <span style={{
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: '14px', fontWeight: 600,
                    color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)',
                  }}>{msg.senderName}</span>
                  {msg.senderTag && (
                    <span style={{
                      fontFamily: "'Montserrat', sans-serif",
                      fontSize: '12px', fontWeight: 600,
                      color: accentColor,
                    }}>{msg.senderTag}</span>
                  )}
                </div>
              )}
              <div style={{
                background: msg.isUser
                  ? '#005C4B'
                  : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                borderRadius: '12px',
                padding: '14px 18px',
              }}>
                <p style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: '18px',
                  fontWeight: 500,
                  color: msg.isUser ? '#FFFFFF' : textColor,
                  lineHeight: 1.5,
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                }}>{msg.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        flexShrink: 0,
        display: 'flex', flexDirection: 'column', gap: '16px',
      }}>
        {footerText && (
          <p style={applyFontOverride({
            fontFamily: "'Montserrat', sans-serif",
            fontSize: '20px', fontWeight: 500,
            color: subtextColor, lineHeight: 1.4, margin: 0,
          }, data, 'footerText')}>{footerText}</p>
        )}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="" style={{
                width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover',
              }} />
            ) : (
              <div style={{
                width: '48px', height: '48px', borderRadius: '50%',
                background: `linear-gradient(135deg, ${accentColor}, ${accentColor}80)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#FFFFFF', fontSize: '18px', fontWeight: 700,
                fontFamily: "'Montserrat', sans-serif",
              }}>
                {profileName.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
            )}
            <div>
              <div style={{
                fontFamily: "'Montserrat', sans-serif",
                fontSize: '16px', fontWeight: 700, color: textColor,
                letterSpacing: '0.05em', textTransform: 'uppercase' as const,
              }}>{profileName.toUpperCase()}</div>
              <div style={{
                fontFamily: "'Montserrat', sans-serif",
                fontSize: '13px', fontWeight: 500, color: subtextColor,
              }}>{profileHandle}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
