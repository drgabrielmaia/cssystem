'use client'

import { useState, useEffect } from 'react'

const REMEMBER_LOGIN_KEY = 'remember_last_login'

interface RememberedLogin {
  email: string
  remember: boolean
}

export function useRememberLogin() {
  const [rememberedLogin, setRememberedLogin] = useState<RememberedLogin | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(REMEMBER_LOGIN_KEY)
      if (stored) {
        const remembered = JSON.parse(stored) as RememberedLogin
        setRememberedLogin(remembered)
      }
    } catch (error) {
      console.error('Erro ao carregar login lembrado:', error)
    }
  }, [])

  const rememberLogin = (email: string, remember: boolean) => {
    try {
      if (remember) {
        const data: RememberedLogin = { email, remember }
        localStorage.setItem(REMEMBER_LOGIN_KEY, JSON.stringify(data))
        setRememberedLogin(data)
      } else {
        localStorage.removeItem(REMEMBER_LOGIN_KEY)
        setRememberedLogin(null)
      }
    } catch (error) {
      console.error('Erro ao salvar login lembrado:', error)
    }
  }

  const clearRememberedLogin = () => {
    try {
      localStorage.removeItem(REMEMBER_LOGIN_KEY)
      setRememberedLogin(null)
    } catch (error) {
      console.error('Erro ao limpar login lembrado:', error)
    }
  }

  return {
    rememberedLogin,
    rememberLogin,
    clearRememberedLogin
  }
}