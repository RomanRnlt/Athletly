'use client';
// SPDX-License-Identifier: MIT

// Web port of mobile/components/profile/ServiceStatus.tsx.
import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Colors } from '@athletly/shared';
import { useT, type TranslateFn } from '@/i18n';

interface ServiceStatusProps {
  name: string;
  icon: LucideIcon;
  isConnected: boolean;
  lastSync?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  isLast?: boolean;
}

function formatLastSync(t: TranslateFn, dateStr: string): string {
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return t('time.justNow');
  if (diffMin < 60) return t('time.minutesAgo', { n: diffMin });

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return t('time.hoursAgo', { n: diffHours });

  const diffDays = Math.floor(diffHours / 24);
  return diffDays > 1 ? t('time.daysAgoMany', { n: diffDays }) : t('time.daysAgoOne', { n: diffDays });
}

export function ServiceStatus({
  name,
  icon: Icon,
  isConnected,
  lastSync,
  onConnect,
  onDisconnect,
  isLast = false,
}: ServiceStatusProps) {
  const t = useT();
  const borderClass = isLast ? '' : 'border-b border-divider';

  return (
    <div className={`flex flex-row items-center py-3.5 px-4 ${borderClass}`}>
      <span className="w-8 flex items-center justify-center mr-3">
        <Icon size={20} color={Colors.textSecondary} />
      </span>

      <div className="flex-1">
        <div className="flex flex-row items-center gap-2 mb-0.5">
          <span className="text-base text-text-primary">{name}</span>
          {isConnected ? (
            <Badge type="status" status="success" label={t('common.connected')} />
          ) : (
            <span className="inline-block rounded-full px-3 py-1" style={{ backgroundColor: '#94A3B815' }}>
              <span className="text-xs font-semibold text-text-muted">{t('common.notConnected')}</span>
            </span>
          )}
        </div>
        {isConnected && lastSync && (
          <p className="text-xs text-text-muted">{t('serviceStatus.lastSync', { time: formatLastSync(t, lastSync) })}</p>
        )}
      </div>

      {isConnected && onDisconnect && (
        <Button variant="ghost" size="sm" label={t('common.disconnect')} onPress={onDisconnect} />
      )}
      {!isConnected && onConnect && (
        <Button variant="ghost" size="sm" label={t('common.connect')} onPress={onConnect} />
      )}
    </div>
  );
}

export default ServiceStatus;
