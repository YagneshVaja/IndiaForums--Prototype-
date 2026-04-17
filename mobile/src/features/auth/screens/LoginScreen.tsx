import React from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, ScrollView, Platform, ActivityIndicator,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../../navigation/types';
import { useLogin } from '../hooks/useAuth';
import { extractApiError } from '../../../services/api';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;
type FormData = { email: string; password: string };

export default function LoginScreen({ navigation }: Props) {
  const { control, handleSubmit, formState: { errors } } = useForm<FormData>();
  const { mutate: login, isPending, error } = useLogin();

  const onSubmit = (data: FormData) => login(data);

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>IndiaForums</Text>
        <Text style={styles.heading}>Welcome back</Text>

        <Controller
          control={control}
          name="email"
          rules={{ required: 'Email is required', pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' } }}
          render={({ field: { onChange, value } }) => (
            <View style={styles.fieldWrap}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                onChangeText={onChange}
                value={value}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                placeholder="you@example.com"
                placeholderTextColor="#9E9E9E"
              />
              {errors.email && <Text style={styles.fieldError}>{errors.email.message}</Text>}
            </View>
          )}
        />

        <Controller
          control={control}
          name="password"
          rules={{ required: 'Password is required' }}
          render={({ field: { onChange, value } }) => (
            <View style={styles.fieldWrap}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={[styles.input, errors.password && styles.inputError]}
                onChangeText={onChange}
                value={value}
                secureTextEntry
                autoComplete="password"
                placeholder="••••••••"
                placeholderTextColor="#9E9E9E"
              />
              {errors.password && <Text style={styles.fieldError}>{errors.password.message}</Text>}
            </View>
          )}
        />

        {error && <Text style={styles.apiError}>{extractApiError(error)}</Text>}

        <Pressable style={[styles.button, isPending && styles.buttonDisabled]} onPress={handleSubmit(onSubmit)} disabled={isPending}>
          {isPending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Sign In</Text>}
        </Pressable>

        <Pressable onPress={() => navigation.navigate('ForgotPassword')} hitSlop={8}>
          <Text style={styles.link}>Forgot password?</Text>
        </Pressable>

        <View style={styles.registerRow}>
          <Text style={styles.registerText}>Don't have an account? </Text>
          <Pressable onPress={() => navigation.navigate('Register')} hitSlop={8}>
            <Text style={styles.link}>Register</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:           { flex: 1, backgroundColor: '#F5F6F7' },
  scroll:         { flexGrow: 1, padding: 24, paddingTop: 64 },
  logo:           { fontSize: 22, fontWeight: '800', color: '#3558F0', marginBottom: 32 },
  heading:        { fontSize: 28, fontWeight: '700', color: '#1A1A1A', marginBottom: 28 },
  fieldWrap:      { marginBottom: 16 },
  label:          { fontSize: 13, fontWeight: '600', color: '#5F5F5F', marginBottom: 6 },
  input:          { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E2E2', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1A1A1A' },
  inputError:     { borderColor: '#C8001E' },
  fieldError:     { fontSize: 12, color: '#C8001E', marginTop: 4 },
  apiError:       { fontSize: 13, color: '#C8001E', marginBottom: 12, textAlign: 'center' },
  button:         { backgroundColor: '#3558F0', borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.6 },
  buttonText:     { fontSize: 16, fontWeight: '600', color: '#FFF' },
  link:           { fontSize: 14, color: '#3558F0', fontWeight: '600', textAlign: 'center', marginTop: 16 },
  registerRow:    { flexDirection: 'row', justifyContent: 'center', marginTop: 8 },
  registerText:   { fontSize: 14, color: '#5F5F5F' },
});
