import React, { useRef, useEffect, useState, useCallback } from 'react';
import { DarkTemplate } from '../../templates/DarkTemplate';
import { LightTemplate } from '../../templates/LightTemplate';
import type { PostData } from '../../types';

interface PostPreviewProps {
  data: PostData;
  onCanvasRef: (ref: HTMLDivElement | null) => void;
}

export const PostPreview: React.FC<PostPreviewProps> = ({ data, onCanvasRef }) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  const updateScale = useCallback(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;
      const scaleX = (containerWidth - 32) / 1080;
      const scaleY = (containerHeight - 32) / 1080;
      setScale(Math.min(scaleX, scaleY, 1));
    }
  }, []);

  useEffect(() => {
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [updateScale]);

  useEffect(() => {
    onCanvasRef(canvasRef.current);
  }, [onCanvasRef]);

  const fontSize = data.fontSize || (data.template === 'dark' ? 34 : 44);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${1080 * scale}px`,
          height: `${1080 * scale}px`,
          overflow: 'hidden',
          borderRadius: '8px',
          boxShadow: data.template === 'dark'
            ? '0 4px 24px rgba(255,255,255,0.05)'
            : '0 4px 24px rgba(0,0,0,0.15)',
        }}
      >
        <div
          ref={canvasRef}
          id="post-canvas"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          {data.template === 'dark' ? (
            <DarkTemplate
              text={data.text}
              fontSize={fontSize}
              fontStyle={data.fontStyle}
              profileName={data.profileName || 'Gabriel Maia'}
              profileHandle={data.profileHandle || '@drgabriel.maia'}
              avatarUrl={data.avatarUrl}
              imageUrl={data.imageUrl}
              imageOpacity={data.imageOpacity}
            />
          ) : (
            <LightTemplate
              text={data.text}
              fontSize={fontSize}
              fontStyle={data.fontStyle}
              highlightWord={data.highlightWord || ''}
              author={data.author || ''}
              profileName={data.profileName || 'Gabriel Maia'}
              profileHandle={data.profileHandle || '@drgabriel.maia'}
              avatarUrl={data.avatarUrl}
              imageUrl={data.imageUrl}
              imageOpacity={data.imageOpacity}
            />
          )}
        </div>
      </div>
    </div>
  );
};
