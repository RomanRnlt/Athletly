'use client';
// SPDX-License-Identifier: MIT

// Web port of the bottom tab bar from mobile/app/(tabs)/_layout.tsx. Three
// tabs (Plan, Chat, Settings); the Chat tab shows a red "1" badge while
// onboarding is incomplete, matching the mobile tabBarBadge logic.
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, MessageCircle, Settings, type LucideIcon } from 'lucide-react';
import { Colors } from '@athletly/shared';
import { useAthleteProfile } from '@/lib/use-profile';

interface TabDef {
  href: string;
  label: string;
  icon: LucideIcon;
}

const TABS: TabDef[] = [
  { href: '/plan', label: 'Plan', icon: Calendar },
  { href: '/chat', label: 'Chat', icon: MessageCircle },
  { href: '/settings', label: 'Einstellungen', icon: Settings },
];

export function TabBar() {
  const pathname = usePathname();
  const { onboardingCompleted, isLoading } = useAthleteProfile();
  const showChatBadge = !isLoading && !onboardingCompleted;

  return (
    <nav
      className="bg-white flex flex-row"
      style={{ boxShadow: '0 -1px 4px rgba(0,0,0,0.04)' }}
    >
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        const color = active ? Colors.primary : Colors.tabInactive;
        const Icon = tab.icon;
        const showBadge = tab.href === '/chat' && showChatBadge;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex-1 flex flex-col items-center justify-center py-2 relative"
          >
            <span className="relative">
              <Icon size={24} color={color} />
              {showBadge && (
                <span
                  className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: Colors.error }}
                >
                  <span className="text-white font-semibold" style={{ fontSize: 11 }}>
                    1
                  </span>
                </span>
              )}
            </span>
            <span style={{ color, fontSize: 10 }} className="mt-0.5">
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export default TabBar;
