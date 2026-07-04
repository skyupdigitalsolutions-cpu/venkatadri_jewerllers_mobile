import { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet, Text, View, ScrollView, RefreshControl,
  TouchableOpacity, ActivityIndicator, Modal, TextInput,
  KeyboardAvoidingView, Platform, Alert, Linking, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '@/hooks/useAuth';
import { getMyProfile, UserProfile, Scheme, Payment } from '@/services/userService';
import { getTodayGoldRate, GoldRateData } from '@/services/goldRateService';
import { getMyJoinRequests, createTypeRequest, JoinRequest } from '@/services/schemeJoinService';
import { getShopPaymentInfo, submitPaymentProof, ShopPaymentInfo, ScreenshotAsset } from '@/services/paymentService';
import { getFileUrl } from '@/services/api';

// ── Palette (matches web app dark theme) ────────────────────────────
const BG      = '#05070F';
const BG2     = '#0B0F1C';
const SURFACE = '#10152A';
const SRF2    = '#151B35';
const GOLD    = '#E8B948';
const GOLDB   = '#F5D678';
const TEXT    = '#F5F7FB';
const TDIM    = '#A7B0C3';
const TMUTE   = '#5C6580';
const GREEN   = '#22D3AA';
const RED     = '#F87171';
const AMBER   = '#F59E0B';
const LINE    = 'rgba(232,185,72,0.12)';
const LINES   = 'rgba(232,185,72,0.28)';

// ── Helpers ──────────────────────────────────────────────────────────
const fmt = (n: number) =>
  '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
const fmtg = (g: number) => g.toFixed(4) + 'g';

function statusPill(status: string): [string, string] {
  switch (status) {
    case 'active':   return [GREEN,  'ACTIVE'];
    case 'complete': return ['#60A5FA', 'MATURED'];
    case 'early_exit': return [AMBER,  'EARLY EXIT'];
    case 'pending':  return [AMBER,  'PENDING'];
    default:         return [TMUTE,  status.toUpperCase()];
  }
}
function payStatusPill(status: string): [string, string] {
  switch (status) {
    case 'paid':                 return [GREEN,  'PAID'];
    case 'pending':              return [AMBER,  'DUE'];
    case 'overdue':              return [RED,    'OVERDUE'];
    case 'awaiting_verification':return [GOLDB,  'IN REVIEW'];
    case 'rejected':             return [RED,    'REJECTED'];
    default:                     return [TMUTE,  status.toUpperCase()];
  }
}
function addMonths(date: Date, n: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}
const toISO = (d: Date) => d.toISOString().split('T')[0];

// ── Sub-components ───────────────────────────────────────────────────

function ProgressBar({ pct }: { pct: number }) {
  return (
    <View style={s.barWrap}>
      <View style={[s.barFill, { width: `${Math.min(100, pct)}%` as any }]} />
    </View>
  );
}

function StatCard({ label, value, sub, color }: {
  label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <View style={s.statCard}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={[s.statValue, color ? { color } : undefined]}>{value}</Text>
      {sub ? <Text style={s.statSub}>{sub}</Text> : null}
    </View>
  );
}

// ── Pay Now Modal ────────────────────────────────────────────────────

function PayNowModal({
  scheme, payment, onClose, onSuccess,
}: {
  scheme: Scheme; payment: Payment | null; onClose: () => void; onSuccess: () => void;
}) {
  const [shop, setShop]             = useState<ShopPaymentInfo | null>(null);
  const [utr, setUtr]               = useState('');
  const [note, setNote]             = useState('');
  const [screenshot, setScreenshot] = useState<ScreenshotAsset | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]             = useState('');
  const [err, setErr]               = useState('');

  useEffect(() => { getShopPaymentInfo().then(setShop).catch(() => {}); }, []);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow photo library access.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as any,
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      setScreenshot({ uri: a.uri, type: a.mimeType ?? 'image/jpeg', fileName: a.fileName ?? `proof_${Date.now()}.jpg` });
    }
  };

  const submit = async () => {
    if (!utr.trim() && !screenshot) {
      setErr('Please enter a UTR number OR upload a payment screenshot.');
      return;
    }
    setSubmitting(true); setErr('');
    try {
      const msg = await submitPaymentProof({
        schemeId: scheme._id,
        monthNumber: payment?.monthNumber,
        utrNumber: utr.trim() || undefined,
        userNote: note.trim() || undefined,
        screenshot: screenshot ?? undefined,
      });
      setDone(msg);
      setTimeout(() => { onSuccess(); onClose(); }, 1500);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const copyUpi = async (id: string) => {
    await Clipboard.setStringAsync(id);
    Alert.alert('Copied!', 'UPI ID copied to clipboard');
  };

  const qrUrl = getFileUrl(shop?.qrCodeUrl);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose} />
        <View style={s.sheet}>
          <View style={s.sheetHandle} />
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Header */}
            <View style={s.sheetHeaderRow}>
              <Text style={s.sheetTitle}>Pay Now</Text>
              <TouchableOpacity onPress={onClose} style={s.sheetCloseBtn}>
                <Text style={s.sheetCloseTxt}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Amount */}
            <View style={s.payAmtBox}>
              <Text style={s.payAmtLabel}>AMOUNT DUE</Text>
              <Text style={s.payAmtVal}>{fmt(scheme.monthlyAmount)}</Text>
              <Text style={s.payAmtSub}>{scheme.schemeId} · Month {payment?.monthNumber ?? '–'}</Text>
            </View>

            {/* Shop info */}
            {shop ? (
              <View style={s.shopCard}>
                <Text style={s.shopName}>{shop.shopName}</Text>
                {shop.ownerName ? (
                  <View style={s.shopInfoRow}>
                    <Text style={s.shopInfoIcon}>👤</Text>
                    <Text style={s.shopInfoText}>{shop.ownerName}</Text>
                  </View>
                ) : null}
                {shop.phone ? (
                  <TouchableOpacity onPress={() => Linking.openURL(`tel:${shop.phone}`)}>
                    <View style={s.shopInfoRow}>
                      <Text style={s.shopInfoIcon}>📞</Text>
                      <Text style={[s.shopInfoText, { color: GOLDB }]}>{shop.phone}</Text>
                      <View style={s.badge}><Text style={s.badgeText}>CALL</Text></View>
                    </View>
                  </TouchableOpacity>
                ) : null}
                {shop.upiId ? (
                  <TouchableOpacity onPress={() => copyUpi(shop.upiId!)}>
                    <View style={s.shopInfoRow}>
                      <Text style={s.shopInfoIcon}>💳</Text>
                      <Text style={[s.shopInfoText, { color: GREEN, flex: 1 }]}>{shop.upiId}</Text>
                      <View style={[s.badge, { backgroundColor: GREEN + '22', borderColor: GREEN + '55' }]}>
                        <Text style={[s.badgeText, { color: GREEN }]}>COPY</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ) : null}
                {shop.upiPayeeName ? (
                  <View style={s.shopInfoRow}>
                    <Text style={s.shopInfoIcon}>🏷️</Text>
                    <Text style={s.shopInfoText}>Payee: {shop.upiPayeeName}</Text>
                  </View>
                ) : null}
                {qrUrl ? (
                  <View style={{ marginTop: 8, alignItems: 'center' }}>
                    <Text style={[s.payAmtLabel, { marginBottom: 8 }]}>SCAN TO PAY</Text>
                    <Image source={{ uri: qrUrl }} style={s.qrImg} resizeMode="contain" />
                  </View>
                ) : null}
              </View>
            ) : (
              <View style={[s.shopCard, { alignItems: 'center', padding: 24 }]}>
                <ActivityIndicator color={GOLD} />
                <Text style={{ color: TDIM, fontSize: 12, marginTop: 8 }}>Loading shop info…</Text>
              </View>
            )}

            {/* Proof section divider */}
            <View style={s.divRow}>
              <View style={s.divLine} /><Text style={s.divLabel}>PROOF OF PAYMENT</Text><View style={s.divLine} />
            </View>

            {/* UTR */}
            <View style={s.fieldWrap}>
              <Text style={s.fieldLabel}>UTR / Transaction ID</Text>
              <TextInput
                style={s.field} value={utr} onChangeText={setUtr}
                placeholder="Enter transaction reference number"
                placeholderTextColor={TMUTE} autoCapitalize="characters"
              />
            </View>

            {/* OR */}
            <View style={s.orRow}>
              <View style={s.orLine} /><Text style={s.orTxt}>OR</Text><View style={s.orLine} />
            </View>

            {/* Screenshot upload */}
            <TouchableOpacity style={s.uploadBtn} onPress={pickImage}>
              {screenshot ? (
                <View>
                  <Image source={{ uri: screenshot.uri }} style={s.screenshotImg} resizeMode="contain" />
                  <View style={s.screenshotOverlay}>
                    <Text style={s.screenshotOverlayTxt}>Tap to change</Text>
                  </View>
                </View>
              ) : (
                <View style={s.uploadInner}>
                  <Text style={{ fontSize: 28, marginBottom: 6 }}>📷</Text>
                  <Text style={s.uploadTitle}>Upload Payment Screenshot</Text>
                  <Text style={s.uploadSub}>Tap to select from gallery</Text>
                </View>
              )}
            </TouchableOpacity>
            {screenshot ? (
              <TouchableOpacity onPress={() => setScreenshot(null)} style={s.removeBtn}>
                <Text style={s.removeBtnText}>✕ Remove screenshot</Text>
              </TouchableOpacity>
            ) : null}

            {/* Note */}
            <View style={[s.fieldWrap, { marginTop: 14 }]}>
              <Text style={s.fieldLabel}>Note for Admin (optional)</Text>
              <TextInput
                style={[s.field, { height: 70, textAlignVertical: 'top', paddingTop: 12 }]}
                value={note} onChangeText={setNote}
                placeholder="Any additional information…"
                placeholderTextColor={TMUTE} multiline
              />
            </View>

            {err  ? <Text style={s.errText}>{err}</Text>  : null}
            {done ? <Text style={s.doneText}>✓ {done}</Text> : null}

            <TouchableOpacity style={s.goldBtn} onPress={submit} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#1A1408" /> : (
                <Text style={s.goldBtnText}>Submit Payment Proof →</Text>
              )}
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Join Modal ───────────────────────────────────────────────────────

function JoinModal({
  planType, onClose, onSuccess,
}: {
  planType: 'Type1' | 'Type2'; onClose: () => void; onSuccess: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [months, setMonths] = useState('13');
  const [terms, setTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  const monthOpts = ['11', '13', '24', '36'];

  const submit = async () => {
    const amt = Number(amount);
    if (!amt || amt < 500) { setErr('Enter a valid amount (min ₹500)'); return; }
    if (!terms) { setErr('Please accept the terms to continue'); return; }
    const start = new Date();
    const end = addMonths(start, parseInt(months) - 1);
    setSubmitting(true); setErr('');
    try {
      await createTypeRequest({
        planType,
        monthlyAmount: amt,
        startDate: toISO(start),
        endDate: toISO(end),
        termsAccepted: true,
      });
      onSuccess();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setSubmitting(false);
    }
  };

  const label = planType === 'Type1'
    ? 'Monthly Gold Accumulation'
    : 'Final Currency Conversion';

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose} />
        <View style={s.sheet}>
          <View style={s.sheetHandle} />
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={s.sheetTitle}>Join {planType === 'Type1' ? 'Scheme 1' : 'Scheme 2'}</Text>
            <Text style={[s.fieldLabel, { marginBottom: 16, color: TDIM }]}>{label}</Text>

            <View style={s.fieldWrap}>
              <Text style={s.fieldLabel}>Monthly Amount (₹) *</Text>
              <TextInput
                style={s.field}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="e.g. 2000"
                placeholderTextColor={TMUTE}
              />
            </View>

            <View style={s.fieldWrap}>
              <Text style={s.fieldLabel}>Duration</Text>
              <View style={s.chipRow}>
                {monthOpts.map(m => (
                  <TouchableOpacity
                    key={m}
                    style={[s.chipSel, months === m && s.chipSelActive]}
                    onPress={() => setMonths(m)}
                  >
                    <Text style={[s.chipSelText, months === m && { color: '#1A1408' }]}>
                      {m} months
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity style={s.termsRow} onPress={() => setTerms(t => !t)}>
              <View style={[s.checkbox, terms && { backgroundColor: GOLD, borderColor: GOLD }]}>
                {terms ? <Text style={{ color: '#1A1408', fontSize: 11, fontWeight: '800' }}>✓</Text> : null}
              </View>
              <Text style={s.termsText}>
                I agree to the terms & conditions of this gold scheme plan.
              </Text>
            </TouchableOpacity>

            {err ? <Text style={s.errText}>{err}</Text> : null}

            <TouchableOpacity style={s.goldBtn} onPress={submit} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#1A1408" /> : (
                <Text style={s.goldBtnText}>Submit Request →</Text>
              )}
            </TouchableOpacity>
            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Payment Breakdown Modal ───────────────────────────────────────────

function BreakdownModal({
  scheme, payments, onClose,
}: {
  scheme: Scheme; payments: Payment[]; onClose: () => void;
}) {
  const [tab, setTab] = useState<'paid' | 'upcoming' | 'due'>('paid');
  const schemePays = payments.filter(p => p.scheme?._id === scheme._id || (p as any).schemeId === scheme._id);
  const paid = schemePays.filter(p => p.status === 'paid');
  const due  = schemePays.filter(p => p.status === 'pending' || p.status === 'overdue');
  const upcoming = schemePays.filter(p =>
    p.status !== 'paid' && p.status !== 'pending' && p.status !== 'overdue'
  );

  const rows = tab === 'paid' ? paid : tab === 'due' ? due : upcoming;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose} />
      <View style={[s.sheet, { maxHeight: '70%' }]}>
        <View style={s.sheetHandle} />
        <Text style={[s.sheetTitle, { marginBottom: 4 }]}>Payment Breakdown</Text>
        <Text style={[s.fieldLabel, { color: TDIM, marginBottom: 12 }]}>{scheme.schemeId}</Text>

        <View style={s.bdTabs}>
          {(['paid', 'upcoming', 'due'] as const).map(t => (
            <TouchableOpacity
              key={t}
              style={[s.bdTab, tab === t && s.bdTabActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[s.bdTabText, tab === t && { color: '#1A1408' }]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          {rows.length === 0 ? (
            <Text style={[s.fieldLabel, { textAlign: 'center', margin: 24, color: TMUTE }]}>
              No payments in this category
            </Text>
          ) : rows.map((p, i) => {
            const [pillColor, pillLabel] = payStatusPill(p.status);
            return (
              <View key={p._id} style={[s.bdRow, i > 0 && { borderTopWidth: 1, borderTopColor: LINE }]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.bdMon}>M{p.monthNumber}</Text>
                  {p.paidDate ? (
                    <Text style={s.bdSub}>{new Date(p.paidDate).toLocaleDateString('en-IN')}</Text>
                  ) : p.dueDate ? (
                    <Text style={s.bdSub}>Due {new Date(p.dueDate).toLocaleDateString('en-IN')}</Text>
                  ) : null}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={s.bdAmt}>{fmt(p.amount)}</Text>
                  {p.gramsAdded > 0 ? <Text style={s.bdGold}>{fmtg(p.gramsAdded)}</Text> : null}
                  <View style={[s.pill, { backgroundColor: pillColor + '22' }]}>
                    <Text style={[s.pillText, { color: pillColor }]}>{pillLabel}</Text>
                  </View>
                </View>
              </View>
            );
          })}
          <View style={{ height: 32 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────

type SubTab = 'schemes' | 'browse' | 'history' | 'past';

export default function DashboardScreen() {
  const { signOut } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [goldRate, setGoldRate] = useState<GoldRateData | null>(null);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subTab, setSubTab] = useState<SubTab>('schemes');

  // Modals
  const [payNowScheme, setPayNowScheme] = useState<Scheme | null>(null);
  const [payNowPayment, setPayNowPayment] = useState<Payment | null>(null);
  const [joinType, setJoinType] = useState<'Type1' | 'Type2' | null>(null);
  const [breakdownScheme, setBreakdownScheme] = useState<Scheme | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const [p, g, j] = await Promise.all([
        getMyProfile(),
        getTodayGoldRate().catch(() => null),
        getMyJoinRequests().catch(() => []),
      ]);
      setProfile(p);
      setGoldRate(g);
      setJoinRequests(j);
    } catch {}
  }, []);

  useEffect(() => { loadAll().finally(() => setLoading(false)); }, [loadAll]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }, [loadAll]);

  if (loading) {
    return (
      <SafeAreaView style={s.loadWrap}>
        <ActivityIndicator size="large" color={GOLD} />
        <Text style={s.loadText}>Loading your vault…</Text>
      </SafeAreaView>
    );
  }

  const schemes  = profile?.schemes  ?? [];
  const payments = profile?.payments ?? [];
  const active   = schemes.filter(sc => sc.status === 'active');
  const past     = schemes.filter(sc => sc.status === 'complete' || sc.status === 'early_exit');
  const totalGrams = schemes.reduce((s, sc) => s + (sc.totalGramsAccumulated || 0), 0);
  const totalPaid  = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const nextDue    = payments.find(p => p.status === 'pending' || p.status === 'overdue');
  const gramsValue = goldRate ? totalGrams * goldRate.ratePerGram : 0;
  const rate       = goldRate?.ratePerGram ?? 0;

  const subTabs: { key: SubTab; label: string }[] = [
    { key: 'schemes', label: 'My Schemes' },
    { key: 'browse',  label: 'Browse Plans' },
    { key: 'history', label: 'History' },
    { key: 'past',    label: 'Past Chits' },
  ];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* ── Fixed header ── */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <View style={s.avatarBox}>
            <Text style={s.avatarText}>{(profile?.name ?? 'U').charAt(0).toUpperCase()}</Text>
          </View>
          <View>
            <Text style={s.headerName} numberOfLines={1}>{profile?.name ?? '—'}</Text>
            <Text style={s.headerSub}>ID · {profile?.userId ?? '—'}</Text>
          </View>
        </View>
        {rate > 0 ? (
          <View style={s.ticker}>
            <View style={s.tickerDot} />
            <Text style={s.tickerLabel}>LIVE · GOLD/G</Text>
            <Text style={s.tickerPrice}>{fmt(rate)}</Text>
          </View>
        ) : null}
      </View>

      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} />}
      >
        {/* Greeting */}
        <View style={s.welcome}>
          <Text style={s.eyebrow}>— YOUR PRIVATE VAULT</Text>
          <Text style={s.greeting}>
            Welcome back,{'\n'}
            <Text style={s.greetingName}>{profile?.name?.split(' ')[0] ?? 'friend'}.</Text>
          </Text>
          <Text style={s.dateText}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </Text>
        </View>

        {/* Gold rate hero */}
        <View style={s.hero}>
          <Text style={s.heroLabel}>● TODAY'S GOLD RATE · SET BY YOUR SHOP</Text>
          {rate > 0 ? (
            <>
              <Text style={s.heroPrice}>₹{rate.toLocaleString('en-IN')}</Text>
              <Text style={s.heroUnit}>PER GRAM</Text>
              {goldRate?.date ? (
                <Text style={s.heroUpdated}>
                  UPDATED · {new Date(goldRate.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </Text>
              ) : null}
              <View style={s.heroDivider} />
              <View style={s.heroQtys}>
                {[1, 5, 10].map(g => (
                  <View key={g} style={s.heroQty}>
                    <Text style={s.heroQtyLabel}>{g}G</Text>
                    <Text style={s.heroQtyVal}>{fmt(g * rate)}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <Text style={s.heroEmpty}>Gold rate not set today</Text>
          )}
        </View>

        {/* Stats */}
        <View style={s.statsGrid}>
          <StatCard
            label="TOTAL GOLD SAVED"
            value={fmtg(totalGrams)}
            sub={gramsValue > 0 ? `≈ ${fmt(gramsValue)}` : undefined}
            color={GOLDB}
          />
          <StatCard
            label="ACTIVE SCHEMES"
            value={String(active.length)}
            sub="Currently running"
          />
          <StatCard
            label="TOTAL AMOUNT PAID"
            value={fmt(totalPaid)}
            sub={`${payments.filter(p => p.status === 'paid').length} payments made`}
            color={GREEN}
          />
          <StatCard
            label="NEXT DUE"
            value={nextDue ? fmt(nextDue.amount) : '—'}
            sub={nextDue ? `Month ${nextDue.monthNumber}` : 'No due payments'}
            color={nextDue ? AMBER : undefined}
          />
        </View>

        {/* Sub-tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.subTabsScroll}>
          <View style={s.subTabs}>
            {subTabs.map(t => (
              <TouchableOpacity
                key={t.key}
                style={[s.subTab, subTab === t.key && s.subTabActive]}
                onPress={() => setSubTab(t.key)}
              >
                <Text style={[s.subTabText, subTab === t.key && s.subTabTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Tab: My Schemes */}
        {subTab === 'schemes' && (
          <View style={s.tabContent}>
            {active.length === 0 && (
              <View style={s.emptyBox}>
                <Text style={s.emptyIcon}>◎</Text>
                <Text style={s.emptyTitle}>No Active Schemes</Text>
                <Text style={s.emptySub}>Browse Plans to start a gold scheme</Text>
                <TouchableOpacity style={s.goldBtnSm} onPress={() => setSubTab('browse')}>
                  <Text style={s.goldBtnText}>Browse Plans →</Text>
                </TouchableOpacity>
              </View>
            )}
            {active.map(sc => {
              const pct = sc.totalMonths ? Math.round((sc.currentMonth / sc.totalMonths) * 100) : 0;
              const [statColor, statLabel] = statusPill(sc.status);
              const duePay = payments.find(p =>
                (p.scheme?._id === sc._id || (p as any).schemeId === sc._id) &&
                (p.status === 'pending' || p.status === 'overdue')
              );
              return (
                <View key={sc._id} style={s.schemeCard}>
                  <View style={s.schemeAccent} />
                  <View style={s.schemeHead}>
                    <View style={s.schemeTags}>
                      <View style={s.schemeIdBadge}>
                        <Text style={s.schemeIdText}>{sc.schemeId}</Text>
                      </View>
                      <View style={[s.pill, { backgroundColor: statColor + '22' }]}>
                        <Text style={[s.pillText, { color: statColor }]}>● {statLabel}</Text>
                      </View>
                    </View>
                    <View style={[s.pctBadge, { borderColor: GOLD }]}>
                      <Text style={s.pctText}>{pct}%</Text>
                      <Text style={s.pctSub}>M {sc.currentMonth}/{sc.totalMonths}</Text>
                    </View>
                  </View>

                  <Text style={s.schemeAmtLabel}>MONTHLY COMMITMENT</Text>
                  <Text style={s.schemeAmt}>{fmt(sc.monthlyAmount)}</Text>

                  {sc.totalGramsAccumulated > 0 && (
                    <View style={{ marginTop: 10 }}>
                      <Text style={s.schemeAmtLabel}>GOLD ACCUMULATED</Text>
                      <Text style={[s.schemeAmt, { color: GOLDB, fontSize: 20 }]}>
                        {fmtg(sc.totalGramsAccumulated)}
                      </Text>
                      {rate > 0 && (
                        <Text style={s.schemeSub}>
                          ≈ {fmt(sc.totalGramsAccumulated * rate)}
                        </Text>
                      )}
                    </View>
                  )}

                  <ProgressBar pct={pct} />
                  <View style={s.barMeta}>
                    <Text style={s.barMetaText}>M {sc.currentMonth} of {sc.totalMonths}</Text>
                    <Text style={s.barMetaText}>{pct}% complete</Text>
                  </View>

                  <View style={s.schemeFooter}>
                    {[
                      { label: 'RATE AT START', val: sc.description?.includes('₹') ? sc.description : `—` },
                      { label: 'SCHEME TYPE', val: sc.planType === 'Type1' ? 'Gold Accumulation' : sc.planType === 'Type2' ? 'Currency Conversion' : '—' },
                      { label: 'TIME REMAINING', val: sc.totalMonths ? `${sc.totalMonths - sc.currentMonth} months` : '—' },
                    ].map(item => (
                      <View key={item.label} style={s.miniStat}>
                        <Text style={s.miniLabel}>{item.label}</Text>
                        <Text style={s.miniVal}>{item.val}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={s.schemeActions}>
                    {(duePay || sc.status === 'active') && (
                      <TouchableOpacity
                        style={s.payNowBtn}
                        onPress={() => { setPayNowScheme(sc); setPayNowPayment(duePay ?? null); }}
                      >
                        <Text style={s.payNowText}>↑ Pay Now</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={s.ghostBtn}
                      onPress={() => setBreakdownScheme(sc)}
                    >
                      <Text style={s.ghostBtnText}>📋 {sc.totalMonths}-Month Schedule</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Tab: Browse Plans */}
        {subTab === 'browse' && (
          <View style={s.tabContent}>
            <Text style={s.browseTitle}>Predefined Schemes</Text>
            <Text style={s.browseSub}>Choose a scheme type and set your monthly contribution.</Text>

            {/* Scheme 1 */}
            <View style={s.planCard}>
              <Text style={s.planEmoji}>💰</Text>
              <Text style={s.planTitle}>Scheme 1</Text>
              <Text style={s.planTypeLabel}>Monthly Gold Accumulation</Text>
              <Text style={s.planDesc}>
                Every month you pay, gold is credited to your account based on that day's gold rate.
                You can redeem the total gold at the end of the term.
              </Text>
              <TouchableOpacity style={s.planJoinBtn} onPress={() => setJoinType('Type1')}>
                <Text style={s.goldBtnText}>Join Scheme 1 →</Text>
              </TouchableOpacity>
            </View>

            {/* Scheme 2 */}
            <View style={[s.planCard, { borderColor: LINES }]}>
              <Text style={s.planEmoji}>🏛️</Text>
              <Text style={s.planTitle}>Scheme 2</Text>
              <Text style={s.planTypeLabel}>Final Currency Conversion</Text>
              <Text style={s.planDesc}>
                Accumulate your monthly payments in cash value. At the end of the term,
                the total amount is converted to gold at the final rate, including a bonus month benefit.
              </Text>
              <TouchableOpacity style={s.planJoinBtn} onPress={() => setJoinType('Type2')}>
                <Text style={s.goldBtnText}>Join Scheme 2 →</Text>
              </TouchableOpacity>
            </View>

            {/* Recent Requests */}
            {joinRequests.length > 0 && (
              <>
                <Text style={[s.browseTitle, { marginTop: 20 }]}>RECENT REQUESTS</Text>
                {joinRequests.slice(0, 5).map(jr => {
                  const statusColors: Record<string, string> = {
                    pending: AMBER, approved: GREEN, rejected: RED,
                    awaiting_payment: GOLDB, payment_verified: GREEN,
                  };
                  const sc = statusColors[jr.status] ?? TMUTE;
                  return (
                    <View key={jr._id} style={s.jrCard}>
                      <Text style={s.jrType}>
                        {jr.planType === 'Type1' ? 'Scheme 1' : jr.planType === 'Type2' ? 'Scheme 2' : 'Custom'}
                      </Text>
                      {jr.monthlyAmount ? (
                        <Text style={s.jrAmt}>{fmt(jr.monthlyAmount)} / month</Text>
                      ) : null}
                      <View style={[s.pill, { backgroundColor: sc + '22', alignSelf: 'flex-start', marginTop: 4 }]}>
                        <Text style={[s.pillText, { color: sc }]}>
                          {jr.status.replace('_', ' ').toUpperCase()}
                        </Text>
                      </View>
                      {jr.adminNote ? (
                        <Text style={[s.jrNote, { color: RED }]}>Admin: {jr.adminNote}</Text>
                      ) : null}
                      {jr.schemeCreated ? (
                        <Text style={[s.jrNote, { color: GREEN }]}>
                          ✓ Scheme created: {jr.schemeCreated.schemeId}
                        </Text>
                      ) : null}
                    </View>
                  );
                })}
              </>
            )}
          </View>
        )}

        {/* Tab: History */}
        {subTab === 'history' && (
          <View style={s.tabContent}>
            <Text style={s.browseTitle}>Payment History</Text>
            {schemes.length === 0 ? (
              <Text style={[s.emptySub, { margin: 24 }]}>No schemes found</Text>
            ) : schemes.map(sc => (
              <View key={sc._id} style={s.historyRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.historySchemeId}>{sc.schemeId}</Text>
                  <Text style={s.historySub}>
                    {new Date(sc.startDate).toLocaleDateString('en-IN')}
                  </Text>
                </View>
                <Text style={[s.historyAmt, { color: GOLDB }]}>{fmt(sc.monthlyAmount)}</Text>
                <TouchableOpacity
                  style={s.viewBtn}
                  onPress={() => setBreakdownScheme(sc)}
                >
                  <Text style={s.viewBtnText}>View</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Tab: Past Chits */}
        {subTab === 'past' && (
          <View style={s.tabContent}>
            {past.length === 0 ? (
              <View style={s.emptyBox}>
                <Text style={s.emptyIcon}>◎</Text>
                <Text style={s.emptyTitle}>No Past Chits</Text>
                <Text style={s.emptySub}>Your completed schemes will appear here</Text>
              </View>
            ) : past.map(sc => {
              const [sc2, sl] = statusPill(sc.status);
              const schemePays = payments.filter(p =>
                p.scheme?._id === sc._id || (p as any).schemeId === sc._id
              );
              const totalAmt = schemePays.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
              return (
                <View key={sc._id} style={[s.schemeCard, { borderColor: sc2 + '44' }]}>
                  <View style={[s.schemeAccent, { backgroundColor: sc2 }]} />
                  <View style={s.schemeTags}>
                    <View style={s.schemeIdBadge}>
                      <Text style={s.schemeIdText}>{sc.schemeId}</Text>
                    </View>
                    <View style={[s.pill, { backgroundColor: sc2 + '22' }]}>
                      <Text style={[s.pillText, { color: sc2 }]}>● {sl}</Text>
                    </View>
                  </View>
                  <View style={s.pastGrid}>
                    <View>
                      <Text style={s.miniLabel}>TOTAL AMOUNT PAID</Text>
                      <Text style={[s.schemeAmt, { marginTop: 2 }]}>{fmt(totalAmt)}</Text>
                    </View>
                    <View>
                      <Text style={s.miniLabel}>TOTAL GOLD SAVED</Text>
                      <Text style={[s.schemeAmt, { color: GOLDB, marginTop: 2 }]}>
                        {fmtg(sc.totalGramsAccumulated)}
                      </Text>
                    </View>
                    <View>
                      <Text style={s.miniLabel}>START DATE</Text>
                      <Text style={[s.miniVal, { marginTop: 2 }]}>
                        {new Date(sc.startDate).toLocaleDateString('en-IN')}
                      </Text>
                    </View>
                    {sc.completionDate && (
                      <View>
                        <Text style={s.miniLabel}>CLOSURE DATE</Text>
                        <Text style={[s.miniVal, { marginTop: 2 }]}>
                          {new Date(sc.completionDate).toLocaleDateString('en-IN')}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <Text style={s.footer}>AgriZip Microfinance · Powered by SkyUp Digital Solution</Text>
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Modals */}
      {payNowScheme && (
        <PayNowModal
          scheme={payNowScheme}
          payment={payNowPayment}
          onClose={() => { setPayNowScheme(null); setPayNowPayment(null); }}
          onSuccess={loadAll}
        />
      )}
      {joinType && (
        <JoinModal
          planType={joinType}
          onClose={() => setJoinType(null)}
          onSuccess={() => { loadAll(); Alert.alert('Success', 'Join request submitted! Admin will review shortly.'); }}
        />
      )}
      {breakdownScheme && (
        <BreakdownModal
          scheme={breakdownScheme}
          payments={payments}
          onClose={() => setBreakdownScheme(null)}
        />
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: BG },
  loadWrap:{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadText:{ color: TDIM, fontSize: 14 },
  scroll:  { flex: 1 },

  // Header
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: LINE },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  avatarBox:  { width: 36, height: 36, borderRadius: 11, backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#1A1408', fontSize: 16, fontWeight: '800' },
  headerName: { color: TEXT, fontSize: 15, fontWeight: '700', letterSpacing: -0.2, maxWidth: 140 },
  headerSub:  { color: TMUTE, fontSize: 10, fontWeight: '500', letterSpacing: 0.1, marginTop: 1 },
  ticker:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: SURFACE, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: LINES },
  tickerDot:  { width: 5, height: 5, borderRadius: 3, backgroundColor: GOLD },
  tickerLabel:{ color: TDIM, fontSize: 8, fontWeight: '600', letterSpacing: 0.1 },
  tickerPrice:{ color: GOLDB, fontSize: 13, fontWeight: '700' },

  // Welcome
  welcome:     { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12 },
  eyebrow:     { color: TMUTE, fontSize: 10, fontWeight: '600', letterSpacing: 0.2, marginBottom: 8 },
  greeting:    { color: TEXT, fontSize: 28, fontWeight: '700', letterSpacing: -0.5, lineHeight: 34 },
  greetingName:{ color: GOLDB, fontStyle: 'italic' },
  dateText:    { color: TDIM, fontSize: 12, marginTop: 8 },

  // Hero
  hero:         { marginHorizontal: 16, marginBottom: 16, borderRadius: 18, padding: 20, backgroundColor: SURFACE, borderWidth: 1, borderColor: LINES },
  heroLabel:    { color: TDIM, fontSize: 9, fontWeight: '600', letterSpacing: 0.2, marginBottom: 10 },
  heroPrice:    { color: TEXT, fontSize: 42, fontWeight: '700', letterSpacing: -1 },
  heroUnit:     { color: TDIM, fontSize: 10, fontWeight: '500', letterSpacing: 0.15, marginTop: -4 },
  heroUpdated:  { color: TMUTE, fontSize: 9, fontWeight: '500', marginTop: 6, letterSpacing: 0.1 },
  heroEmpty:    { color: TMUTE, fontSize: 18, fontStyle: 'italic', marginTop: 8 },
  heroDivider:  { height: 1, backgroundColor: LINE, marginVertical: 14 },
  heroQtys:     { flexDirection: 'row', gap: 8 },
  heroQty:      { flex: 1, padding: 10, borderRadius: 10, backgroundColor: BG2, borderWidth: 1, borderColor: LINE },
  heroQtyLabel: { color: TMUTE, fontSize: 9, fontWeight: '500', letterSpacing: 0.15, marginBottom: 4 },
  heroQtyVal:   { color: GOLDB, fontSize: 14, fontWeight: '700' },

  // Stats
  statsGrid:  { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8, marginBottom: 16 },
  statCard:   { flex: 1, minWidth: '45%', padding: 14, borderRadius: 14, backgroundColor: SURFACE, borderWidth: 1, borderColor: 'rgba(148,163,184,0.10)' },
  statLabel:  { color: TMUTE, fontSize: 9, fontWeight: '600', letterSpacing: 0.15, marginBottom: 8, textTransform: 'uppercase' },
  statValue:  { color: TEXT, fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  statSub:    { color: TMUTE, fontSize: 10, marginTop: 4 },

  // Sub-tabs
  subTabsScroll:{ marginBottom: 12 },
  subTabs:      { flexDirection: 'row', paddingHorizontal: 12, gap: 4 },
  subTab:       { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: SURFACE, borderWidth: 1, borderColor: 'rgba(148,163,184,0.10)' },
  subTabActive: { backgroundColor: GOLD },
  subTabText:   { color: TMUTE, fontSize: 12, fontWeight: '600' },
  subTabTextActive: { color: '#1A1408' },

  tabContent: { paddingHorizontal: 14, gap: 10 },

  // Scheme card
  schemeCard:  { backgroundColor: SURFACE, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: 'rgba(148,163,184,0.10)', overflow: 'hidden', position: 'relative' },
  schemeAccent:{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: GOLD },
  schemeHead:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  schemeTags:  { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap', flex: 1 },
  schemeIdBadge:{ backgroundColor: 'rgba(232,185,72,0.14)', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20 },
  schemeIdText: { color: GOLDB, fontSize: 10, fontWeight: '600', letterSpacing: 0.1 },
  pill:         { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  pillText:     { fontSize: 9, fontWeight: '700', letterSpacing: 0.1 },
  pctBadge:     { width: 60, height: 60, borderRadius: 30, borderWidth: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: BG2 },
  pctText:      { color: GOLDB, fontSize: 14, fontWeight: '800' },
  pctSub:       { color: TMUTE, fontSize: 7, fontWeight: '600', letterSpacing: 0.1 },
  schemeAmtLabel:{ color: TMUTE, fontSize: 9, fontWeight: '500', letterSpacing: 0.15, marginBottom: 2, textTransform: 'uppercase' },
  schemeAmt:    { color: TEXT, fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  schemeSub:    { color: TMUTE, fontSize: 11, marginTop: 2 },
  barWrap:      { height: 5, backgroundColor: LINE, borderRadius: 99, marginVertical: 10, overflow: 'hidden' },
  barFill:      { height: 5, backgroundColor: GOLD, borderRadius: 99 },
  barMeta:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  barMetaText:  { color: TMUTE, fontSize: 10, fontWeight: '500' },
  schemeFooter: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 12 },
  miniStat:     { flex: 1, minWidth: 80, padding: 9, borderRadius: 10, backgroundColor: SRF2, borderWidth: 1, borderColor: LINE },
  miniLabel:    { color: TMUTE, fontSize: 8, fontWeight: '500', letterSpacing: 0.15, marginBottom: 2, textTransform: 'uppercase' },
  miniVal:      { color: TEXT, fontSize: 12, fontWeight: '600' },
  schemeActions:{ flexDirection: 'row', gap: 8, marginTop: 4 },
  payNowBtn:    { flex: 1, backgroundColor: GOLD, borderRadius: 10, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  payNowText:   { color: '#1A1408', fontSize: 13, fontWeight: '800' },
  ghostBtn:     { flex: 1, backgroundColor: 'rgba(232,185,72,0.08)', borderRadius: 10, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: LINE },
  ghostBtnText: { color: TEXT, fontSize: 12, fontWeight: '600' },

  // Browse plans
  browseTitle: { color: TEXT, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  browseSub:   { color: TDIM, fontSize: 12, marginBottom: 16 },
  planCard:    { backgroundColor: SURFACE, borderRadius: 14, padding: 18, borderWidth: 1, borderColor: LINE, marginBottom: 8 },
  planEmoji:   { fontSize: 28, marginBottom: 10 },
  planTitle:   { color: TEXT, fontSize: 18, fontWeight: '700', marginBottom: 2 },
  planTypeLabel:{ color: GOLDB, fontSize: 12, fontWeight: '600', marginBottom: 8 },
  planDesc:    { color: TDIM, fontSize: 12, lineHeight: 18, marginBottom: 14 },
  planJoinBtn: { backgroundColor: GOLD, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  jrCard:      { backgroundColor: SURFACE, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: LINE, marginBottom: 6 },
  jrType:      { color: TEXT, fontSize: 13, fontWeight: '700' },
  jrAmt:       { color: GOLDB, fontSize: 12, marginTop: 2 },
  jrNote:      { fontSize: 11, marginTop: 4 },

  // History
  historyRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: LINE },
  historySchemeId:{ color: TEXT, fontSize: 14, fontWeight: '700' },
  historySub:   { color: TMUTE, fontSize: 11, marginTop: 2 },
  historyAmt:   { fontSize: 14, fontWeight: '700' },
  viewBtn:      { backgroundColor: SRF2, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: LINE },
  viewBtnText:  { color: TEXT, fontSize: 12, fontWeight: '600' },

  // Past chits
  pastGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },

  // Empty
  emptyBox:   { borderRadius: 16, padding: 40, alignItems: 'center', backgroundColor: SURFACE, borderWidth: 1, borderColor: LINES, borderStyle: 'dashed' },
  emptyIcon:  { color: GOLD, fontSize: 36, marginBottom: 10 },
  emptyTitle: { color: TEXT, fontSize: 18, fontWeight: '700', marginBottom: 4 },
  emptySub:   { color: TDIM, fontSize: 12, textAlign: 'center', marginBottom: 16 },
  goldBtnSm:  { backgroundColor: GOLD, borderRadius: 10, paddingHorizontal: 22, paddingVertical: 10 },

  footer: { color: TMUTE, fontSize: 11, textAlign: 'center', marginTop: 24 },

  // Modals
  overlay:   { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet:     { backgroundColor: BG2, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '90%', position: 'absolute', bottom: 0, left: 0, right: 0 },
  sheetHandle:    { width: 40, height: 4, backgroundColor: LINES, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle:     { color: TEXT, fontSize: 20, fontWeight: '800' },
  sheetHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sheetCloseBtn:  { width: 32, height: 32, borderRadius: 16, backgroundColor: SURFACE, alignItems: 'center', justifyContent: 'center' },
  sheetCloseTxt:  { color: TDIM, fontSize: 14, fontWeight: '600' },

  // Pay now modal
  payAmtBox:      { backgroundColor: SURFACE, borderRadius: 14, padding: 16, marginBottom: 16, alignItems: 'center', borderWidth: 1, borderColor: LINES },
  payAmtLabel:    { color: TMUTE, fontSize: 9, fontWeight: '600', letterSpacing: 0.15, marginBottom: 4 },
  payAmtVal:      { color: GOLDB, fontSize: 36, fontWeight: '800', letterSpacing: -1 },
  payAmtSub:      { color: TDIM, fontSize: 11, marginTop: 4 },
  shopCard:       { backgroundColor: SURFACE, borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: LINE },
  shopName:       { color: TEXT, fontSize: 15, fontWeight: '700', marginBottom: 8 },
  shopRow:        { color: TDIM, fontSize: 13 },
  shopInfoRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  shopInfoIcon:   { fontSize: 15 },
  shopInfoText:   { color: TDIM, fontSize: 13 },
  badge:          { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: GOLD + '22', borderWidth: 1, borderColor: GOLD + '55' },
  badgeText:      { color: GOLD, fontSize: 9, fontWeight: '700', letterSpacing: 0.4 },
  qrImg:          { width: '100%', height: 200, marginTop: 10, borderRadius: 10 },
  divRow:         { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 12 },
  divLine:        { flex: 1, height: 1, backgroundColor: LINE },
  divLabel:       { color: TMUTE, fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  orRow:          { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 10 },
  orLine:         { flex: 1, height: 1, backgroundColor: LINE },
  orTxt:          { color: TMUTE, fontSize: 11, fontWeight: '700' },
  uploadBtn:      { borderRadius: 14, borderWidth: 2, borderColor: LINES, borderStyle: 'dashed', overflow: 'hidden', marginBottom: 4 },
  uploadInner:    { alignItems: 'center', justifyContent: 'center', paddingVertical: 28 },
  uploadTitle:    { color: TEXT, fontSize: 14, fontWeight: '700', marginBottom: 4 },
  uploadSub:      { color: TDIM, fontSize: 12 },
  screenshotImg:  { width: '100%', height: 180 },
  screenshotOverlay:{ ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  screenshotOverlayTxt:{ color: '#fff', fontSize: 13, fontWeight: '700' },
  removeBtn:      { alignSelf: 'flex-end', marginBottom: 6, paddingHorizontal: 10, paddingVertical: 4 },
  removeBtnText:  { color: RED, fontSize: 12, fontWeight: '600' },
  fieldWrap:      { marginBottom: 12 },
  fieldLabel:     { color: TMUTE, fontSize: 11, fontWeight: '600', letterSpacing: 0.1, marginBottom: 6 },
  field:          { backgroundColor: SURFACE, borderRadius: 12, borderWidth: 1.5, borderColor: LINE, color: TEXT, fontSize: 14, padding: 12 },
  goldBtn:        { backgroundColor: GOLD, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  goldBtnText:    { color: '#1A1408', fontSize: 15, fontWeight: '800' },
  errText:        { color: RED, fontSize: 13, marginTop: 4, marginBottom: 4 },
  doneText:       { color: GREEN, fontSize: 13, marginTop: 4, marginBottom: 4 },

  // Join modal
  chipRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipSel:     { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: SURFACE, borderWidth: 1, borderColor: LINE },
  chipSelActive:{ backgroundColor: GOLD, borderColor: GOLD },
  chipSelText: { color: TDIM, fontSize: 13, fontWeight: '600' },
  termsRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginVertical: 12 },
  checkbox:    { width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: LINES, alignItems: 'center', justifyContent: 'center' },
  termsText:   { color: TDIM, fontSize: 12, flex: 1, lineHeight: 18 },

  // Breakdown modal
  bdTabs:      { flexDirection: 'row', gap: 4, marginBottom: 14 },
  bdTab:       { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: SURFACE, alignItems: 'center', borderWidth: 1, borderColor: LINE },
  bdTabActive: { backgroundColor: GOLD, borderColor: GOLD },
  bdTabText:   { color: TDIM, fontSize: 12, fontWeight: '600' },
  bdRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 10 },
  bdMon:       { color: TEXT, fontSize: 15, fontWeight: '700' },
  bdSub:       { color: TMUTE, fontSize: 11, marginTop: 2 },
  bdAmt:       { color: TEXT, fontSize: 14, fontWeight: '700' },
  bdGold:      { color: GOLDB, fontSize: 12, fontWeight: '600' },
});
