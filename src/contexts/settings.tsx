'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

interface UserSettings {
  id: string
  user_id: string
  meta_leads_mes: number
  meta_vendas_mes: number
  meta_faturamento_mes: number
  meta_arrecadacao_mes: number
  meta_calls_mes: number
  meta_follow_ups_mes: number
  taxa_conversao_ideal: number
  notificacao_email: boolean
  notificacao_whatsapp: boolean
  notificacao_follow_ups: boolean
  auto_create_follow_ups: boolean
  tema: 'light' | 'dark'
  cor_primaria: string
}

const defaultSettings: UserSettings = {
  id: '',
  user_id: 'default_user',
  meta_leads_mes: 100,
  meta_vendas_mes: 10,
  meta_faturamento_mes: 500000, // R$ 500k
  meta_arrecadacao_mes: 250000, // R$ 250k (50%)
  meta_calls_mes: 50,
  meta_follow_ups_mes: 200,
  taxa_conversao_ideal: 10, // 10%
  notificacao_email: true,
  notificacao_whatsapp: true,
  notificacao_follow_ups: true,
  auto_create_follow_ups: true,
  tema: 'light',
  cor_primaria: '#3b82f6'
}

interface SettingsContextType {
  settings: UserSettings
  updateSettings: (newSettings: Partial<UserSettings>) => void
  refreshSettings: () => void
  loading: boolean
}

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  updateSettings: () => {},
  refreshSettings: () => {},
  loading: true
})

export const useSettings = () => {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}

interface SettingsProviderProps {
  children: ReactNode
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings)
  const [loading, setLoading] = useState(true)

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', 'default_user')
        .single()

      if (error && error.code !== 'PGRST116') { // Not found error
        console.error('Erro ao carregar configurações:', error)
        return
      }

      if (data) {
        setSettings(data)
      }
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    const updatedSettings = { ...settings, ...newSettings }

    // Aplicar mudanças imediatamente na interface
    setSettings(updatedSettings)

    // Aplicar variáveis CSS imediatamente se forem mudanças visuais
    if (newSettings.cor_primaria || newSettings.tema) {
      const root = document.documentElement
      if (newSettings.cor_primaria) {
        // Converter hex para RGB para o CSS
        const hexToRgb = (hex: string) => {
          const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
          return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
          } : null
        }

        const rgb = hexToRgb(newSettings.cor_primaria)
        root.style.setProperty('--primary-color', newSettings.cor_primaria)
        if (rgb) {
          root.style.setProperty('--primary-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`)
        }
      }
      if (newSettings.tema) {
        root.style.setProperty('--theme', newSettings.tema)
        // Aplicar classe do tema no body
        document.body.className = document.body.className.replace(/theme-\w+/g, '')
        document.body.classList.add(`theme-${newSettings.tema}`)
      }
    }

    // Atualizar no banco em background
    try {
      const { user_id, ...settingsData } = updatedSettings

      const { error } = await supabase
        .from('user_settings')
        .upsert([{
          user_id: 'default_user',
          ...settingsData,
          updated_at: new Date().toISOString()
        }], { onConflict: 'user_id' })

      if (error) {
        console.error('Erro ao atualizar configurações:', error)
        // Não reverter para manter a experiência fluida
        // Apenas logar o erro
      }
    } catch (error) {
      console.error('Erro:', error)
      // Não reverter para manter a experiência fluida
    }
  }

  const refreshSettings = () => {
    loadSettings()
  }

  useEffect(() => {
    loadSettings()
  }, [])

  // Aplicar variáveis CSS globais para tema
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--primary-color', settings.cor_primaria)
    root.style.setProperty('--theme', settings.tema)

    // Adicionar classe do tema no body
    document.body.className = document.body.className.replace(/theme-\w+/g, '')
    document.body.classList.add(`theme-${settings.tema}`)
  }, [settings.cor_primaria, settings.tema])

  return (
    <SettingsContext.Provider value={{
      settings,
      updateSettings,
      refreshSettings,
      loading
    }}>
      {children}
    </SettingsContext.Provider>
  )
}