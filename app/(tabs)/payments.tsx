import { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet, Text, View, ScrollView, RefreshControl,
  TouchableOpacity, ActivityIndicator, Modal, TextInput,
  KeyboardAvoidingView, Platform, Image, Linking, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { getMyProfile, Payment, Scheme } from '@/services/userService';
import { getShopPaymentInfo, submitPaymentProof, ShopPaymentInfo, ScreenshotAsset } from '@/services/paymentService';
import { getFileUrl } from '@/services/api';

const BG      = '#05070F';
const BG2     = '#0B0F1C';
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
const LINES   = 'rgba(232,185,72,0.28)';

const fmt  = (n: number) => '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
const fmtg = (g: number) => g.toFixed(4) + 'g';

type FilterKey = 'all' | 'due' | 'review' | 'paid' | 'overdue';

function payStatusConfig(status: string): [string, string] {
  switch (status) {
    case 'paid':                  return [GREEN,  '● PAID'];
    case 'pending':               return [AMBER,  '● DUE'];
    case 'overdue':               return [RED,    '● OVERDUE'];
    case 'awaiting_verification': return [GOLDB,  '● IN REVIEW'];
    case 'rejected':              return [RED,    '● REJECTED'];
    default:                      return [TMUTE,  status.toUpperCase()];
  }
}

// ── Pay Now Modal ─────────────────────────────────────────────────────

function PayNowModal({
  payment, scheme, onClose, onSuccess,
}: {
  payment: Payment; scheme: Scheme | null; onClose: () => void; onSuccess: () => void;
}) {
  const [shop, setShop]               = useState<ShopPaymentInfo | null>(null);
  const [utr, setUtr]                 = useState('');
  const [note, setNote]               = useState('');
  const [screenshot, setScreenshot]   = useState<ScreenshotAsset | null>(null);
  const [submitting, setSubmitting]   = useState(false);
  const [done, setDone]               = useState('');
  const [err, setErr]                 = useState('');

  useEffect(() => { getShopPaymentInfo().then(setShop).catch(() => {}); }, []);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow photo library access to upload a screenshot.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as any,
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setScreenshot({
        uri: asset.uri,
        type: asset.mimeType ?? 'image/jpeg',
        fileName: asset.fileName ?? `proof_${Date.now()}.jpg`,
      });
    }
  };

  const submit = async () => {
    if (!utr.trim() && !screenshot) {
      setErr('Please enter a UTR number OR upload a payment screenshot.');
      return;
    }
    if (!scheme) { setErr('Scheme not found'); return; }
    setSubmitting(true); setErr('');
    try {
      const msg = await submitPaymentProof({
        schemeId: scheme._id,
        monthNumber: payment.monthNumber,
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

            {/* Title + close */}
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Pay Now</Text>
              <TouchableOpacity onPress={onClose} style={s.closeBtn}>
                <Text style={s.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Amount highlight */}
            <View style={s.payAmtBox}>
              <Text style={s.payAmtLabel}>AMOUNT DUE</Text>
              <Text style={s.payAmtVal}>{fmt(payment.amount)}</Text>
              {scheme && (
                <Text style={s.payAmtSub}>{scheme.schemeId} · Month {payment.monthNumber}</Text>
              )}
            </View>

            {/* Shop card */}
            {shop ? (
              <View style={s.shopCard}>
                <Text style={s.shopName}>{shop.shopName}</Text>
                {shop.ownerName ? (
                  <View style={s.shopRow}>
                    <Text style={s.shopRowIcon}>👤</Text>
                    <Text style={s.shopRowText}>{shop.ownerName}</Text>
                  </View>
                ) : null}
                {shop.phone ? (
                  <TouchableOpacity onPress={() => Linking.openURL(`tel:${shop.phone}`)}>
                    <View style={s.shopRow}>
                      <Text style={s.shopRowIcon}>📞</Text>
                      <Text style={[s.shopRowText, { color: GOLDB }]}>{shop.phone}</Text>
                      <View style={s.callBadge}><Text style={s.callBadgeText}>TAP TO CALL</Text></View>
                    </View>
                  </TouchableOpacity>
                ) : null}
                {shop.upiId ? (
                  <TouchableOpacity onPress={() => copyUpi(shop.upiId!)}>
                    <View style={s.shopRow}>
                      <Text style={s.shopRowIcon}>💳</Text>
                      <Text style={[s.shopRowText, { color: GREEN, flex: 1 }]}>{shop.upiId}</Text>
                      <View style={[s.callBadge, { backgroundColor: GREEN + '22', borderColor: GREEN + '55' }]}>
                        <Text style={[s.callBadgeText, { color: GREEN }]}>COPY</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ) : null}
                {shop.upiPayeeName ? (
                  <View style={s.shopRow}>
                    <Text style={s.shopRowIcon}>🏷️</Text>
                    <Text style={s.shopRowText}>Payee: {shop.upiPayeeName}</Text>
                  </View>
                ) : null}
                {qrUrl ? (
                  <View style={s.qrWrap}>
                    <Text style={s.qrLabel}>SCAN TO PAY</Text>
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

            {/* Divider */}
            <View style={s.dividerRow}>
              <View style={s.dividerLine} />
              <Text style={s.dividerText}>PROOF OF PAYMENT</Text>
              <View style={s.dividerLine} />
            </View>

            {/* UTR input */}
            <View style={s.fieldWrap}>
              <Text style={s.fieldLabel}>UTR / Transaction ID</Text>
              <TextInput
                style={s.field}
                value={utr}
                onChangeText={setUtr}
                placeholder="Enter transaction reference number"
                placeholderTextColor={TMUTE}
                autoCapitalize="characters"
              />
            </View>

            {/* OR divider */}
            <View style={s.orRow}>
              <View style={s.orLine} />
              <Text style={s.orText}>OR</Text>
              <View style={s.orLine} />
            </View>

            {/* Screenshot upload */}
            <TouchableOpacity style={s.uploadBtn} onPress={pickImage}>
              {screenshot ? (
                <View style={s.screenshotPreviewWrap}>
                  <Image source={{ uri: screenshot.uri }} style={s.screenshotPreview} resizeMode="contain" />
                  <View style={s.screenshotOverlay}>
                    <Text style={s.screenshotOverlayText}>Tap to change</Text>
                  </View>
                </View>
              ) : (
                <View style={s.uploadInner}>
                  <Text style={s.uploadIcon}>📷</Text>
                  <Text style={s.uploadTitle}>Upload Payment Screenshot</Text>
                  <Text style={s.uploadSub}>Tap to select from gallery</Text>
                </View>
              )}
            </TouchableOpacity>

            {screenshot ? (
              <TouchableOpacity
                onPress={() => setScreenshot(null)}
                style={s.removeScreenshot}
              >
                <Text style={s.removeScreenshotText}>✕ Remove screenshot</Text>
              </TouchableOpacity>
            ) : null}

            {/* Note */}
            <View style={[s.fieldWrap, { marginTop: 14 }]}>
              <Text style={s.fieldLabel}>Note for Admin (optional)</Text>
              <TextInput
                style={[s.field, { height: 72, textAlignVertical: 'top', paddingTop: 12 }]}
                value={note}
                onChangeText={setNote}
                placeholder="Any additional information…"
                placeholderTextColor={TMUTE}
                multiline
              />
            </View>

            {err  ? <Text style={s.errText}>{err}</Text>  : null}
            {done ? <Text style={s.doneText}>✓ {done}</Text> : null}

            <TouchableOpacity style={s.goldBtn} onPress={submit} disabled={submitting}>
              {submitting
                ? <ActivityIndicator color="#1A1408" />
                : <Text style={s.goldBtnText}>Submit Payment Proof →</Text>
              }
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Payment Card ──────────────────────────────────────────────────────

function PaymentCard({
  payment, scheme, onPayNow,
}: {
  payment: Payment; scheme: Scheme | null; onPayNow: () => void;
}) {
  const [color, label] = payStatusConfig(payment.status);
  const canPay = payment.status === 'pending' || payment.status === 'overdue';

  return (
    <View style={s.payCard}>
      <View style={[s.cardAccent, { backgroundColor: color }]} />

      <View style={s.cardHead}>
        <View style={{ flex: 1 }}>
          <Text style={s.cardSchemeId}>
            {scheme?.schemeId ?? '—'} · Month {payment.monthNumber}
          </Text>
          <View style={[s.pill, { backgroundColor: color + '22', alignSelf: 'flex-start', marginTop: 5 }]}>
            <Text style={[s.pillText, { color }]}>{label}</Text>
          </View>
        </View>
        <Text style={[s.cardAmt, {
          color: payment.status === 'paid' ? GREEN
               : payment.status === 'overdue' ? RED
               : AMBER,
        }]}>
          {fmt(payment.amount)}
        </Text>
      </View>

      <View style={s.cardMeta}>
        {payment.dueDate && (
          <Text style={s.cardMetaRow}>
            📅 Due {new Date(payment.dueDate).toLocaleDateString('en-IN')}
          </Text>
        )}
        {payment.paidDate && (
          <Text style={[s.cardMetaRow, { color: GREEN }]}>
            ✓ Paid {new Date(payment.paidDate).toLocaleDateString('en-IN')}
          </Text>
        )}
        {payment.gramsAdded > 0 && (
          <Text style={[s.cardMetaRow, { color: GOLDB }]}>
            💰 +{fmtg(payment.gramsAdded)} gold
          </Text>
        )}
        {payment.utrNumber ? (
          <Text style={[s.cardMetaRow, { color: TDIM }]}>
            🔖 UTR: {payment.utrNumber}
          </Text>
        ) : null}
        {payment.rejectionReason ? (
          <Text style={[s.cardMetaRow, { color: RED }]}>
            ⚠ {payment.rejectionReason}
          </Text>
        ) : null}
      </View>

      {canPay && (
        <TouchableOpacity style={s.payNowBtn} onPress={onPayNow} activeOpacity={0.85}>
          <Text style={s.payNowText}>↑ Pay Now</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────

export default function PaymentsScreen() {
  const [schemes, setSchemes]         = useState<Scheme[]>([]);
  const [payments, setPayments]       = useState<Payment[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [filter, setFilter]           = useState<FilterKey>('all');
  const [payNowPayment, setPayNowPayment] = useState<Payment | null>(null);

  const load = useCallback(async () => {
    try {
      const p = await getMyProfile();
      setSchemes(p.schemes ?? []);
      setPayments(p.payments ?? []);
    } catch {}
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await load(); setRefreshing(false);
  }, [load]);

  const filterDef: { key: FilterKey; label: string; count: number }[] = [
    { key: 'all',     label: 'All',       count: payments.length },
    { key: 'due',     label: 'Due',       count: payments.filter(p => p.status === 'pending' || p.status === 'overdue').length },
    { key: 'review',  label: 'In Review', count: payments.filter(p => p.status === 'awaiting_verification').length },
    { key: 'paid',    label: 'Paid',      count: payments.filter(p => p.status === 'paid').length },
    { key: 'overdue', label: 'Overdue',   count: payments.filter(p => p.status === 'overdue').length },
  ];

  const shown = payments.filter(p => {
    if (filter === 'all')    return true;
    if (filter === 'due')    return p.status === 'pending' || p.status === 'overdue';
    if (filter === 'review') return p.status === 'awaiting_verification';
    return p.status === filter;
  });

  // Match payment to its scheme — try both _id and direct schemeId field
  const getScheme = (p: Payment): Scheme | null => {
    if (p.scheme?._id) {
      return schemes.find(sc => sc._id === p.scheme!._id) ?? null;
    }
    return null;
  };

  const paidCount = payments.filter(p => p.status === 'paid').length;
  const dueCount  = payments.filter(p => p.status === 'pending' || p.status === 'overdue').length;

  if (loading) {
    return (
      <SafeAreaView style={s.loadWrap}>
        <ActivityIndicator size="large" color={GOLD} />
        <Text style={{ color: TDIM, fontSize: 14, marginTop: 8 }}>Loading payments…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Payments</Text>
          <Text style={s.headerSub}>{paidCount} paid · {dueCount} due</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} />}
      >
        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingVertical: 12 }}>
          <View style={{ flexDirection: 'row', paddingHorizontal: 14, gap: 6 }}>
            {filterDef.map(f => (
              <TouchableOpacity
                key={f.key}
                style={[s.chip, filter === f.key && s.chipActive]}
                onPress={() => setFilter(f.key)}
              >
                <Text style={[s.chipText, filter === f.key && s.chipTextActive]}>
                  {f.label} ({f.count})
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={{ paddingHorizontal: 14, gap: 10, paddingBottom: 24 }}>
          {shown.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyIcon}>◎</Text>
              <Text style={s.emptyTitle}>No payments found</Text>
              <Text style={{ color: TDIM, fontSize: 12 }}>Try a different filter</Text>
            </View>
          ) : shown.map(p => (
            <PaymentCard
              key={p._id}
              payment={p}
              scheme={getScheme(p)}
              onPayNow={() => setPayNowPayment(p)}
            />
          ))}
        </View>
      </ScrollView>

      {payNowPayment && (
        <PayNowModal
          payment={payNowPayment}
          scheme={getScheme(payNowPayment)}
          onClose={() => setPayNowPayment(null)}
          onSuccess={load}
        />
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: BG },
  loadWrap:{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' },

  header:      { paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: LINE },
  headerTitle: { color: TEXT, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  headerSub:   { color: TMUTE, fontSize: 11, marginTop: 2 },

  chip:          { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: SURFACE, borderWidth: 1, borderColor: LINE },
  chipActive:    { backgroundColor: GOLD, borderColor: GOLD },
  chipText:      { color: TMUTE, fontSize: 12, fontWeight: '600' },
  chipTextActive:{ color: '#1A1408' },

  payCard:    { backgroundColor: SURFACE, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(148,163,184,0.10)', overflow: 'hidden', position: 'relative' },
  cardAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  cardHead:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardSchemeId:{ color: TEXT, fontSize: 14, fontWeight: '700' },
  pill:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  pillText:   { fontSize: 9, fontWeight: '700', letterSpacing: 0.1 },
  cardAmt:    { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  cardMeta:   { gap: 5, marginBottom: 12 },
  cardMetaRow:{ color: TDIM, fontSize: 12 },

  payNowBtn:  { backgroundColor: GOLD, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  payNowText: { color: '#1A1408', fontSize: 13, fontWeight: '800' },

  emptyBox:   { borderRadius: 16, padding: 40, alignItems: 'center', backgroundColor: SURFACE, borderWidth: 1, borderColor: LINES, borderStyle: 'dashed' },
  emptyIcon:  { color: GOLD, fontSize: 36, marginBottom: 10 },
  emptyTitle: { color: TEXT, fontSize: 18, fontWeight: '700', marginBottom: 4 },

  // ── Modal ──
  overlay:    { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.65)' },
  sheet:      { backgroundColor: BG2, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, maxHeight: '94%', position: 'absolute', bottom: 0, left: 0, right: 0 },
  sheetHandle:{ width: 40, height: 4, backgroundColor: LINES, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  sheetTitle: { color: TEXT, fontSize: 20, fontWeight: '800' },
  closeBtn:   { width: 32, height: 32, borderRadius: 16, backgroundColor: SURFACE, alignItems: 'center', justifyContent: 'center' },
  closeBtnText:{ color: TDIM, fontSize: 14 },

  payAmtBox:  { backgroundColor: SURFACE, borderRadius: 14, padding: 18, marginBottom: 16, alignItems: 'center', borderWidth: 1, borderColor: LINES },
  payAmtLabel:{ color: TMUTE, fontSize: 9, fontWeight: '700', letterSpacing: 0.2, marginBottom: 6 },
  payAmtVal:  { color: GOLDB, fontSize: 38, fontWeight: '800', letterSpacing: -1.5 },
  payAmtSub:  { color: TDIM, fontSize: 12, marginTop: 6 },

  shopCard:   { backgroundColor: SURFACE, borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: LINE, gap: 10 },
  shopName:   { color: TEXT, fontSize: 16, fontWeight: '800', marginBottom: 2 },
  shopRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  shopRowIcon:{ fontSize: 14 },
  shopRowText:{ color: TDIM, fontSize: 13, flex: 1 },
  callBadge:  { backgroundColor: GOLDB + '22', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: GOLDB + '55' },
  callBadgeText:{ color: GOLDB, fontSize: 8, fontWeight: '800', letterSpacing: 0.1 },
  qrWrap:     { marginTop: 6, alignItems: 'center' },
  qrLabel:    { color: TMUTE, fontSize: 9, fontWeight: '700', letterSpacing: 0.2, marginBottom: 8 },
  qrImg:      { width: '100%', height: 200, borderRadius: 12, backgroundColor: '#fff' },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 14 },
  dividerLine:{ flex: 1, height: 1, backgroundColor: LINE },
  dividerText:{ color: TMUTE, fontSize: 9, fontWeight: '700', letterSpacing: 0.2 },

  fieldWrap:  { marginBottom: 12 },
  fieldLabel: { color: TDIM, fontSize: 11, fontWeight: '600', letterSpacing: 0.1, marginBottom: 7 },
  field:      { backgroundColor: SURFACE, borderRadius: 12, borderWidth: 1.5, borderColor: LINE, color: TEXT, fontSize: 14, paddingHorizontal: 14, paddingVertical: 13 },

  orRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 10 },
  orLine:     { flex: 1, height: 1, backgroundColor: LINE },
  orText:     { color: TMUTE, fontSize: 11, fontWeight: '700', letterSpacing: 0.1 },

  uploadBtn:  { borderWidth: 1.5, borderColor: LINES, borderRadius: 14, borderStyle: 'dashed', overflow: 'hidden' },
  uploadInner:{ padding: 24, alignItems: 'center', gap: 6 },
  uploadIcon: { fontSize: 32 },
  uploadTitle:{ color: TEXT, fontSize: 14, fontWeight: '700' },
  uploadSub:  { color: TMUTE, fontSize: 12 },

  screenshotPreviewWrap:{ position: 'relative' },
  screenshotPreview:    { width: '100%', height: 220, borderRadius: 12 },
  screenshotOverlay:    { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.55)', padding: 10, alignItems: 'center', borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
  screenshotOverlayText:{ color: TEXT, fontSize: 12, fontWeight: '600' },

  removeScreenshot:    { alignItems: 'center', marginTop: 8, padding: 6 },
  removeScreenshotText:{ color: RED, fontSize: 12, fontWeight: '600' },

  goldBtn:    { backgroundColor: GOLD, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 10 },
  goldBtnText:{ color: '#1A1408', fontSize: 15, fontWeight: '800' },
  errText:    { color: RED, fontSize: 13, marginVertical: 6 },
  doneText:   { color: GREEN, fontSize: 13, fontWeight: '600', marginVertical: 6 },
});
