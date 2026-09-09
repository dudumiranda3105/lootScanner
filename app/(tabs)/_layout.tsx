import { Tabs } from 'expo-router';
import React from 'react';

import { ICON } from '../../src/components/icons';
import { Icon } from '../../src/components/ui';
import { colors, font } from '../../src/theme/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bgElevated },
        headerTintColor: colors.text,
        headerTitleStyle: {
          color: colors.text,
          fontFamily: font.display,
          fontSize: 17,
          letterSpacing: 0.5,
        },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: colors.bgElevated,
          borderTopColor: colors.border,
          height: 62,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarLabelStyle: { fontFamily: font.monoBold, fontSize: 10 },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inventário',
          tabBarIcon: ({ color, size }) => (
            <Icon name={ICON.inventario} size={size - 2} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="scan"
        options={{
          title: 'Escanear',
          tabBarIcon: ({ color, size }) => (
            <Icon name={ICON.escanear} size={size - 2} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="mural"
        options={{
          title: 'Mural',
          tabBarIcon: ({ color, size }) => <Icon name={ICON.mural} size={size - 2} color={color} />,
        }}
      />

      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => <Icon name={ICON.perfil} size={size - 2} color={color} />,
        }}
      />
    </Tabs>
  );
}
