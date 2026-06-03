'use client';
// SPDX-License-Identifier: MIT

// Ported 1:1 from mobile/components/plan/RestDayCard.tsx.
import React from 'react';
import { Moon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Colors } from '@athletly/shared';
import { useT } from '@/i18n';

interface RestDayCardProps {
  message?: string;
}

export function RestDayCard({ message }: RestDayCardProps) {
  const t = useT();
  return (
    <Card variant="nested" className="mb-3 flex flex-col items-center py-8">
      <Moon size={40} color={Colors.textMuted} strokeWidth={1.5} />

      <p className="text-text-primary text-lg font-semibold mt-4">{t('restDay.title')}</p>

      <p className="text-text-secondary text-sm text-center mt-2 px-4 leading-5">
        {message ?? t('restDay.body')}
      </p>
    </Card>
  );
}

export default RestDayCard;
