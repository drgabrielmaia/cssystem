// ============================================================
// ARQUIVO: src/utils/exportImage.ts
// ============================================================

import { toPng } from 'html-to-image';

/**
 * PONTO CRÍTICO: html-to-image precisa de configurações específicas
 * para gerar 1080x1080 com fidelidade total.
 * 
 * O SEGREDO é:
 * 1. O elemento DOM deve ter EXATAMENTE 1080x1080 em tamanho real
 * 2. Usar pixelRatio: 1 (porque já está em tamanho real)
 * 3. Carregar fontes antes de capturar
 * 4. Incluir backgroundColor explícito
 */
export async function exportPostAsPng(
  element: HTMLElement,
  filename: string
): Promise<void> {
  // Aguarda fontes carregarem (ESSENCIAL para Inter não sair como fallback)
  await document.fonts.ready;

  // Aguarda próximo frame de renderização
  await new Promise(resolve => requestAnimationFrame(resolve));
  // Mais um frame para garantir
  await new Promise(resolve => requestAnimationFrame(resolve));

  const dataUrl = await toPng(element, {
    // ===== CONFIGURAÇÕES OBRIGATÓRIAS =====
    width: 1080,              // Largura exata do output
    height: 1080,             // Altura exata do output
    pixelRatio: 1,            // NÃO usar 2 ou 3, o elemento já tem 1080px reais
    cacheBust: true,          // Evita cache de imagens antigas
    skipAutoScale: true,      // Não deixa a lib redimensionar
    
    // ===== QUALIDADE =====
    quality: 1.0,             // Máxima qualidade (apesar de ser PNG, afeta encoding)
    
    // ===== FONTES =====
    // Inclui a fonte Inter inline no SVG gerado
    fontEmbedCSS: `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    `,
    
    // ===== FILTRO DE NODOS =====
    // Remove elementos que não devem aparecer na imagem
    filter: (node: HTMLElement) => {
      // Remove scrollbars, tooltips, etc.
      if (node.classList?.contains('no-export')) return false;
      return true;
    },

    // ===== ESTILO INLINE FORÇADO =====
    // Garante que estilos computados são capturados
    style: {
      margin: '0',
      padding: '0',
      transform: 'none',        // REMOVE qualquer scale do preview
      transformOrigin: 'top left',
      overflow: 'hidden',
    },
  });

  // Download
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

/**
 * ALTERNATIVA: Se html-to-image falhar com fontes,
 * usar esta versão que faz double-render
 */
export async function exportPostAsPngSafe(
  element: HTMLElement,
  filename: string
): Promise<void> {
  await document.fonts.ready;

  // Primeiro render (warm up — força o browser a resolver fontes)
  await toPng(element, { width: 1080, height: 1080, pixelRatio: 1 });
  
  // Pequeno delay
  await new Promise(resolve => setTimeout(resolve, 100));

  // Segundo render (agora com fontes resolvidas)
  const dataUrl = await toPng(element, {
    width: 1080,
    height: 1080,
    pixelRatio: 1,
    cacheBust: true,
    skipAutoScale: true,
    quality: 1.0,
  });

  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}