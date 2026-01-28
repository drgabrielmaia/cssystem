import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/auth'
import { SettingsProvider } from '@/contexts/settings'
import { OrganizationProvider } from '@/contexts/organization'
import { AppContent } from '@/components/app-content'
import { PendingInvitesProvider } from '@/components/pending-invites-provider'
import { ChunkErrorBoundary } from '@/components/chunk-error-boundary'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Customer Success Dashboard',
  description: 'Sistema de gestão para Customer Success',
  // Otimizar carregamento de recursos
  other: {
    'resource-preload-css': 'false',
    'preload-critical': 'true',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className={`${inter.className} h-full bg-gray-900 text-white dark`}>
        <ChunkErrorBoundary>
          <AuthProvider>
            <OrganizationProvider>
              <SettingsProvider>
                <PendingInvitesProvider>
                  <AppContent>{children}</AppContent>
                  <Toaster
                    theme="dark"
                    position="top-right"
                    toastOptions={{
                      style: {
                        background: '#1F2937',
                        color: '#F9FAFB',
                        border: '1px solid #374151',
                      },
                    }}
                  />
                </PendingInvitesProvider>
              </SettingsProvider>
            </OrganizationProvider>
          </AuthProvider>
        </ChunkErrorBoundary>

        {/* Script para otimizar carregamento e tratar erros de chunks */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined') {
                // Remover avisos de preload CSS desnecessários
                const originalWarn = console.warn;
                console.warn = function(...args) {
                  const message = args.join(' ');
                  if (message.includes('preloaded using link preload but not used')) {
                    return; // Suprimir este aviso específico
                  }
                  return originalWarn.apply(console, args);
                };

                // Tratamento de erro de chunks
                let chunkRetries = 0;
                const MAX_CHUNK_RETRIES = 3;
                const RETRY_DELAY = 1000; // 1 segundo

                // Detectar erros de carregamento de chunks
                function isChunkLoadError(error) {
                  return error && (
                    error.name === 'ChunkLoadError' ||
                    (error.message && (
                      error.message.includes('Loading chunk') ||
                      error.message.includes('Failed to import') ||
                      error.message.includes('Loading CSS chunk')
                    )) ||
                    (error.stack && error.stack.includes('chunk'))
                  );
                }

                // Handler global para erros não capturados
                window.addEventListener('error', function(event) {
                  if (isChunkLoadError(event.error) ||
                      (event.message && event.message.includes('Loading chunk'))) {
                    console.warn('ChunkLoadError detectado:', event.error || event.message);
                    handleChunkError();
                  }
                });

                // Handler para promises rejeitadas
                window.addEventListener('unhandledrejection', function(event) {
                  if (isChunkLoadError(event.reason)) {
                    console.warn('ChunkLoadError em promise:', event.reason);
                    event.preventDefault(); // Prevenir erro no console
                    handleChunkError();
                  }
                });

                function handleChunkError() {
                  chunkRetries++;

                  if (chunkRetries <= MAX_CHUNK_RETRIES) {
                    console.log('Tentativa ' + chunkRetries + ' de recarregamento devido a erro de chunk...');

                    // Mostrar feedback visual opcional
                    if (document.body) {
                      const notice = document.createElement('div');
                      notice.style.cssText = \`
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        background: #1F2937;
                        color: #F9FAFB;
                        padding: 12px 16px;
                        border-radius: 8px;
                        border: 1px solid #374151;
                        z-index: 9999;
                        font-size: 14px;
                      \`;
                      notice.textContent = 'Recarregando aplicação...';
                      document.body.appendChild(notice);

                      setTimeout(() => notice.remove(), 3000);
                    }

                    // Recarregar após delay
                    setTimeout(() => {
                      window.location.reload();
                    }, RETRY_DELAY);
                  } else {
                    console.error('Máximo de tentativas de recarregamento atingido');
                    // Reset counter após 5 minutos
                    setTimeout(() => {
                      chunkRetries = 0;
                    }, 300000);
                  }
                }

                // Reset contador quando a página carregar completamente
                window.addEventListener('load', function() {
                  chunkRetries = 0;
                });
              }
            `,
          }}
        />
      </body>
    </html>
  )
}