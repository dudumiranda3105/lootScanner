import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DATABASE_NAME, migrate } from '../src/db/schema';
import { AuthProvider } from '../src/hooks/useAuth';
import { InventoryProvider } from '../src/hooks/useInventory';
import { colors } from '../src/theme/theme';

/**
 * Layout raiz do app.
 *
 * A ordem dos provedores importa: o <SQLiteProvider> abre o banco e roda as
 * migrações antes de montar os filhos (enquanto isso ele renderiza nada), então
 * o <InventoryProvider> já encontra a conexão pronta em `useSQLiteContext()`.
 */
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />

      <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrate}>
        <AuthProvider>
          <InventoryProvider>
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: colors.bgElevated },
                headerTintColor: colors.gold,
                headerTitleStyle: { color: colors.text, fontWeight: '800' },
                contentStyle: { backgroundColor: colors.bg },
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

              <Stack.Screen
                name="item/[id]"
                options={{ title: 'Ficha do item', headerBackTitle: 'Voltar' }}
              />

              <Stack.Screen
                name="login"
                options={{ title: 'Conta de caçador', presentation: 'modal' }}
              />
            </Stack>
          </InventoryProvider>
        </AuthProvider>
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}
