// SPDX-License-Identifier: MIT
import { Tabs } from 'expo-router';
import { Calendar, MessageCircle, Settings } from 'lucide-react-native';
import { Colors } from '@athletly/shared';
import { useAthleteProfile } from '@/lib/use-profile';

const TAB_BAR_STYLE = {
  backgroundColor: '#FFFFFF',
  borderTopWidth: 0,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: -1 },
  shadowOpacity: 0.04,
  shadowRadius: 4,
  elevation: 3,
} as const;

const TAB_BAR_LABEL_STYLE = { fontSize: 10 } as const;

export default function TabLayout() {
  const { onboardingCompleted, isLoading } = useAthleteProfile();
  const chatBadge = !isLoading && !onboardingCompleted ? '1' : undefined;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: TAB_BAR_STYLE,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.tabInactive,
        tabBarLabelStyle: TAB_BAR_LABEL_STYLE,
      }}
    >
      <Tabs.Screen
        name="plan"
        options={{
          title: 'Plan',
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => <MessageCircle size={size} color={color} />,
          tabBarBadge: chatBadge,
          tabBarBadgeStyle: {
            backgroundColor: Colors.error,
            color: '#FFFFFF',
            fontSize: 11,
            fontWeight: '600',
          },
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Einstellungen',
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
