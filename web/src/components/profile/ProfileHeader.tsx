'use client';
// SPDX-License-Identifier: MIT

// Ported 1:1 from mobile/components/profile/ProfileHeader.tsx.
import React from 'react';
import { useI18n } from '@/i18n';
import { monthName } from '@/lib/datetime';

interface ProfileHeaderProps {
  email: string;
  createdAt?: string;
}

function getInitial(email: string): string {
  return (email[0] ?? '?').toUpperCase();
}

export function ProfileHeader({ email, createdAt }: ProfileHeaderProps) {
  const { t, intlLocale } = useI18n();
  const initial = getInitial(email);
  const memberSince = createdAt
    ? (() => {
        const date = new Date(createdAt);
        return `${monthName(intlLocale, date.getMonth())} ${date.getFullYear()}`;
      })()
    : undefined;

  return (
    <div className="flex flex-col items-center py-6 px-4">
      <div className="w-20 h-20 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: '#F5F6F8' }}>
        <span className="text-primary text-3xl font-bold">{initial}</span>
      </div>
      <p className="text-text-secondary text-base mb-1">{email}</p>
      {memberSince && <p className="text-text-muted text-xs">{t('profileHeader.memberSince', { date: memberSince })}</p>}
    </div>
  );
}

export default ProfileHeader;
