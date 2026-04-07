'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import LoginModal from './LoginModal'
import type { LoginModalMode } from './login-modal-types'

type Ctx = {
  openLogin: () => void
  openTrialSignup: () => void
}

const LoginModalContext = createContext<Ctx | null>(null)

export function useLoginModal(): Ctx {
  const v = useContext(LoginModalContext)
  if (!v) {
    throw new Error('useLoginModal deve ser usado dentro de LoginModalProvider')
  }
  return v
}

export function LoginModalProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<LoginModalMode>('login')

  const openLogin = useCallback(() => {
    setMode('login')
    setOpen(true)
  }, [])

  const openTrialSignup = useCallback(() => {
    setMode('trial-signup')
    setOpen(true)
  }, [])

  const value = useMemo(() => ({ openLogin, openTrialSignup }), [openLogin, openTrialSignup])

  return (
    <LoginModalContext.Provider value={value}>
      {children}
      {open && <LoginModal key={mode} initialMode={mode} onClose={() => setOpen(false)} />}
    </LoginModalContext.Provider>
  )
}
