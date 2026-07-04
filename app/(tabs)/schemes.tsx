import { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet, Text, View, ScrollView, RefreshControl,
  TouchableOpacity, ActivityIndicator, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getMyProfile, Scheme, Payment } from '@/services/userService';

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

const fmt = (n: number) => '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
const fmtg = (g: number) => g.toFixed(4) + 'g';

function statusPill(status: string): [string, string] {
  switch (status) {
    case 'active':     return [GREEN, 'ACTIVE'];
    case 'complete':   return ['#60A5FA', 'MATURED'];
    case 'early_exit': return [AMBER, 'EARLY EXIT'];
    case 'pending':    return [AMBER, 'PENDING'];
    default:           return [TMUTE, status.toUpperCase()];
  }
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <View style={s.barWrap}>
      <View style={[s.barFill, { width: `${Math.min(100, pct)}%` as any }]} />
    </View>
  );
}

type Filter = 'all' | 'active' | 'complete' | 'early_exit' | 'pending';

function SchemeDetailModal({ scheme, payments, onClose }: {
  scheme: Scheme; payments: Payment[]; onClose: () => void;
}) {
  const [tab, setTab] = useState<'paid' | 'upcoming' | 'due'>('paid');
  const schemePays = payments.filter(p =>
    p.scheme?._id === scheme._id || (p as any).schemeId === scheme._id
  );
  const paid = schemePays.filter(p => p.status === 'paid');
  const due  = schemePays.filter(p => p.status === 'pending' || p.status === 'overdue');
  const upcoming = schemePays.filter(p =>
    p.status !== 'paid' && p.status !== 'pending' && p.status !== 'overdue'
  );
  const rows = tab === 'paid' ? paid : tab === 'due' ? due : upcoming;
  const [statusC, statusL] = statusPill(scheme.status);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose} />
      <View style={s.sheet}>
        <View style={s.sheetHandle} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <View>
            <Text style={s.sheetTitle}>{scheme.schemeId}</Text>
            <View style={[s.pill, { backgroundColor: statusC + '22', alignSelf: 'flex-start', marginTop: 4 }]}>
              <Text style={[s.pillText, { color: statusC }]}>● {statusL}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
            <Text style={{ color: TDIM, fontSize: 18 }}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={s.detailGrid}>
          {[
            { label: 'Monthly Amount', value: fmt(scheme.monthlyAmount) },
            { label: 'Gold Accumulated', value: fmtg(scheme.totalGramsAccumulated) },
            { label: 'Progress', value: `M ${scheme.currentMonth}/${scheme.totalMonths}` },
            { label: 'Start Date', value: new Date(scheme.startDate).toLocaleDateString('en-IN') },
            { label: 'Plan Type', value: scheme.planType === 'Type1' ? 'Gold Accumulation' : scheme.planType === 'Type2' ? 'Currency Conversion' : '—' },
            { label: 'Due Day', value: scheme.dueDay ? `Day ${scheme.dueDay}` : '—' },
          ].map((item, i, arr) => (
            <View key={item.label} style={[s.detailRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: LINE }]}>
              <Text style={s.detailLabel}>{item.label}</Text>
              <Text style={s.detailVal}>{item.value}</Text>
            </View>
          ))}
        </View>

        <Text style={[s.sheetTitle, { fontSize: 14, marginTop: 16, marginBottom: 10 }]}>Payment Breakdown</Text>

        <View style={s.bdTabs}>
          {([['paid', `Paid (${paid.length})`], ['upcoming', `Upcoming`], ['due', `Due (${due.length})`]] as const).map(([t, label]) => (
            <TouchableOpacity
              key={t}
              style={[s.bdTab, tab === t && s.bdTabActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[s.bdTabText, tab === t && { color: '#1A1408' }]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          {rows.length === 0 ? (
            <Text style={{ color: TMUTE, textAlign: 'center', margin: 20, fontSize: 13 }}>
              No payments in this category
            </Text>
          ) : rows.map((p, i) => {
            const statusColors: Record<string, string> = { paid: GREEN, pending: AMBER, overdue: RED, awaiting_verification: GOLDB, rejected: RED };
            const sc = statusColors[p.status] ?? TMUTE;
            const sl = p.status === 'paid' ? 'PAID' : p.status === 'awaiting_verification' ? 'IN REVIEW' : p.status.toUpperCase();
            return (
              <View key={p._id} style={[s.bdRow, i > 0 && { borderTopWidth: 1, borderTopColor: LINE }]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.bdMon}>Month {p.monthNumber}</Text>
                  {p.paidDate ? (
                    <Text style={s.bdSub}>{new Date(p.paidDate).toLocaleDateString('en-IN')}</Text>
                  ) : p.dueDate ? (
                    <Text style={s.bdSub}>Due {new Date(p.dueDate).toLocaleDateString('en-IN')}</Text>
                  ) : null}
                  {p.utrNumber ? <Text style={[s.bdSub, { color: GOLDB }]}>UTR: {p.utrNumber}</Text> : null}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={s.bdAmt}>{fmt(p.amount)}</Text>
                  {p.gramsAdded > 0 ? <Text style={s.bdGold}>{fmtg(p.gramsAdded)}</Text> : null}
                  <View style={[s.pill, { backgroundColor: sc + '22' }]}>
                    <Text style={[s.pillText, { color: sc }]}>{sl}</Text>
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

export default function SchemesScreen() {
  const [profile, setProfile] = useState<{ schemes: Scheme[]; payments: Payment[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<Scheme | null>(null);

  const load = useCallback(async () => {
    try {
      const p = await getMyProfile();
      setProfile({ schemes: p.schemes ?? [], payments: p.payments ?? [] });
    } catch {}
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={s.loadWrap}>
        <ActivityIndicator size="large" color={GOLD} />
        <Text style={{ color: TDIM, fontSize: 14, marginTop: 8 }}>Loading…</Text>
      </SafeAreaView>
    );
  }

  const schemes = profile?.schemes ?? [];
  const payments = profile?.payments ?? [];
  const totalGrams = schemes.reduce((sum, sc) => sum + (sc.totalGramsAccumulated || 0), 0);

  const filters: { key: Filter; label: string }[] = [
    { key: 'all',       label: `All (${schemes.length})` },
    { key: 'active',    label: `Active (${schemes.filter(x => x.status === 'active').length})` },
    { key: 'complete',  label: `Matured (${schemes.filter(x => x.status === 'complete').length})` },
    { key: 'early_exit',label: `Early Exit (${schemes.filter(x => x.status === 'early_exit').length})` },
    { key: 'pending',   label: `Pending (${schemes.filter(x => x.status === 'pending').length})` },
  ];

  const shown = filter === 'all' ? schemes : schemes.filter(sc => sc.status === filter);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>My Chits</Text>
          <Text style={s.headerSub}>All your gold schemes</Text>
        </View>
        <View style={s.goldPill}>
          <Text style={s.goldPillText}>{fmtg(totalGrams)} TOTAL</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} />}
      >
        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingVertical: 12 }}>
          <View style={{ flexDirection: 'row', paddingHorizontal: 14, gap: 6 }}>
            {filters.map(f => (
              <TouchableOpacity
                key={f.key}
                style={[s.chip, filter === f.key && s.chipActive]}
                onPress={() => setFilter(f.key)}
              >
                <Text style={[s.chipText, filter === f.key && s.chipTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={{ paddingHorizontal: 14, gap: 10, paddingBottom: 24 }}>
          {shown.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyIcon}>◎</Text>
              <Text style={s.emptyTitle}>No schemes found</Text>
              <Text style={{ color: TDIM, fontSize: 12 }}>Try a different filter</Text>
            </View>
          ) : shown.map(sc => {
            const pct = sc.totalMonths ? Math.round((sc.currentMonth / sc.totalMonths) * 100) : 0;
            const [statColor, statLabel] = statusPill(sc.status);
            return (
              <TouchableOpacity
                key={sc._id}
                style={s.schemeCard}
                onPress={() => setSelected(sc)}
                activeOpacity={0.85}
              >
                <View style={[s.schemeAccent, { backgroundColor: statColor }]} />
                <View style={s.schemeHead}>
                  <View style={{ gap: 6 }}>
                    <View style={{ flexDirection: 'row', gap: 7, flexWrap: 'wrap' }}>
                      <View style={s.schemeIdBadge}>
                        <Text style={s.schemeIdText}>{sc.schemeId}</Text>
                      </View>
                      <View style={[s.pill, { backgroundColor: statColor + '22' }]}>
                        <Text style={[s.pillText, { color: statColor }]}>● {statLabel}</Text>
                      </View>
                    </View>
                    <Text style={s.schemeAmtLabel}>MONTHLY COMMITMENT</Text>
                    <Text style={s.schemeAmt}>{fmt(sc.monthlyAmount)}</Text>
                  </View>
                  <View style={[s.pctBadge, { borderColor: statColor }]}>
                    <Text style={[s.pctText, { color: statColor === GREEN ? GREEN : GOLDB }]}>{pct}%</Text>
                    <Text style={s.pctSub}>M {sc.currentMonth}/{sc.totalMonths}</Text>
                  </View>
                </View>

                <ProgressBar pct={pct} />

                <View style={s.schemeFooterRow}>
                  <View>
                    <Text style={s.miniLabel}>GOLD SAVED</Text>
                    <Text style={[s.miniVal, { color: GOLDB, fontSize: 14 }]}>{fmtg(sc.totalGramsAccumulated)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.miniLabel}>STARTED</Text>
                    <Text style={s.miniVal}>{new Date(sc.startDate).toLocaleDateString('en-IN')}</Text>
                  </View>
                </View>

                <Text style={[s.tapHint, { color: TMUTE }]}>Tap for details →</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {selected && (
        <SchemeDetailModal
          scheme={selected}
          payments={payments}
          onClose={() => setSelected(null)}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: BG },
  loadWrap:{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' },

  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: LINE },
  headerTitle: { color: TEXT, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  headerSub:   { color: TMUTE, fontSize: 11, marginTop: 2 },
  goldPill:    { backgroundColor: 'rgba(232,185,72,0.14)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: LINES },
  goldPillText:{ color: GOLDB, fontSize: 11, fontWeight: '700', letterSpacing: 0.1 },

  chip:         { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: SURFACE, borderWidth: 1, borderColor: LINE },
  chipActive:   { backgroundColor: GOLD, borderColor: GOLD },
  chipText:     { color: TMUTE, fontSize: 12, fontWeight: '600' },
  chipTextActive:{ color: '#1A1408' },

  schemeCard:   { backgroundColor: SURFACE, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: 'rgba(148,163,184,0.10)', overflow: 'hidden', position: 'relative' },
  schemeAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  schemeHead:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  schemeIdBadge:{ backgroundColor: 'rgba(232,185,72,0.14)', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20 },
  schemeIdText: { color: GOLDB, fontSize: 10, fontWeight: '600', letterSpacing: 0.1 },
  pill:         { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  pillText:     { fontSize: 9, fontWeight: '700', letterSpacing: 0.1 },
  pctBadge:     { width: 60, height: 60, borderRadius: 30, borderWidth: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: BG2 },
  pctText:      { fontSize: 14, fontWeight: '800' },
  pctSub:       { color: TMUTE, fontSize: 7, fontWeight: '600' },
  schemeAmtLabel:{ color: TMUTE, fontSize: 8, fontWeight: '500', letterSpacing: 0.15, textTransform: 'uppercase' },
  schemeAmt:    { color: TEXT, fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  barWrap:      { height: 4, backgroundColor: LINE, borderRadius: 99, marginVertical: 10, overflow: 'hidden' },
  barFill:      { height: 4, backgroundColor: GOLD, borderRadius: 99 },
  schemeFooterRow:{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, marginBottom: 8 },
  miniLabel:    { color: TMUTE, fontSize: 8, fontWeight: '500', letterSpacing: 0.15, textTransform: 'uppercase', marginBottom: 2 },
  miniVal:      { color: TEXT, fontSize: 12, fontWeight: '600' },
  tapHint:      { fontSize: 10, fontWeight: '500', textAlign: 'right' },

  emptyBox:   { borderRadius: 16, padding: 40, alignItems: 'center', backgroundColor: SURFACE, borderWidth: 1, borderColor: LINES, borderStyle: 'dashed' },
  emptyIcon:  { color: GOLD, fontSize: 36, marginBottom: 10 },
  emptyTitle: { color: TEXT, fontSize: 18, fontWeight: '700', marginBottom: 4 },

  // Detail modal
  overlay:     { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet:       { backgroundColor: BG2, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '90%', position: 'absolute', bottom: 0, left: 0, right: 0 },
  sheetHandle: { width: 40, height: 4, backgroundColor: LINES, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle:  { color: TEXT, fontSize: 20, fontWeight: '800' },
  detailGrid:  { backgroundColor: SURFACE, borderRadius: 14, borderWidth: 1, borderColor: LINE, overflow: 'hidden', marginTop: 14 },
  detailRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13 },
  detailLabel: { color: TDIM, fontSize: 13 },
  detailVal:   { color: TEXT, fontSize: 14, fontWeight: '600' },

  bdTabs:      { flexDirection: 'row', gap: 4, marginBottom: 12 },
  bdTab:       { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: SURFACE, alignItems: 'center', borderWidth: 1, borderColor: LINE },
  bdTabActive: { backgroundColor: GOLD, borderColor: GOLD },
  bdTabText:   { color: TDIM, fontSize: 12, fontWeight: '600' },
  bdRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 10 },
  bdMon:       { color: TEXT, fontSize: 14, fontWeight: '700' },
  bdSub:       { color: TMUTE, fontSize: 11, marginTop: 2 },
  bdAmt:       { color: TEXT, fontSize: 14, fontWeight: '700' },
  bdGold:      { color: GOLDB, fontSize: 12, fontWeight: '600' },
});
