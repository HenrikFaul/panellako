'use client';

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
            const isActive = activeSection === tab.id;
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
