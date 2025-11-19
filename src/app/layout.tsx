import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/auth'
import { SettingsProvider } from '@/contexts/settings'
import { AppContent } from '@/components/app-content'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Customer Success Dashboard',
  description: 'Sistema de gestão para Customer Success',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className={`${inter.className} h-full bg-slate-950`}>
        <AuthProvider>
          <SettingsProvider>
            <AppContent>{children}</AppContent>
          </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  )
}