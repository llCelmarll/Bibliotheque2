import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useChangelog, ChangelogEntry } from '@/utils/useChangelog';

const TYPE_LABELS: Record<ChangelogEntry['type'], string> = {
  feature: 'Nouveauté',
  fix: 'Correction',
  improvement: 'Amélioration',
};

const TYPE_COLORS: Record<ChangelogEntry['type'], string> = {
  feature: '#2196F3',
  fix: '#f44336',
  improvement: '#4CAF50',
};

function VersionCard({ entry }: { entry: ChangelogEntry }) {
  const color = TYPE_COLORS[entry.type] ?? '#2196F3';
  const label = TYPE_LABELS[entry.type] ?? entry.type;
  const date = new Date(entry.date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.version}>v{entry.version}</Text>
        <View style={[styles.badge, { backgroundColor: color }]}>
          <Text style={styles.badgeText}>{label}</Text>
        </View>
      </View>
      <Text style={styles.date}>{date}</Text>
      <Text style={styles.title}>{entry.title}</Text>
      <Text style={styles.description}>{entry.description}</Text>
    </View>
  );
}

export default function ChangelogScreen() {
  const { entries, loading } = useChangelog();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  if (entries.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.emptyText}>Historique indisponible.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {entries.map((entry) => (
        <VersionCard key={entry.version} entry={entry} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    backgroundColor: '#f5f5f5',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
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
    color: '#333',
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  date: {
    fontSize: 13,
    color: '#999',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
});
