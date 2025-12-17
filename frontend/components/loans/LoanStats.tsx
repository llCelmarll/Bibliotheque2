import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LoanStatistics } from '@/types/loan';

interface LoanStatsProps {
  statistics: LoanStatistics | null;
  loading?: boolean;
}

export const LoanStats: React.FC<LoanStatsProps> = ({ statistics, loading }) => {
  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Chargement des statistiques...</Text>
      </View>
    );
  }

  if (!statistics) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{statistics.total_loans}</Text>
        <Text style={styles.statLabel}>Total</Text>
      </View>

      <View style={styles.separator} />

      <View style={styles.statItem}>
        <Text style={[styles.statValue, { color: '#4CAF50' }]}>
          {statistics.active_loans}
        </Text>
        <Text style={styles.statLabel}>En cours</Text>
      </View>

      <View style={styles.separator} />

      <View style={styles.statItem}>
        <Text style={[styles.statValue, { color: '#F44336' }]}>
          {statistics.overdue_loans}
        </Text>
        <Text style={styles.statLabel}>En retard</Text>
      </View>

      <View style={styles.separator} />

      <View style={styles.statItem}>
        <Text style={[styles.statValue, { color: '#757575' }]}>
          {statistics.returned_loans}
        </Text>
        <Text style={styles.statLabel}>Retournés</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    shadowColor: '#000',
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
    color: '#212121',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#757575',
    textAlign: 'center',
  },
  separator: {
    width: 1,
    height: 40,
    backgroundColor: '#E0E0E0',
  },
  loadingText: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
  },
});
