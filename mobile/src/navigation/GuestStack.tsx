import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';

function GuestHomeScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>IndiaForums</Text>
      <Text style={styles.tagline}>India's #1 Entertainment Community</Text>
      <Pressable style={styles.signInBtn} onPress={() => nav.navigate('Auth', { screen: 'Login' })}>
        <Text style={styles.signInText}>Sign In</Text>
      </Pressable>
      <Pressable onPress={() => nav.navigate('Auth', { screen: 'Register' })} hitSlop={8}>
        <Text style={styles.registerLink}>Create account</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F5F6F7', alignItems: 'center', justifyContent: 'center', padding: 32 },
  logo:         { fontSize: 28, fontWeight: '800', color: '#3558F0', marginBottom: 8 },
  tagline:      { fontSize: 15, color: '#5F5F5F', textAlign: 'center', marginBottom: 48 },
  signInBtn:    { backgroundColor: '#3558F0', paddingHorizontal: 40, paddingVertical: 14, borderRadius: 12, marginBottom: 16, width: '100%', alignItems: 'center' },
  signInText:   { fontSize: 16, fontWeight: '700', color: '#FFF' },
  registerLink: { fontSize: 15, color: '#3558F0', fontWeight: '600' },
});

type GuestStackParamList = { GuestHome: undefined };
const Stack = createNativeStackNavigator<GuestStackParamList>();

export default function GuestStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="GuestHome" component={GuestHomeScreen} />
    </Stack.Navigator>
  );
}
