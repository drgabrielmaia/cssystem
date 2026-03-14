import React from 'react';
import type { TemplateRenderProps } from '../../types';
import { applyFontOverride } from './fontUtils';

const FONT_IMPORT = "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');";

export const EditorialSlideTemplate: React.FC<TemplateRenderProps> = ({
  data, profileName, profileHandle, avatarUrl, accentColor, backgroundColor,
}) => {
  const headline: string = data.headline || 'Headline principal aqui';
  const bodyText: string = data.bodyText || '';
  const imageUrl: string = data.imageUrl || '';
  const pageNum: string = data.pageNum || '01';
  const totalPages: string = data.totalPages || '10';
  const ctaText: string = data.ctaText || 'Deslize';
  const imageHeightPct: number = typeof data.imageHeight === 'number' ? data.imageHeight : 55;

  const bg = backgroundColor || '#F5F5F5';
  const blue = accentColor || '#2563EB';

  const imageHeightPx = Math.round(1080 * (imageHeightPct / 100));
  const bottomHeightPx = 1080 - imageHeightPx;

  // Auto-size headline
  const headlineSize = (() => {
    const len = headline.length;
    if (len < 40) return 72;
    if (len < 70) return 60;
    if (len < 100) return 48;
    return 38;
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

      {/* TOP: Image section */}
      <div style={{
        width: '1080px',
        height: `${imageHeightPx}px`,
        position: 'relative',
        flexShrink: 0,
        overflow: 'hidden',
        backgroundColor: '#D0D0D0',
      }}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            style={{
              width: '100%', height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        ) : (
          /* Gradient placeholder */
          <div style={{
            width: '100%', height: '100%',
            background: `linear-gradient(135deg, ${blue}33 0%, ${blue}11 50%, #E0E0E0 100%)`,
          }} />
        )}

        {/* Blue arrow button overlay at bottom-right */}
        <div style={{
          position: 'absolute',
          bottom: '24px',
          right: '24px',
          width: '64px', height: '64px',
          borderRadius: '50%',
          backgroundColor: blue,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </div>
      </div>

      {/* BOTTOM: Text section */}
      <div style={{
        flex: 1,
        display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '40px 56px 44px',
        boxSizing: 'border-box',
      }}>
        {/* Headline + body */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h1 style={applyFontOverride({
            fontFamily: "'Inter', sans-serif",
            fontSize: `${headlineSize}px`,
            fontWeight: 800,
            color: '#111111',
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            margin: 0,
          }, data, 'headline')}>
            {headline}
          </h1>
          {bodyText && (
            <p style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '26px',
              fontWeight: 400,
              color: '#888888',
              lineHeight: 1.4,
              margin: '20px 0 0 0',
            }}>
              {bodyText}
            </p>
          )}
        </div>

        {/* Bottom row: page counter pill + CTA pill */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '32px',
        }}>
          {/* Page counter badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center',
            backgroundColor: blue,
            color: '#FFFFFF',
            borderRadius: '999px',
            padding: '10px 24px',
            fontFamily: "'Inter', sans-serif",
            fontSize: '22px',
            fontWeight: 700,
            letterSpacing: '0.01em',
          }}>
            {pageNum} - {totalPages}
          </div>

          {/* CTA pill */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '10px',
            backgroundColor: blue,
            color: '#FFFFFF',
            borderRadius: '999px',
            padding: '10px 28px',
            fontFamily: "'Inter', sans-serif",
            fontSize: '22px',
            fontWeight: 700,
          }}>
            {ctaText}
            <span style={{ fontSize: '22px' }}>☞</span>
          </div>
        </div>
      </div>
    </div>
  );
};
