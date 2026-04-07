// app/(main)/dashboard/page.tsx
import { createClient } from '../../../../utils/supabase/server'
import { redirect } from 'next/navigation'
import CommissionsPage from './dashboard-client'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('subscription_status, plan_tier, trial_access_until')
    .eq('id', user.id)
    .single()

  if (error) redirect('/')
  const trialUntil = profile?.trial_access_until
    ? new Date(profile.trial_access_until as string).getTime()
    : 0
  const trialExpired =
    profile?.plan_tier === 'trial' && trialUntil > 0 && trialUntil < Date.now()
  if (profile?.subscription_status !== 'active' || trialExpired) redirect('/minha-conta/renovar')

  return <CommissionsPage />
}
