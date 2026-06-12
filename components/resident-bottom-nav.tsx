'use client';

import { useEffect, useState } from 'react';
import { Newspaper, Wrench, CircleDollarSign, FileText, UserRound } from 'lucide-react';

interface ResidentBottomNavProps {
  activeSection?: string;
}

const TABS = [
  { id: 'overview',  label: 'Hírek',    icon: Newspaper },
  { id: 'tickets',   label: 'Hibajegy', icon: Wrench },
  { id: 'finances',  label: 'Egyenleg', icon: CircleDollarSign },
  { id: 'documents', label: 'Iroda',    icon: FileText },
  { id: 'profile',   label: 'Profil',   icon: UserRound },
] as const;

export default function ResidentBottomNav({ activeSection }: ResidentBottomNavProps) {
  // Scroll-spy (v0.9.33): the activeSection prop was never wired up by any
  // caller, so the active highlight never appeared. Track the section nearest
  // the viewport top with an IntersectionObserver instead; an explicit prop
  // still wins when provided.
  const [spied, setSpied] = useState<string | undefined>(undefined);

  useEffect(() => {
    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visible.set(entry.target.id, entry.intersectionRatio);
          } else {
            visible.delete(entry.target.id);
          }
        }
        if (visible.size > 0) {
          const top = Array.from(visible.entries()).sort((a, b) => b[1] - a[1])[0];
          setSpied(top[0]);
        }
      },
      { rootMargin: '-15% 0px -55% 0px', threshold: [0, 0.2, 0.5] }
    );
    let observedAny = false;
    for (const tab of TABS) {
      const el = document.getElementById(tab.id);
      if (el) {
        observer.observe(el);
        observedAny = true;
      }
    }
    if (!observedAny) return () => observer.disconnect();
    return () => observer.disconnect();
  }, []);

  const current = activeSection ?? spied;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 sm:hidden"
      aria-label="Lakói gyorsnavigáció"
    >
      {/* Safe-area padding for iPhone home bar */}
      <div className="glass border-t border-white/[0.08]">
        <div className="flex items-stretch" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = current === tab.id;
            return (
              <a
                key={tab.id}
                href={`#${tab.id}`}
                className={`flex flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2.5 text-center transition-colors active:bg-white/[0.04] ${
                  isActive
                    ? 'text-brand-400'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.2 : 1.8}
                  className={isActive ? 'text-brand-400' : 'text-slate-500'}
                />
                <span className={`text-[10px] font-semibold leading-none ${isActive ? 'text-brand-400' : ''}`}>
                  {tab.label}
                </span>
              </a>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
