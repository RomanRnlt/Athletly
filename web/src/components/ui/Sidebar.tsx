'use client';
// SPDX-License-Identifier: MIT

// Desktop-only left navigation rail. Replaces the bottom TabBar on md+ screens.
// Brand wordmark at the top, primary nav (Plan, Chat, Settings) in the middle,
// and account/profile access pinned to the bottom. The Chat item carries the
// same onboarding "1" badge as the mobile TabBar.
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Calendar,
  MessageCircle,
  Settings,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { BRAND_GRADIENT, Colors } from '@athletly/shared';
import { useAthleteProfile } from '@/lib/use-profile';
import { useAuth } from '@/lib/use-auth';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';

interface NavDef {
  href: string;
  labelKey: MessageKey;
  icon: LucideIcon;
}

const NAV: NavDef[] = [
  { href: '/plan', labelKey: 'nav.plan', icon: Calendar },
  { href: '/chat', labelKey: 'nav.chat', icon: MessageCircle },
  { href: '/settings', labelKey: 'nav.settings', icon: Settings },
];

function getInitial(email: string | undefined): string {
  return (email?.[0] ?? 'A').toUpperCase();
}

export function Sidebar() {
  const t = useT();
  const pathname = usePathname();
  const { onboardingCompleted, isLoading } = useAthleteProfile();
  const { session } = useAuth();
  const showChatBadge = !isLoading && !onboardingCompleted;
  const email = session?.user?.email;

  return (
    <aside className="hidden md:flex md:flex-col w-[248px] lg:w-[264px] shrink-0 h-full border-r border-divider bg-surface">
      {/* Brand wordmark */}
      <div className="px-6 pt-7 pb-6 flex items-center gap-2.5">
        <span
          className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0"
          style={{ background: BRAND_GRADIENT }}
        >
          <Sparkles size={17} color="#FFFFFF" strokeWidth={2.2} />
        </span>
        <span className="text-text-primary text-xl font-bold tracking-tight">Athletly</span>
      </div>

      {/* Primary navigation */}
      <nav className="flex-1 min-h-0 px-3 flex flex-col gap-1">
        {NAV.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          const showBadge = item.href === '/chat' && showChatBadge;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={[
                'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors',
                active
                  ? 'bg-primary-ultra-light text-primary font-semibold'
                  : 'text-text-secondary hover:bg-surface-nested hover:text-text-primary font-medium',
              ].join(' ')}
            >
              <Icon
                size={20}
                color={active ? Colors.primary : Colors.textSecondary}
                strokeWidth={active ? 2.3 : 2}
              />
              <span className="text-[15px]">{t(item.labelKey)}</span>
              {showBadge && (
                <span
                  className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: Colors.error }}
                >
                  <span className="text-white font-semibold" style={{ fontSize: 11 }}>
                    1
                  </span>
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Account / profile access */}
      <div className="p-3 border-t border-divider">
        <Link
          href="/athlete-profile"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-nested transition-colors"
        >
          <span
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: Colors.surfaceNested }}
          >
            <span className="text-primary text-sm font-bold">{getInitial(email)}</span>
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-text-primary text-sm font-semibold truncate">
              {email ?? t('nav.athleteFallback')}
            </span>
            <span className="block text-text-muted text-xs">{t('nav.viewProfile')}</span>
          </span>
        </Link>
      </div>
    </aside>
  );
}

export default Sidebar;
