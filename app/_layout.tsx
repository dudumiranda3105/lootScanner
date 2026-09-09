// Importadas pelo subcaminho de cada peso, e não pela raiz do pacote: importar
// `@expo-google-fonts/cinzel` puxaria os 6 pesos da família (e os 20 do mono)
// para dentro do app, uns 2,8 MB de fonte que nunca seriam usados.
import { Cinzel_700Bold } from '@expo-google-fonts/cinzel/700Bold';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono/400Regular';
import { JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono/700Bold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DATABASE_NAME, migrate } from '../src/db/schema';
import { AuthProvider } from '../src/hooks/useAuth';
import { InventoryProvider } from '../src/hooks/useInventory';
import { colors, font } from '../src/theme/theme';

// Segura a splash até as fontes carregarem, para o app não aparecer por um
// instante com a fonte do sistema e depois trocar na cara do usuário.
void SplashScreen.preventAutoHideAsync();

/**
 * Layout raiz do app.
 *
 * A ordem dos provedores importa: o <SQLiteProvider> abre o banco e roda as
 * migrações antes de montar os filhos (enquanto isso ele renderiza nada), então
 * o <InventoryProvider> já encontra a conexão pronta em `useSQLiteContext()`.
 */
export default function RootLayout() {
  const [fontesProntas, erroFonte] = useFonts({
    Cinzel_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_700Bold,
  });

  useEffect(() => {
    // Se a fonte falhar, seguimos com a do sistema — melhor do que travar na splash.
    if (fontesProntas || erroFonte) void SplashScreen.hideAsync();
  }, [fontesProntas, erroFonte]);

  if (!fontesProntas && !erroFonte) return null;

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
                headerTitleStyle: {
                  color: colors.text,
                  fontFamily: font.display,
                  fontSize: 17,
                },
                headerShadowVisible: false,
                contentStyle: { backgroundColor: colors.bg },
                animation: 'slide_from_right',
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

              <Stack.Screen
                name="item/[id]"
                options={{ title: 'Ficha do item', headerBackTitle: 'Voltar' }}
              />

              <Stack.Screen
                name="login"
                options={{
                  title: 'Conta de caçador',
                  presentation: 'modal',
                  animation: 'slide_from_bottom',
                }}
              />
            </Stack>
          </InventoryProvider>
        </AuthProvider>
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}
