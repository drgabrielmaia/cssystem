// ============================================================
// ARQUIVO: src/components/posts/ExportButton.tsx
// ============================================================

import React, { useState } from 'react';
import { exportPostAsPng, exportPostAsPngSafe } from '../../utils/exportImage';

/**
 * PROCESSO DE EXPORT:
 * 
 * 1. Pega a ref do canvas (1080x1080)
 * 2. TEMPORARIAMENTE remove o CSS transform scale
 * 3. Chama toPng com width/height 1080
 * 4. Restaura o scale
 * 5. Faz download
 * 
 * Se a primeira tentativa falhar com fontes erradas,
 * usa o método "safe" que faz double-render.
 */

interface ExportButtonProps {
  canvasRef: HTMLDivElement | null;
  template: 'dark' | 'light';
}

export const ExportButton: React.FC<ExportButtonProps> = ({ canvasRef, template }) => {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!canvasRef) return;
    setExporting(true);

    try {
      // Salva o transform atual
      const originalTransform = canvasRef.style.transform;
      const originalTransformOrigin = canvasRef.style.transformOrigin;

      // REMOVE o scale para capturar em tamanho real
      canvasRef.style.transform = 'none';
      canvasRef.style.transformOrigin = 'top left';

      // Força reflow
      canvasRef.offsetHeight;

      const timestamp = Date.now();
      const filename = `post-${template}-${timestamp}.png`;

      try {
        await exportPostAsPng(canvasRef, filename);
      } catch {
        // Fallback: double render
        console.warn('Primeiro export falhou, tentando safe mode...');
        await exportPostAsPngSafe(canvasRef, filename);
      }

      // Restaura o transform
      canvasRef.style.transform = originalTransform;
      canvasRef.style.transformOrigin = originalTransformOrigin;
    } catch (error) {
      console.error('Erro ao exportar:', error);
      alert('Erro ao exportar imagem. Tente novamente.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      style={{
        width: '100%',
        padding: '14px 24px',
        backgroundColor: exporting ? '#14532D' : '#16A34A',
        color: '#FFFFFF',
        border: 'none',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: 600,
        cursor: exporting ? 'not-allowed' : 'pointer',
        transition: 'background-color 150ms',
        fontFamily: "'Inter', sans-serif",
      }}
      onMouseEnter={(e) => {
        if (!exporting) e.currentTarget.style.backgroundColor = '#15803D';
      }}
      onMouseLeave={(e) => {
        if (!exporting) e.currentTarget.style.backgroundColor = '#16A34A';
      }}
    >
      {exporting ? 'Exportando...' : 'Exportar PNG 1080×1080'}
    </button>
  );
};