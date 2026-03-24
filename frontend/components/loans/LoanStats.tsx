import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LoanStatistics } from '@/types/loan';
import { useTheme } from '@/contexts/ThemeContext';

interface LoanStatsProps {
  statistics: LoanStatistics | null;
  loading?: boolean;
}

export const LoanStats: React.FC<LoanStatsProps> = ({ statistics, loading }) => {
  const theme = useTheme();

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bgCard, shadowColor: theme.textPrimary }]}>
        <Text style={[styles.loadingText, { color: theme.textMuted }]}>Chargement des statistiques...</Text>
      </View>
    );
  }

  if (!statistics) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bgCard, shadowColor: theme.textPrimary }]}>
      <View style={styles.statItem}>
        <Text style={[styles.statValue, { color: theme.textPrimary }]}>{statistics.total_loans}</Text>
        <Text style={[styles.statLabel, { color: theme.textMuted }]}>Total</Text>
      </View>

      <View style={[styles.separator, { backgroundColor: theme.borderLight }]} />

      <View style={styles.statItem}>
        <Text style={[styles.statValue, { color: theme.success }]}>
          {statistics.active_loans}
        </Text>
        <Text style={[styles.statLabel, { color: theme.textMuted }]}>En cours</Text>
      </View>

      <View style={[styles.separator, { backgroundColor: theme.borderLight }]} />

      <View style={styles.statItem}>
        <Text style={[styles.statValue, { color: theme.danger }]}>
          {statistics.overdue_loans}
        </Text>
        <Text style={[styles.statLabel, { color: theme.textMuted }]}>En retard</Text>
      </View>

      <View style={[styles.separator, { backgroundColor: theme.borderLight }]} />

      <View style={styles.statItem}>
        <Text style={[styles.statValue, { color: theme.textMuted }]}>
          {statistics.returned_loans}
        </Text>
        <Text style={[styles.statLabel, { color: theme.textMuted }]}>Retournés</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  separator: {
    width: 1,
    height: 40,
  },
  loadingText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
