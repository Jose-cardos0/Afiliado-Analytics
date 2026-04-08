// app/minha-conta/renovar/page.tsx
import Link from 'next/link'
import Image from 'next/image'
import { ExternalLink, AlertTriangle } from 'lucide-react'
import { redirect } from 'next/navigation'
import { createClient } from '../../../../utils/supabase/server'
import { LogoutButton } from './LogoutButton'

const kiwifyLoginUrl = 'https://dashboard.kiwify.com/login?lang=pt'
const whatsappUrl = 'https://wa.me/5579999144028'

const checkoutPadrao = 'https://pay.kiwify.com.br/Q1eE7t8'
const checkoutPro = 'https://pay.kiwify.com.br/y7I4SuT'

export default async function RenewPage({
  searchParams,
}: {
  searchParams: Promise<{ precisa_plano?: string }>
}) {
  const sp = await searchParams
  const precisaPlano = sp.precisa_plano === '1'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('subscription_status, plan_tier, trial_access_until')
    .eq('id', user.id)
    .single()

  const trialUntil = profile?.trial_access_until
    ? new Date(profile.trial_access_until as string).getTime()
    : 0
  const trialExpired =
    profile?.plan_tier === 'trial' &&
    trialUntil > 0 &&
    trialUntil < Date.now()

  // Igual ao `dashboard/page.tsx`: com trial expirado não pode mandar de volta ao dashboard
  // só porque `subscription_status` ainda é `active` (cron ainda não pôs `canceled`).
  if (
    !error &&
    profile?.subscription_status === 'active' &&
    !precisaPlano &&
    !trialExpired
  ) {
    redirect('/dashboard')
  }

  const upgradeMode = Boolean(
    !error && profile?.subscription_status === 'active' && precisaPlano
  )

  return (
    <div className="bg-dark-bg min-h-screen flex flex-col items-center justify-center font-sans p-4">

      {/* Logo */}
        <Image
          src="/logo.png"
          alt="Afiliado Analytics"
          width={240}
          height={40}
          priority
          className="object-contain"
        />

      {/* Card — shadow-md para sombra mais suave */}
      <div className="max-w-md w-full bg-dark-card border border-dark-border rounded-2xl shadow-md overflow-hidden">

        {/* Corpo */}
        <div className="px-6 py-8 text-center">

          {/* Ícone central */}
          <div className="mx-auto mb-5 h-16 w-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-amber-400" />
          </div>

          <h1 className="text-xl font-bold text-text-primary mb-3">
            {upgradeMode ? 'Recurso do plano pago' : 'Sua assinatura expirou'}
          </h1>
          <p className="text-text-secondary text-sm leading-relaxed mb-8">
            {upgradeMode
              ? 'Esta área faz parte dos planos Padrão ou Pro. Assine para desbloquear GPL, ATI, automação de grupos e muito mais.'
              : 'Seu acesso ao dashboard foi pausado. Escolha um plano abaixo para voltar a usar todas as ferramentas. Use o mesmo e-mail da sua conta ao pagar na Kiwify.'}
          </p>

          <div className="flex flex-col gap-3 mb-2">
            <Link
              href={checkoutPro}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-shopee-orange to-orange-500 py-3 px-4 text-base font-bold text-white shadow-lg transition-transform hover:scale-[1.02]"
            >
              Assinar Pro
              <ExternalLink className="h-4 w-4" />
            </Link>
            <Link
              href={checkoutPadrao}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dark-border bg-dark-bg/60 py-3 px-4 text-base font-semibold text-text-primary transition-transform hover:scale-[1.01]"
            >
              Assinar Padrão
              <ExternalLink className="h-4 w-4" />
            </Link>
            {upgradeMode ? (
              <Link
                href="/dashboard"
                className="text-sm text-shopee-orange hover:underline mt-1"
              >
                Voltar ao dashboard
              </Link>
            ) : (
              <>
                <p className="mt-4 text-xs text-text-secondary">
                  Já assina ou precisa reativar na Kiwify?
                </p>
                <Link
                  href={kiwifyLoginUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dark-border py-3 px-4 text-sm font-semibold text-text-primary transition-colors hover:bg-white/5"
                >
                  Gerenciar assinatura na Kiwify
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </>
            )}
          </div>

          <div className="my-5 flex items-center gap-3">
            <span className="flex-1 h-px bg-dark-border" />
            <span className="text-xs text-text-secondary">ou</span>
            <span className="flex-1 h-px bg-dark-border" />
          </div>

          {/* Botão de logout — Client Component */}
          <LogoutButton />
        </div>

        {/* Rodapé do card */}
        <div className="px-6 py-4 border-t border-dark-border bg-dark-bg/40 text-center">
          <p className="text-xs text-text-secondary">
            Dúvidas?{' '}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-shopee-orange hover:underline"
            >
           Chame no WhatsApp
            </a>
          </p>
        </div>
      </div>

      {/* Copyright */}
      <p className="mt-8 text-xs text-text-secondary/60">
        © 2026 Afiliado Analytics. Todos os direitos reservados.
      </p>
    </div>
  )
}
