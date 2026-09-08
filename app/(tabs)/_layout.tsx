import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { colors, font } from '../../src/theme/theme';

/** Ícone das abas: emoji em vez de uma biblioteca de ícones, para não pesar o bundle. */
function TabEmblem({ emblem, focused }: { emblem: string; focused: boolean }) {
  return <Text style={[styles.emblem, focused && styles.emblemFocused]}>{emblem}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bgElevated },
        headerTintColor: colors.text,
        headerTitleStyle: { color: colors.text, fontWeight: '800', letterSpacing: 0.5 },
        tabBarStyle: {
          backgroundColor: colors.bgElevated,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarLabelStyle: { fontFamily: font.mono, fontSize: 11, fontWeight: '700' },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inventário',
          tabBarIcon: ({ focused }) => <TabEmblem emblem="🎒" focused={focused} />,
        }}
      />

      <Tabs.Screen
        name="scan"
        options={{
          title: 'Escanear',
          tabBarIcon: ({ focused }) => <TabEmblem emblem="📷" focused={focused} />,
        }}
      />

      <Tabs.Screen
        name="mural"
        options={{
          title: 'Mural',
          tabBarIcon: ({ focused }) => <TabEmblem emblem="📜" focused={focused} />,
        }}
      />

      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ focused }) => <TabEmblem emblem="🛡️" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  emblem: {
    fontSize: 20,
    opacity: 0.5,
  },
  emblemFocused: {
    opacity: 1,
  },
});
