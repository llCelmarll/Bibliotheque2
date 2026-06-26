import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { joinWaitlist } from '@/services/waitlistService';

type FormState = 'idle' | 'loading' | 'success' | 'error';

const FEATURES = [
  {
    icon: 'library-outline' as const,
    title: 'Catalogue personnel',
    desc: 'Scannez vos ISBN ou ajoutez vos livres manuellement. Toute votre bibliothèque en un endroit.',
  },
  {
    icon: 'swap-horizontal-outline' as const,
    title: 'Prêts entre amis',
    desc: 'Prêtez et empruntez des livres à vos contacts. Suivez qui a quoi, sans vous perdre.',
  },
  {
    icon: 'star-outline' as const,
    title: 'Notes & avis',
    desc: 'Notez vos lectures, ajoutez des commentaires personnels et retrouvez vos impressions.',
  },
  {
    icon: 'search-outline' as const,
    title: 'Recherche avancée',
    desc: 'Filtrez par auteur, genre, statut de lecture ou éditeur. Retrouvez n\'importe quel livre en quelques secondes.',
  },
];

export default function WebLanding() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [referredBy, setReferredBy] = useState('');
  const [formState, setFormState] = useState<FormState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/(tabs)/books');
    }
  }, [isLoading, isAuthenticated]);

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#8B2020" />
      </View>
    );
  }

  if (isAuthenticated) return null;

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim()) {
      setErrorMsg('Le nom et l\'email sont obligatoires.');
      setFormState('error');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMsg('Veuillez entrer une adresse email valide.');
      setFormState('error');
      return;
    }
    setFormState('loading');
    setErrorMsg('');
    try {
      await joinWaitlist({
        name: name.trim(),
        email: email.trim(),
        message: message.trim() || undefined,
        referred_by: referredBy.trim() || undefined,
      });
      setFormState('success');
    } catch (err: any) {
      if (err?.status === 409) {
        setErrorMsg('Cet email est déjà sur la liste d\'attente.');
      } else if (err?.status === 429) {
        setErrorMsg('Trop de tentatives. Réessayez dans une heure.');
      } else {
        setErrorMsg(err?.message ?? 'Une erreur est survenue, réessayez plus tard.');
      }
      setFormState('error');
    }
  };

  const inputStyle = (field: string) => [
    styles.input,
    focusedField === field && styles.inputFocused,
  ];

  return (
    // @ts-ignore
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

      {/* ── Navigation ── */}
      {/* @ts-ignore */}
      <View role="banner" style={styles.nav}>
        <Text style={styles.navLogo}>Ma Bibliothèque</Text>
        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => router.push('/auth/login')}
          accessibilityRole="link"
        >
          <Text style={styles.navBtnText}>Se connecter</Text>
        </TouchableOpacity>
      </View>

      {/* ── Hero ── */}
      <View style={styles.hero}>
        <View style={styles.heroInner}>
          {/* @ts-ignore */}
          <Text role="heading" aria-level={1} style={styles.heroTitle}>
            Votre bibliothèque,{'\n'}toujours avec vous.
          </Text>
          <Text style={styles.heroSubtitle}>
            Cataloguez vos livres, suivez vos prêts et partagez vos lectures avec vos proches — depuis votre téléphone ou votre navigateur.
          </Text>
          <View style={styles.heroCtas}>
            <TouchableOpacity
              style={styles.ctaPrimary}
              onPress={() => {
                const el = typeof document !== 'undefined' ? document.getElementById('waitlist') : null;
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              accessibilityRole="button"
            >
              <Text style={styles.ctaPrimaryText}>Rejoindre la liste d'attente</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ctaSecondary}
              onPress={() => router.push('/auth/login')}
              accessibilityRole="link"
            >
              <Text style={styles.ctaSecondaryText}>J'ai déjà un compte</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* @ts-ignore */}
      <View role="main">

        {/* ── Fonctionnalités ── */}
        {/* @ts-ignore */}
        <View role="region" aria-label="Fonctionnalités" style={styles.featuresSection}>
          <View style={styles.container}>
            {/* @ts-ignore */}
            <Text role="heading" aria-level={2} style={styles.sectionLabel}>L'application</Text>
            {/* @ts-ignore */}
            <Text role="heading" aria-level={3} style={styles.sectionTitle}>
              Tout ce dont vous avez besoin pour gérer votre bibliothèque
            </Text>
            <View style={styles.featuresGrid}>
              {FEATURES.map((f) => (
                <View key={f.title} style={styles.featureCard}>
                  <View style={styles.featureIconWrap}>
                    <Ionicons name={f.icon} size={22} color="#8B2020" />
                  </View>
                  <Text style={styles.featureTitle}>{f.title}</Text>
                  <Text style={styles.featureDesc}>{f.desc}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ── Divider stat ── */}
        <View style={styles.statBand}>
          <View style={styles.container}>
            <View style={styles.statRow}>
              {[
                { value: 'Gratuit', label: 'Pour toujours' },
                { value: 'Android', label: 'Application mobile' },
                { value: 'Privé', label: 'Vos données vous appartiennent' },
              ].map((s) => (
                <View key={s.label} style={styles.statItem}>
                  <Text style={styles.statValue}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ── Waitlist ── */}
        {/* @ts-ignore */}
        <View
          // @ts-ignore
          nativeID="waitlist"
          role="form"
          aria-label="Rejoindre la liste d'attente"
          style={styles.waitlistSection}
        >
          <View style={styles.waitlistInner}>
            {/* @ts-ignore */}
            <Text role="heading" aria-level={2} style={styles.waitlistTitle}>
              L'application est en accès privé
            </Text>
            <Text style={styles.waitlistSubtitle}>
              Inscrivez-vous sur la liste d'attente et nous vous contacterons dès que votre accès sera disponible.
            </Text>

            {formState === 'success' ? (
              // @ts-ignore
              <View role="status" style={styles.successBox}>
                <Ionicons name="checkmark-circle" size={40} color="#2e7d32" style={{ marginBottom: 12 }} />
                <Text style={styles.successTitle}>Votre demande a été enregistrée !</Text>
                <Text style={styles.successText}>
                  Nous vous contacterons à l'adresse <Text style={{ fontWeight: '600' }}>{email}</Text> dès que votre accès sera disponible.
                </Text>
              </View>
            ) : (
              <View style={styles.formCard}>
                <View style={styles.formRow}>
                  <View style={styles.formGroup}>
                    <Text nativeID="label-name" style={styles.label}>Nom <Text style={styles.required}>*</Text></Text>
                    <TextInput
                      value={name}
                      onChangeText={setName}
                      aria-labelledby="label-name"
                      accessibilityLabel="Nom"
                      autoComplete="name"
                      style={inputStyle('name')}
                      placeholder="Votre nom"
                      placeholderTextColor="#bbb"
                      onFocus={() => setFocusedField('name')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                  <View style={styles.formGroup}>
                    <Text nativeID="label-email" style={styles.label}>Email <Text style={styles.required}>*</Text></Text>
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      aria-labelledby="label-email"
                      accessibilityLabel="Email"
                      autoComplete="email"
                      keyboardType="email-address"
                      style={inputStyle('email')}
                      placeholder="votre@email.com"
                      placeholderTextColor="#bbb"
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text nativeID="label-referred" style={styles.label}>Qui vous a recommandé l'application ? <Text style={styles.optional}>(optionnel)</Text></Text>
                  <TextInput
                    value={referredBy}
                    onChangeText={setReferredBy}
                    aria-labelledby="label-referred"
                    accessibilityLabel="Recommandé par"
                    style={inputStyle('referred')}
                    placeholder="Prénom ou pseudo"
                    placeholderTextColor="#bbb"
                    onFocus={() => setFocusedField('referred')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text nativeID="label-message" style={styles.label}>Message <Text style={styles.optional}>(optionnel)</Text></Text>
                  <TextInput
                    value={message}
                    onChangeText={setMessage}
                    aria-labelledby="label-message"
                    accessibilityLabel="Message"
                    multiline
                    numberOfLines={3}
                    style={[inputStyle('message'), styles.textarea]}
                    placeholder="Dites-nous en plus sur votre usage..."
                    placeholderTextColor="#bbb"
                    onFocus={() => setFocusedField('message')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>

                {formState === 'error' && (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle-outline" size={16} color="#b91c1c" />
                    {/* @ts-ignore */}
                    <Text role="alert" style={styles.errorText}>{errorMsg}</Text>
                  </View>
                )}

                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={formState === 'loading'}
                  style={[styles.submitBtn, formState === 'loading' && styles.submitBtnDisabled]}
                  accessibilityRole="button"
                >
                  {formState === 'loading'
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.submitBtnText}>Envoyer ma demande</Text>
                  }
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

      </View>

      {/* ── Footer ── */}
      {/* @ts-ignore */}
      <View role="contentinfo" style={styles.footer}>
        <View style={styles.container}>
          <Text style={styles.footerLogo}>Ma Bibliothèque</Text>
          <Text style={styles.footerText}>© 2026 — Application gratuite, vos données vous appartiennent.</Text>
          {/* Liens légaux à venir */}
        </View>
      </View>

    </ScrollView>
  );
}

const ACCENT = '#8B2020';
const ACCENT_DARK = '#6d1818';
const BG = '#fdfcfb';
const BG_ALT = '#f5f3ef';

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: BG },
  scrollContent: { flexGrow: 1 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },
  container: { maxWidth: 960, width: '100%', alignSelf: 'center', paddingHorizontal: 32 },

  // Nav
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 18,
    backgroundColor: BG,
    borderBottomWidth: 1,
    borderBottomColor: '#ece9e4',
  },
  navLogo: { fontSize: 18, fontWeight: '700', color: ACCENT, letterSpacing: 0.3 },
  navBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: ACCENT,
  },
  navBtnText: { color: ACCENT, fontWeight: '600', fontSize: 14 },

  // Hero
  hero: {
    backgroundColor: ACCENT,
    paddingVertical: 96,
    paddingHorizontal: 32,
  },
  heroInner: { maxWidth: 680, width: '100%', alignSelf: 'center' },
  heroTitle: {
    fontSize: 48,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 58,
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.80)',
    lineHeight: 30,
    marginBottom: 40,
    maxWidth: 560,
  },
  heroCtas: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  ctaPrimary: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 8,
  },
  ctaPrimaryText: { color: ACCENT, fontWeight: '700', fontSize: 15 },
  ctaSecondary: {
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  ctaSecondaryText: { color: 'rgba(255,255,255,0.9)', fontWeight: '600', fontSize: 15 },

  // Features
  featuresSection: { backgroundColor: BG, paddingVertical: 80 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: ACCENT,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 48,
    maxWidth: 520,
    lineHeight: 40,
  },
  featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  featureCard: {
    flex: 1,
    minWidth: 200,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 28,
    borderWidth: 1,
    borderColor: '#ece9e4',
  },
  featureIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#fdf0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  featureDesc: { fontSize: 14, color: '#666', lineHeight: 22 },

  // Stat band
  statBand: { backgroundColor: BG_ALT, paddingVertical: 48, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#ece9e4' },
  statRow: { flexDirection: 'row', justifyContent: 'space-around', flexWrap: 'wrap', gap: 24 },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 26, fontWeight: '800', color: ACCENT, marginBottom: 4 },
  statLabel: { fontSize: 13, color: '#888', fontWeight: '500' },

  // Waitlist
  waitlistSection: { backgroundColor: BG, paddingVertical: 80 },
  waitlistInner: { maxWidth: 640, width: '100%', alignSelf: 'center', paddingHorizontal: 32, alignItems: 'center' },
  waitlistTitle: { fontSize: 30, fontWeight: '700', color: '#1a1a1a', textAlign: 'center', marginBottom: 12 },
  waitlistSubtitle: { fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 26, marginBottom: 40 },

  formCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    borderWidth: 1,
    borderColor: '#ece9e4',
  },
  formRow: { flexDirection: 'row', gap: 16 },
  formGroup: { flex: 1, marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 8 },
  required: { color: ACCENT },
  optional: { color: '#aaa', fontWeight: '400' },
  input: {
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: '#1a1a1a',
    backgroundColor: '#fdfcfb',
  },
  inputFocused: { borderColor: ACCENT },
  textarea: { minHeight: 88, textAlignVertical: 'top', paddingTop: 11 },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: '#b91c1c', fontSize: 14, flex: 1 },

  submitBtn: {
    backgroundColor: ACCENT,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  successBox: {
    width: '100%',
    backgroundColor: '#f0fdf4',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  successTitle: { fontSize: 20, fontWeight: '700', color: '#166534', marginBottom: 10 },
  successText: { fontSize: 15, color: '#166534', textAlign: 'center', lineHeight: 24 },

  // Footer
  footer: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 40,
  },
  footerLogo: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 8 },
  footerText: { fontSize: 13, color: '#888' },
});
