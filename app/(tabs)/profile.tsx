import { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet, Text, View, ScrollView, RefreshControl,
  TouchableOpacity, ActivityIndicator, Alert, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { getMyProfile, UserProfile } from '@/services/userService';
import { getFileUrl } from '@/services/api';

const BG      = '#05070F';
const SURFACE = '#10152A';
const GOLD    = '#E8B948';
const GOLDB   = '#F5D678';
const TEXT    = '#F5F7FB';
const TDIM    = '#A7B0C3';
const TMUTE   = '#5C6580';
const GREEN   = '#22D3AA';
const RED     = '#F87171';
const AMBER   = '#F59E0B';
const LINE    = 'rgba(232,185,72,0.12)';

const fmt  = (n: number) => '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
const fmtg = (g: number) => g.toFixed(4) + 'g';

function statusConfig(status?: string): [string, string] {
  switch (status) {
    case 'active':   return [GREEN, 'Active'];
    case 'pending':  return [AMBER, 'Pending Approval'];
    case 'rejected': return [RED,   'Rejected'];
    case 'inactive': return [TMUTE, 'Inactive'];
    default:         return [TMUTE, status ?? 'Unknown'];
  }
}

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const [profile, setProfile]       = useState<UserProfile | null>(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState('');
  const [photoErr, setPhotoErr]     = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      setProfile(await getMyProfile());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load profile');
    }
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);
  useEffect(() => { setPhotoErr(false); }, [profile?.userPhoto]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await load(); setRefreshing(false);
  }, [load]);

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={s.loadWrap}>
        <ActivityIndicator size="large" color={GOLD} />
        <Text style={{ color: TDIM, fontSize: 14, marginTop: 8 }}>Loading profile…</Text>
      </SafeAreaView>
    );
  }

  const photoUrl = getFileUrl(profile?.userPhoto);
  const [statusColor, statusLabel] = statusConfig(profile?.status);
  const schemes  = profile?.schemes  ?? [];
  const payments = profile?.payments ?? [];
  const paidCount  = payments.filter(p => p.status === 'paid').length;
  const totalGrams = schemes.reduce((sum, sc) => sum + (sc.totalGramsAccumulated || 0), 0);
  const totalPaid  = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);

  const infoRows = [
    { label: 'Member ID',  value: profile?.userId  ?? '—' },
    { label: 'Phone',      value: profile?.phone   ?? '—' },
    { label: 'Email',      value: profile?.email   || 'Not set' },
    { label: 'Shop Code',  value: profile?.shopCode ?? '—' },
    ...(profile?.address    ? [{ label: 'Address',     value: profile.address }]    : []),
    ...(profile?.occupation ? [{ label: 'Occupation',  value: profile.occupation }] : []),
    ...(profile?.dateOfBirth ? [{
      label: 'Date of Birth',
      value: new Date(profile.dateOfBirth).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
    }] : []),
  ];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Profile</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} />}
      >
        {error ? (
          <View style={s.errorBanner}>
            <Text style={{ color: RED, fontSize: 13 }}>{error}</Text>
          </View>
        ) : null}

        {/* Hero */}
        <View style={s.hero}>
          <View style={s.photoWrap}>
            {photoUrl && !photoErr ? (
              <Image
                source={{ uri: photoUrl }}
                style={s.photo}
                resizeMode="cover"
                onError={() => setPhotoErr(true)}
              />
            ) : (
              <View style={s.photoPlaceholder}>
                <Text style={s.photoInitial}>{(profile?.name ?? 'U').charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={[s.statusDot, { backgroundColor: statusColor }]} />
          </View>

          <Text style={s.heroName}>{profile?.name ?? '—'}</Text>
          {profile?.userId ? <Text style={s.heroUserId}>{profile.userId}</Text> : null}

          <View style={[s.statusBadge, { backgroundColor: statusColor + '22', borderColor: statusColor + '44' }]}>
            <View style={[s.dotSmall, { backgroundColor: statusColor }]} />
            <Text style={[s.statusBadgeText, { color: statusColor }]}>{statusLabel}</Text>
          </View>

          {profile?.status === 'pending' ? (
            <View style={s.infoNote}>
              <Text style={[s.infoNoteText, { color: AMBER }]}>
                Your account is pending admin approval. You'll be notified once approved.
              </Text>
            </View>
          ) : null}
          {profile?.status === 'rejected' ? (
            <View style={[s.infoNote, { borderColor: RED + '44', backgroundColor: RED + '11' }]}>
              <Text style={[s.infoNoteText, { color: RED }]}>
                Your account was rejected. Contact your shop admin.
              </Text>
            </View>
          ) : null}
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          <View style={s.statBox}>
            <Text style={[s.statVal, { color: GOLDB }]}>{fmtg(totalGrams)}</Text>
            <Text style={s.statLbl}>Gold Saved</Text>
          </View>
          <View style={[s.statBox, s.statBoxMid]}>
            <Text style={s.statVal}>{schemes.filter(sc => sc.status === 'active').length}</Text>
            <Text style={s.statLbl}>Active Chits</Text>
          </View>
          <View style={s.statBox}>
            <Text style={[s.statVal, { color: GREEN }]}>{paidCount}</Text>
            <Text style={s.statLbl}>Payments Made</Text>
          </View>
        </View>

        {/* Account Info */}
        <Text style={s.sectionTitle}>Account Information</Text>
        <View style={s.infoCard}>
          {infoRows.map((row, i) => (
            <View key={row.label} style={[s.infoRow, i < infoRows.length - 1 && { borderBottomWidth: 1, borderBottomColor: LINE }]}>
              <Text style={s.infoLabel}>{row.label}</Text>
              <Text style={s.infoValue} numberOfLines={2}>{row.value}</Text>
            </View>
          ))}
        </View>

        {/* Scheme Summary */}
        <Text style={s.sectionTitle}>Scheme Summary</Text>
        <View style={s.infoCard}>
          {[
            { label: 'Total Schemes',   value: String(schemes.length) },
            { label: 'Active',          value: String(schemes.filter(sc => sc.status === 'active').length) },
            { label: 'Completed',       value: String(schemes.filter(sc => sc.status === 'complete').length) },
            { label: 'Total Payments',  value: String(payments.length) },
            { label: 'Payments Paid',   value: String(paidCount) },
            { label: 'Total Invested',  value: fmt(totalPaid) },
            { label: 'Total Gold',      value: fmtg(totalGrams) },
          ].map((item, i, arr) => (
            <View key={item.label} style={[s.infoRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: LINE }]}>
              <Text style={s.infoLabel}>{item.label}</Text>
              <Text style={s.infoValue}>{item.value}</Text>
            </View>
          ))}
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut} activeOpacity={0.85}>
          <Text style={s.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={s.footer}>AgriZip Microfinance · Powered by SkyUp Digital Solution</Text>
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: BG },
  loadWrap:{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16 },

  header:      { paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: LINE },
  headerTitle: { color: TEXT, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },

  errorBanner: { backgroundColor: RED + '11', borderRadius: 10, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: RED + '44' },

  hero:           { backgroundColor: SURFACE, borderRadius: 24, padding: 24, alignItems: 'center', marginBottom: 14, borderWidth: 1, borderColor: LINE },
  photoWrap:      { position: 'relative', marginBottom: 14 },
  photo:          { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: GOLD },
  photoPlaceholder:{ width: 90, height: 90, borderRadius: 45, backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: GOLDB },
  photoInitial:   { color: '#1A1408', fontSize: 38, fontWeight: '800' },
  statusDot:      { position: 'absolute', bottom: 4, right: 4, width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: BG },
  heroName:       { color: TEXT, fontSize: 22, fontWeight: '800', letterSpacing: -0.3, marginBottom: 4 },
  heroUserId:     { color: GOLDB, fontSize: 13, fontWeight: '700', letterSpacing: 0.5, marginBottom: 12 },
  statusBadge:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginBottom: 12, borderWidth: 1 },
  dotSmall:       { width: 7, height: 7, borderRadius: 3.5 },
  statusBadgeText:{ fontSize: 13, fontWeight: '700' },
  infoNote:       { flexDirection: 'row', alignItems: 'flex-start', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: AMBER + '44', backgroundColor: AMBER + '11' },
  infoNoteText:   { fontSize: 12, flex: 1, lineHeight: 18 },

  statsRow:   { flexDirection: 'row', backgroundColor: SURFACE, borderRadius: 18, borderWidth: 1, borderColor: LINE, marginBottom: 16, overflow: 'hidden' },
  statBox:    { flex: 1, alignItems: 'center', paddingVertical: 18, gap: 4 },
  statBoxMid: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: LINE },
  statVal:    { color: TEXT, fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  statLbl:    { color: TMUTE, fontSize: 10, fontWeight: '500', textAlign: 'center' },

  sectionTitle:{ color: TEXT, fontSize: 15, fontWeight: '700', marginBottom: 10 },

  infoCard:  { backgroundColor: SURFACE, borderRadius: 18, borderWidth: 1, borderColor: LINE, overflow: 'hidden', marginBottom: 16 },
  infoRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  infoLabel: { color: TDIM, fontSize: 13 },
  infoValue: { color: TEXT, fontSize: 14, fontWeight: '600', flex: 1, textAlign: 'right' },

  signOutBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 16, borderWidth: 1.5, borderColor: RED + '66', backgroundColor: RED + '11' },
  signOutText:{ color: RED, fontSize: 15, fontWeight: '700' },

  footer: { color: TMUTE, fontSize: 11, textAlign: 'center' },
});
