import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { LogOut } from 'lucide-react';
import Logo from '@/components/logo';
import OnboardingClient from '@/components/onboarding-client';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Közösségi onboarding',
  robots: { index: false, follow: false },
};

export default async function OnboardingPage() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login?next=%2Fonboarding');
  }

  const displayName = typeof user.user_metadata.full_name === 'string'
    ? user.user_metadata.full_name
    : user.email ?? '';

  return (
    <div className="app-surface min-h-screen">
      <header className="border-b border-canvas-line bg-white/95 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Logo className="h-10 w-10 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-canvas-ink">PanelLakó</p>
              <p className="truncate text-xs text-canvas-muted">{displayName}</p>
            </div>
          </div>
          <form action="/auth/signout" method="post">
            <button type="submit" className="btn-secondary min-h-11 px-3">
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Kilépés</span>
            </button>
          </form>
        </div>
      </header>

      <OnboardingClient />
    </div>
  );
}
