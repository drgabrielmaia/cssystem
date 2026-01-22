import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/auth'
import { SettingsProvider } from '@/contexts/settings'
import { OrganizationProvider } from '@/contexts/organization'
import { AppContent } from '@/components/app-content'
import { PendingInvitesProvider } from '@/components/pending-invites-provider'
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

        {/* Script simples para otimizar carregamento */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Remover avisos de preload CSS desnecessários
              if (typeof window !== 'undefined') {
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