import { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { registerUser } from '@/services/authService';

export default function RegisterScreen() {
  const router = useRouter();
  const [shopCode, setShopCode] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    if (!shopCode.trim() || !name.trim() || !phone.trim() || !password.trim()) {
      setError('Shop code, name, phone and password are required');
      return;
    }

    if (!email.trim()) {
      setError('Email is required so your account can be approved');
      return;
    }

    setLoading(true);

    try {
      await registerUser({
        shopCode: shopCode.toUpperCase().trim(),
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        agreedToTerms: true,
        agreedToPlatformTerms: true,
      });
      setSuccess('Registration submitted. Please wait for admin approval.');
      setShopCode('');
      setName('');
      setPhone('');
      setEmail('');
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>Register for AgriZip Microfinance</Text>

          <TextField
            label="Shop code"
            value={shopCode}
            autoCapitalize="characters"
            onChangeText={(t) => { setShopCode(t); setError(''); }}
            placeholder="Enter shop code"
          />
          <TextField
            label="Your name"
            value={name}
            onChangeText={(t) => { setName(t); setError(''); }}
            placeholder="Enter your name"
          />
          <TextField
            label="Email"
            value={email}
            keyboardType="email-address"
            autoCapitalize="none"
            onChangeText={(t) => { setEmail(t); setError(''); }}
            placeholder="Enter your email"
          />
          <TextField
            label="Phone"
            value={phone}
            keyboardType="phone-pad"
            onChangeText={(t) => { setPhone(t); setError(''); }}
            placeholder="Enter your phone"
            maxLength={10}
          />
          <TextField
            label="Password"
            value={password}
            secureTextEntry
            onChangeText={(t) => { setPassword(t); setError(''); }}
            placeholder="Create a password"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {success ? <Text style={styles.success}>{success}</Text> : null}

          <Button
            title={loading ? 'Submitting...' : 'Register'}
            onPress={handleSubmit}
            disabled={loading}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <Pressable onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.footerLink}> Sign in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 28,
  },
  error: {
    color: Colors.error,
    marginBottom: 12,
    fontSize: 14,
  },
  success: {
    color: Colors.success,
    marginBottom: 12,
    fontSize: 14,
  },
  footer: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  footerLink: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});
