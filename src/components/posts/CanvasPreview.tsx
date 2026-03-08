"use client";

import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { exportPostAsPng, exportPostAsPngSafe } from '@/utils/exportImage';

interface CanvasPreviewProps {
  children: React.ReactNode;
  className?: string;
}

export interface CanvasPreviewHandle {
  exportPng: (filename?: string) => Promise<void>;
}

const CanvasPreview = forwardRef<CanvasPreviewHandle, CanvasPreviewProps>(
  ({ children, className = '' }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(0.5);

    useEffect(() => {
      const updateScale = () => {
        if (containerRef.current) {
          const w = containerRef.current.clientWidth;
          const h = containerRef.current.clientHeight;
          setScale(Math.min((w - 16) / 1080, (h - 16) / 1080, 1));
        }
      };
      updateScale();
      const ro = new ResizeObserver(updateScale);
      if (containerRef.current) ro.observe(containerRef.current);
      return () => ro.disconnect();
    }, []);

    const exportPng = useCallback(async (filename?: string) => {
      if (!canvasRef.current) return;
      const el = canvasRef.current;
      const origTransform = el.style.transform;
      el.style.transform = 'none';
      el.offsetHeight;
      const fname = filename || `post-${Date.now()}.png`;
      try {
        await exportPostAsPng(el, fname);
      } catch {
        await exportPostAsPngSafe(el, fname);
      }
      el.style.transform = origTransform;
    }, []);

    useImperativeHandle(ref, () => ({ exportPng }), [exportPng]);

    return (
      <div ref={containerRef} className={`flex items-center justify-center bg-[#0a0a0c] overflow-hidden ${className}`}>
        <div style={{
          width: `${1080 * scale}px`,
          height: `${1080 * scale}px`,
          overflow: 'hidden',
          borderRadius: '8px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
        }}>
          <div ref={canvasRef} style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
            {children}
          </div>
        </div>
      </div>
    );
  }
);

CanvasPreview.displayName = 'CanvasPreview';
export default CanvasPreview;
