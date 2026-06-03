// SPDX-License-Identifier: MIT
import React from 'react';
import { View, Text } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Colors } from '@athletly/shared';

interface ServiceStatusProps {
  name: string;
  icon: React.ComponentType<{ size: number; color: string }>;
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
    <View className={`flex-row items-center py-3.5 px-4 ${borderClass}`}>
      <View className="w-8 items-center mr-3">
        <Icon size={20} color={Colors.textSecondary} />
      </View>

      <View className="flex-1">
        <View className="flex-row items-center gap-2 mb-0.5">
          <Text className="text-base text-text-primary">{name}</Text>
          {isConnected ? (
            <Badge type="status" status="success" label="Verbunden" />
          ) : (
            <View className="rounded-full px-3 py-1" style={{ backgroundColor: '#94A3B815' }}>
              <Text className="text-xs font-semibold text-text-muted">Nicht verbunden</Text>
            </View>
          )}
        </View>
        {isConnected && lastSync && (
          <Text className="text-xs text-text-muted">Letzte Sync: {formatLastSync(lastSync)}</Text>
        )}
      </View>

      {isConnected && onDisconnect && (
        <Button variant="ghost" size="sm" label="Trennen" onPress={onDisconnect} />
      )}
      {!isConnected && onConnect && (
        <Button variant="ghost" size="sm" label="Verbinden" onPress={onConnect} />
      )}
    </View>
  );
}

export default ServiceStatus;
