// SPDX-License-Identifier: MIT
import React from 'react';
import { View, Text } from 'react-native';

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
    <View className="items-center py-6 px-4">
      <View
        className="w-20 h-20 rounded-full items-center justify-center mb-3"
        style={{ backgroundColor: '#F5F6F8' }}
      >
        <Text className="text-primary text-3xl font-bold">{initial}</Text>
      </View>
      <Text className="text-text-secondary text-base mb-1">{email}</Text>
      {memberSince && (
        <Text className="text-text-muted text-xs">Mitglied seit {memberSince}</Text>
      )}
    </View>
  );
}

export default ProfileHeader;
