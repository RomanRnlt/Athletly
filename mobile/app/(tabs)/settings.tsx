import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import {
  Activity,
  Heart,
  Bell,
  Globe,
  Moon,
  Lock,
  HelpCircle,
  LogOut,
} from 'lucide-react-native';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { Card } from '@/components/ui/Card';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { SettingsRow } from '@/components/profile/SettingsRow';
import { ServiceStatus } from '@/components/profile/ServiceStatus';
import { mockUser } from '@/lib/mock-data';

function SectionTitle({ children }: { children: string }) {
  return (
    <Text className="text-text-muted text-xs font-semibold uppercase tracking-wide px-4 mb-2 mt-4">
      {children}
    </Text>
  );
}

export default function SettingsScreen() {
  return (
    <View className="flex-1 bg-background">
      <GradientHeader title="Einstellungen" />

      <ScrollView className="flex-1" contentContainerClassName="pb-8">
        <ProfileHeader email={mockUser.email} createdAt={mockUser.createdAt} />

        <SectionTitle>Verbundene Dienste</SectionTitle>
        <View className="mx-4">
          <Card variant="standard" className="p-0 overflow-hidden">
            <ServiceStatus
              name="Garmin Connect"
              icon={Activity}
              isConnected={true}
              lastSync={new Date(Date.now() - 1000 * 60 * 42).toISOString()}
            />
            <ServiceStatus
              name="Apple Health"
              icon={Heart}
              isConnected={false}
              onConnect={() => {}}
              isLast
            />
          </Card>
        </View>

        <SectionTitle>Einstellungen</SectionTitle>
        <View className="mx-4">
          <Card variant="standard" className="p-0 overflow-hidden">
            <SettingsRow icon={Bell} label="Benachrichtigungen" value="An" onPress={() => {}} />
            <SettingsRow icon={Globe} label="Sprache" value="Deutsch" onPress={() => {}} />
            <SettingsRow icon={Moon} label="Erscheinungsbild" value="Hell" onPress={() => {}} isLast />
          </Card>
        </View>

        <SectionTitle>Account</SectionTitle>
        <View className="mx-4">
          <Card variant="standard" className="p-0 overflow-hidden">
            <SettingsRow icon={Lock} label="Datenschutz" onPress={() => {}} />
            <SettingsRow icon={HelpCircle} label="Hilfe & Support" onPress={() => {}} />
            <SettingsRow icon={LogOut} label="Abmelden" onPress={() => {}} isDestructive isLast />
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}
