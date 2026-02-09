import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/auth'
import { SettingsProvider } from '@/contexts/settings'
import { OrganizationProvider } from '@/contexts/organization'
import { CloserAuthProvider } from '@/contexts/closer-auth'
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
    <html lang="pt-BR" className="h-full" suppressHydrationWarning={true}>
      <body className={`${inter.className} h-full bg-gray-900 text-white dark`} suppressHydrationWarning={true}>
        <ChunkErrorBoundary>
          <AuthProvider>
            <CloserAuthProvider>
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
            </CloserAuthProvider>
          </AuthProvider>
        </ChunkErrorBoundary>

        {/* Script simples para suprimir warnings */}
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
              }
            `,
          }}
        />
      </body>
    </html>
  )
}