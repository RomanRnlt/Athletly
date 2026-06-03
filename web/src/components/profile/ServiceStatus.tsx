'use client';
// SPDX-License-Identifier: MIT

// Web port of mobile/components/profile/ServiceStatus.tsx.
import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Colors } from '@athletly/shared';

interface ServiceStatusProps {
  name: string;
  icon: LucideIcon;
  isConnected: boolean;
  lastSync?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  isLast?: boolean;
}

function formatLastSync(dateStr: string): string {
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return 'Gerade eben';
  if (diffMin < 60) return `Vor ${diffMin} Min.`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Vor ${diffHours} Std.`;

  const diffDays = Math.floor(diffHours / 24);
  return `Vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''}`;
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
            <Badge type="status" status="success" label="Verbunden" />
          ) : (
            <span className="inline-block rounded-full px-3 py-1" style={{ backgroundColor: '#94A3B815' }}>
              <span className="text-xs font-semibold text-text-muted">Nicht verbunden</span>
            </span>
          )}
        </div>
        {isConnected && lastSync && (
          <p className="text-xs text-text-muted">Letzte Sync: {formatLastSync(lastSync)}</p>
        )}
      </div>

      {isConnected && onDisconnect && (
        <Button variant="ghost" size="sm" label="Trennen" onPress={onDisconnect} />
      )}
      {!isConnected && onConnect && (
        <Button variant="ghost" size="sm" label="Verbinden" onPress={onConnect} />
      )}
    </div>
  );
}

export default ServiceStatus;
