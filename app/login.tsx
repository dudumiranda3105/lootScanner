import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import React, { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Notice, TextField } from '../src/components/form';
import { ICON } from '../src/components/icons';
import { Body, Button, Card, Divider, Icon, Label, Title } from '../src/components/ui';
import { useAuth } from '../src/hooks/useAuth';
import { useInventory } from '../src/hooks/useInventory';
import { supabase } from '../src/services/supabase';
import { syncNow } from '../src/services/sync';
import { colors, spacing } from '../src/theme/theme';

type Modo = 'entrar' | 'cadastrar';

export default function LoginScreen() {
  const db = useSQLiteContext();
  const { signIn, signUp, configured } = useAuth();
  const { refresh } = useInventory();

  const [modo, setModo] = useState<Modo>('entrar');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nomeCacador, setNomeCacador] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = useCallback(async () => {
    setEnviando(true);
    setErro(null);

    try {
      if (modo === 'entrar') {
        await signIn(email, senha);
      } else {
        await signUp(email, senha, nomeCacador);
      }

      // Entrou: já sobe o que estava pendente e traz o mural.
      const { data } = await supabase!.auth.getUser();
      await syncNow(db, data.user?.id ?? null);
      await refresh();

      router.back();
    } catch (error) {
      setErro(error instanceof Error ? error.message : String(error));
      setEnviando(false);
    }
  }, [modo, email, senha, nomeCacador, signIn, signUp, db, refresh]);

  if (!configured) {
    return (
      <View style={styles.tela}>
        <Card style={styles.cartao}>
          <Title>Supabase não configurado</Title>
          <Body>
            Para usar o mural coletivo, copie o arquivo .env.example para .env, preencha
            EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY com os dados do seu projeto e
            reinicie o bundler com: npx expo start --clear
          </Body>
          <Body>O inventário local continua funcionando normalmente sem isso.</Body>
          <Button label="Voltar" tone="ghost" onPress={() => router.back()} />
        </Card>
      </View>
    );
  }

  const cadastrando = modo === 'cadastrar';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.tela}
    >
      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        <Card style={styles.cartao}>
          <View style={styles.brasao}>
            <Icon name="crown-outline" size={30} color={colors.gold} />
          </View>

          <Label>{cadastrando ? 'Nova conta' : 'Bem-vindo de volta'}</Label>
          <Title>{cadastrando ? 'Criar caçador' : 'Entrar'}</Title>
          <Body>
            A conta serve para publicar seus achados no mural coletivo e ver o que outras pessoas
            encontraram na instituição.
          </Body>

          <Divider />

          {cadastrando ? (
            <TextField
              label="Nome de caçador"
              icon="account-outline"
              placeholder="Como você aparece no mural"
              value={nomeCacador}
              onChangeText={setNomeCacador}
              autoCapitalize="words"
            />
          ) : null}

          <TextField
            label="E-mail"
            icon="email-outline"
            placeholder="voce@escola.edu.br"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            inputMode="email"
            keyboardType="email-address"
          />

          <TextField
            label="Senha"
            icon="lock-outline"
            placeholder="mínimo de 6 caracteres"
            value={senha}
            onChangeText={setSenha}
            secureTextEntry
            autoCapitalize="none"
          />

          {erro ? <Notice tone="error">{erro}</Notice> : null}

          <Button
            label={cadastrando ? 'Criar conta' : 'Entrar'}
            icon={cadastrando ? 'account-plus-outline' : ICON.entrar}
            onPress={enviar}
            loading={enviando}
            disabled={!email.trim() || senha.length < 6}
          />

          <Button
            label={cadastrando ? 'Já tenho conta' : 'Criar uma conta'}
            tone="ghost"
            onPress={() => {
              setModo(cadastrando ? 'entrar' : 'cadastrar');
              setErro(null);
            }}
          />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  tela: {
    backgroundColor: colors.bg,
    flex: 1,
    justifyContent: 'center',
  },
  conteudo: {
    justifyContent: 'center',
    padding: spacing.lg,
  },
  cartao: {
    gap: spacing.md,
  },
  brasao: {
    alignItems: 'center',
    alignSelf: 'center',
    borderColor: colors.goldDim,
    borderRadius: 999,
    borderWidth: 1,
    height: 62,
    justifyContent: 'center',
    marginBottom: spacing.sm,
    width: 62,
  },
});
