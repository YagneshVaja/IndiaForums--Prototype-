import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../../navigation/types';
import { useForgotPassword } from '../hooks/useAuth';
import { extractApiError } from '../../../services/api';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;
type FormData = { email: string };

export default function ForgotPasswordScreen({ navigation }: Props) {
  const { control, handleSubmit, formState: { errors } } = useForm<FormData>();
  const { mutate: forgot, isPending, error, isSuccess } = useForgotPassword();

  if (isSuccess) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center', padding: 32 }]}>
        <Text style={{ fontSize: 24, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 }}>Email sent!</Text>
        <Text style={{ fontSize: 15, color: '#5F5F5F', textAlign: 'center', marginBottom: 24 }}>Check your inbox for reset instructions.</Text>
        <Pressable style={styles.button} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.buttonText}>Back to Login</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.inner}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 17, color: '#3558F0', fontWeight: '600' }}>‹ Back</Text>
        </Pressable>
        <Text style={styles.heading}>Forgot password?</Text>
        <Text style={{ fontSize: 15, color: '#5F5F5F', marginBottom: 28 }}>Enter your email and we'll send reset instructions.</Text>

        <Controller
          control={control}
          name="email"
          rules={{ required: 'Email is required', pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' } }}
          render={({ field: { onChange, value } }) => (
            <View style={{ marginBottom: 16 }}>
              <TextInput style={[styles.input, errors.email && styles.inputError]} onChangeText={onChange} value={value} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" placeholderTextColor="#9E9E9E" />
              {errors.email && <Text style={{ fontSize: 12, color: '#C8001E', marginTop: 4 }}>{errors.email.message}</Text>}
            </View>
          )}
        />

        {error && <Text style={{ fontSize: 13, color: '#C8001E', marginBottom: 12 }}>{extractApiError(error)}</Text>}

        <Pressable style={[styles.button, isPending && { opacity: 0.6 }]} onPress={handleSubmit(d => forgot(d))} disabled={isPending}>
          {isPending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Send Reset Link</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#F5F6F7' },
  inner:   { flex: 1, padding: 24, paddingTop: 64 },
  heading: { fontSize: 28, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },
  input:   { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E2E2', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1A1A1A' },
  inputError: { borderColor: '#C8001E' },
  button:  { backgroundColor: '#3558F0', borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  buttonText: { fontSize: 16, fontWeight: '600', color: '#FFF' },
});
