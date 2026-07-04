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
import { StatusBar } from 'expo-status-bar';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { TextField } from '@/components/ui/TextField';
import { loginWithPassword } from '@/services/authService';

const DARK = '#0B1F3E';
const GOLD = '#D4A017';
const GOLD_LIGHT = '#FDF6DC';
const GOLD_TEXT = '#A37800';
const BLUE_LINK = '#1A7FD4';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');

    if (!phone.trim()) {
      setError('Phone number is required');
      return;
    }
    if (phone.trim().length < 10) {
      setError('Enter a valid 10-digit phone number');
      return;
    }
    if (!password.trim()) {
      setError('Password is required');
      return;
    }

    setLoading(true);
    try {
      const result = await loginWithPassword({ phone: phone.trim(), password });
      console.log('[login] loginWithPassword returned token:', Boolean(result.token), 'user id:', result.user?.id ?? result.user?.userId);

      await signIn(result.token, result.user);
      console.log('[login] signIn finished - attempting navigation');
      console.log('[login] current segments:', segments);
      router.replace('/(tabs)');
      console.log('[login] router.replace called -> /(tabs)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Dark hero — extends behind status bar */}
      <SafeAreaView style={styles.heroSafe} edges={['top']}>
        <View style={styles.hero}>
          {/* Brand row */}
          <View style={styles.logoRow}>
            <View style={styles.logoBox}>
              <Text style={styles.logoLetter}>A</Text>
            </View>
            <View>
              <Text style={styles.brandName}>AgriZip</Text>
              <Text style={styles.brandSub}>MICROFINANCE</Text>
            </View>
          </View>

          {/* Tagline */}
          <Text style={styles.tagline}>
            Your Gold Investment{'\n'}
            <Text style={styles.taglineAccent}>Tracked &amp; Secured</Text>
          </Text>

          {/* Trust row */}
          <View style={styles.trustRow}>
            {['256-bit Encrypted', 'KYC Verified', 'RBI Compliant'].map((t) => (
              <View key={t} style={styles.trustItem}>
                <View style={styles.trustDot} />
                <Text style={styles.trustText}>{t}</Text>
              </View>
            ))}
          </View>
        </View>
      </SafeAreaView>

      {/* White card — rounds over the dark hero */}
      <KeyboardAvoidingView
        style={styles.cardFlex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.cardScroll}
          contentContainerStyle={styles.cardContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Badge chip */}
          <View style={styles.badge}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>USER PORTAL</Text>
          </View>

          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to your investment account</Text>

          <TextField
            label="Phone Number"
            value={phone}
            keyboardType="phone-pad"
            onChangeText={(t) => { setPhone(t); setError(''); }}
            placeholder="10-digit phone number"
            maxLength={10}
          />
          <TextField
            label="Password"
            value={password}
            secureTextEntry
            onChangeText={(t) => { setPassword(t); setError(''); }}
            placeholder="••••••••"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {/* Gold submit button */}
          <Pressable
            onPress={handleSubmit}
            disabled={loading}
            style={({ pressed }) => [
              styles.submitBtn,
              loading && styles.submitDisabled,
              pressed && !loading && styles.submitPressed,
            ]}
          >
            <Text style={styles.submitText}>
              {loading ? 'Signing in…' : 'Sign In →'}
            </Text>
          </Pressable>

          {/* Register link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account?</Text>
            <Pressable onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.footerLink}> Register here</Text>
            </Pressable>
          </View>

          <Text style={styles.footerNote}>
            Secure login · Powered by SkyUp Digital Solution
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom safe area in white */}
      <SafeAreaView style={styles.bottomSafe} edges={['bottom']} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: DARK,
  },

  /* ── Hero (dark top section) ── */
  heroSafe: {
    backgroundColor: DARK,
  },
  hero: {
    backgroundColor: DARK,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 22,
  },
  logoBox: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLetter: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
  },
  brandName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  brandSub: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 3,
    marginTop: 3,
  },
  tagline: {
    color: '#fff',
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.4,
    lineHeight: 28,
    marginBottom: 18,
  },
  taglineAccent: {
    color: GOLD,
  },
  trustRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trustDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: GOLD,
    opacity: 0.7,
  },
  trustText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
  },

  /* ── White card section ── */
  cardFlex: {
    flex: 1,
  },
  cardScroll: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  cardContent: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 40,
  },

  /* Badge */
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: GOLD_LIGHT,
    borderRadius: 24,
    paddingVertical: 5,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(212,160,23,0.35)',
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: GOLD,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: GOLD_TEXT,
    letterSpacing: 1,
  },

  /* Form heading */
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: DARK,
    marginBottom: 6,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 28,
  },

  error: {
    color: '#EF4444',
    fontSize: 13,
    marginBottom: 14,
  },

  /* Gold submit button */
  submitBtn: {
    backgroundColor: GOLD,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  submitDisabled: {
    opacity: 0.7,
  },
  submitPressed: {
    opacity: 0.88,
  },
  submitText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.4,
  },

  /* Footer links */
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  footerLink: {
    color: BLUE_LINK,
    fontSize: 14,
    fontWeight: '600',
  },
  footerNote: {
    textAlign: 'center',
    fontSize: 11,
    color: '#CBD5E1',
    marginTop: 20,
  },

  /* Bottom safe area fill */
  bottomSafe: {
    backgroundColor: '#F8FAFC',
  },
});
