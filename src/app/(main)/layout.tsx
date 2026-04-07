// app/(main)/layout.tsx
'use client'

import { Header } from '../components/layout/Header'
import { Footer } from '../components/layout/Footer'
import { LoginModalProvider, useLoginModal } from '../components/auth/LoginModalProvider'

function MainChrome({ children }: { children: React.ReactNode }) {
  const { openLogin } = useLoginModal()
  return (
    <div className="flex min-h-screen flex-col">
      <Header onLoginClick={openLogin} />
      <main className="flex-grow">{children}</main>
      <Footer />
    </div>
  )
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <LoginModalProvider>
      <MainChrome>{children}</MainChrome>
    </LoginModalProvider>
  )
}
