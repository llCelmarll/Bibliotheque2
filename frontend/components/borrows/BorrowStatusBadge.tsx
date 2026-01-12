import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BorrowStatus } from '@/types/borrowedBook';

interface BorrowStatusBadgeProps {
  status: BorrowStatus;
  daysOverdue?: number;
  daysRemaining?: number;
}

export function BorrowStatusBadge({ status, daysOverdue = 0, daysRemaining = 0 }: BorrowStatusBadgeProps) {
  const getStatusInfo = () => {
    switch (status) {
      case BorrowStatus.ACTIVE:
        if (daysOverdue > 0) {
          return {
            label: `En retard de ${daysOverdue} jour${daysOverdue > 1 ? 's' : ''}`,
            color: '#F44336',
            backgroundColor: '#FFEBEE',
          };
        }
        if (daysRemaining > 0) {
          return {
            label: `${daysRemaining} jour${daysRemaining > 1 ? 's' : ''} restant${daysRemaining > 1 ? 's' : ''}`,
            color: '#2196F3',
            backgroundColor: '#E3F2FD',
          };
        }
        return {
          label: 'Actif',
          color: '#2196F3',
          backgroundColor: '#E3F2FD',
        };

      case BorrowStatus.RETURNED:
        return {
          label: 'Retourné',
          color: '#4CAF50',
          backgroundColor: '#E8F5E9',
        };

      case BorrowStatus.OVERDUE:
        return {
          label: `En retard de ${daysOverdue} jour${daysOverdue > 1 ? 's' : ''}`,
          color: '#F44336',
          backgroundColor: '#FFEBEE',
        };

      default:
        return {
          label: 'Inconnu',
          color: '#9E9E9E',
          backgroundColor: '#F5F5F5',
        };
    }
  };

  const { label, color, backgroundColor } = getStatusInfo();

  return (
    <View style={[styles.badge, { backgroundColor }]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
  },
});
