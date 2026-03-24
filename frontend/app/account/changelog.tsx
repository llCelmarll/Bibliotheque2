import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useChangelog, ChangelogEntry } from '@/utils/useChangelog';
import { useTheme } from '@/contexts/ThemeContext';

const TYPE_LABELS: Record<ChangelogEntry['type'], string> = {
  feature: 'Nouveauté',
  fix: 'Correction',
  improvement: 'Amélioration',
};

function VersionCard({ entry }: { entry: ChangelogEntry }) {
  const theme = useTheme();

  const badgeColor =
    entry.type === 'feature' ? theme.accent :
    entry.type === 'fix' ? theme.danger :
    theme.success;

  const label = TYPE_LABELS[entry.type] ?? entry.type;
  const date = new Date(entry.date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <View style={[styles.card, { backgroundColor: theme.bgCard, shadowColor: theme.accent }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.version, { color: theme.textPrimary }]}>v{entry.version}</Text>
        <View style={[styles.badge, { backgroundColor: badgeColor }]}>
          <Text style={[styles.badgeText, { color: theme.textInverse }]}>{label}</Text>
        </View>
      </View>
      <Text style={[styles.date, { color: theme.textMuted }]}>{date}</Text>
      <Text style={[styles.title, { color: theme.textPrimary }]}>{entry.title}</Text>
      <Text style={[styles.description, { color: theme.textSecondary }]}>{entry.description}</Text>
    </View>
  );
}

export default function ChangelogScreen() {
  const { entries, loading } = useChangelog();
  const theme = useTheme();

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.bgPrimary }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  if (entries.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.bgPrimary }]}>
        <Text style={[styles.emptyText, { color: theme.textMuted }]}>Historique indisponible.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bgPrimary }]} contentContainerStyle={styles.content}>
      {entries.map((entry) => (
        <VersionCard key={entry.version} entry={entry} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingTop: Platform.OS === 'android' ? 8 : 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  version: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  date: {
    fontSize: 13,
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
});
