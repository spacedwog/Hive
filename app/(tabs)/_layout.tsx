import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/HapticTab.tsx';
import { IconSymbol } from '@/components/ui/IconSymbol.tsx';
import TabBarBackground from '@/components/ui/TabBarBackground.tsx';
import { Colors } from '@/constants/Colors.ts';
import { useColorScheme } from '@/hooks/useColorScheme.ts';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            // Use a transparent background on iOS to show the blur effect
            position: 'absolute',
          },
          default: {},
        }),
      }}>
      <Tabs.Screen
        name="HiveScreen"
        options={{
          title: 'Hive Prime',
          tabBarIcon: ({ color }: { color: string }) => <IconSymbol size={28} name="apple.intelligence" color={color} />,
        }}
      />
      <Tabs.Screen
        name="StreamScreen"
        options={{
          title: 'Hive Cam',
          tabBarIcon: ({ color }: { color: string }) => <IconSymbol size={28} name="airplayaudio" color={color} />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tela Principal',
          tabBarIcon: ({ color }: { color: string }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="IssuesScreen"
        options={{
          title: 'Hive Issues',
          tabBarIcon: ({ color }: { color: string }) => <IconSymbol size={28} name="exclamationmark.bubble" color={color} />,
        }}
      />
    </Tabs>
  );
}
