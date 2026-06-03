'use client';
// SPDX-License-Identifier: MIT

// Ported 1:1 from mobile/components/profile/ProfileHeader.tsx.
import React from 'react';

interface ProfileHeaderProps {
  email: string;
  createdAt?: string;
}

const MONTHS = [
  'Januar', 'Februar', 'Maerz', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

function formatMemberSince(dateStr: string): string {
  const date = new Date(dateStr);
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function getInitial(email: string): string {
  return (email[0] ?? '?').toUpperCase();
}

export function ProfileHeader({ email, createdAt }: ProfileHeaderProps) {
  const initial = getInitial(email);
  const memberSince = createdAt ? formatMemberSince(createdAt) : undefined;

  return (
    <div className="flex flex-col items-center py-6 px-4">
      <div className="w-20 h-20 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: '#F5F6F8' }}>
        <span className="text-primary text-3xl font-bold">{initial}</span>
      </div>
      <p className="text-text-secondary text-base mb-1">{email}</p>
      {memberSince && <p className="text-text-muted text-xs">Mitglied seit {memberSince}</p>}
    </div>
  );
}

export default ProfileHeader;
