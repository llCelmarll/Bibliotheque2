import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BorrowStatus } from '@/types/borrowedBook';
import { useTheme } from '@/contexts/ThemeContext';

interface BorrowStatusBadgeProps {
  status: BorrowStatus;
  daysOverdue?: number;
  daysRemaining?: number;
}

export function BorrowStatusBadge({ status, daysOverdue = 0, daysRemaining = 0 }: BorrowStatusBadgeProps) {
  const theme = useTheme();

  const getStatusInfo = () => {
    switch (status) {
      case BorrowStatus.ACTIVE:
        if (daysOverdue > 0) {
          return {
            label: `En retard de ${daysOverdue} jour${daysOverdue > 1 ? 's' : ''}`,
            color: theme.danger,
            backgroundColor: theme.dangerBg,
          };
        }
        if (daysRemaining > 0) {
          return {
            label: `${daysRemaining} jour${daysRemaining > 1 ? 's' : ''} restant${daysRemaining > 1 ? 's' : ''}`,
            color: theme.accent,
            backgroundColor: theme.accentLight,
          };
        }
        return {
          label: 'Actif',
          color: theme.accent,
          backgroundColor: theme.accentLight,
        };

      case BorrowStatus.RETURNED:
        return {
          label: 'Retourné',
          color: theme.success,
          backgroundColor: theme.successBg,
        };

      case BorrowStatus.OVERDUE:
        return {
          label: `En retard de ${daysOverdue} jour${daysOverdue > 1 ? 's' : ''}`,
          color: theme.danger,
          backgroundColor: theme.dangerBg,
        };

      default:
        return {
          label: 'Inconnu',
          color: theme.textMuted,
          backgroundColor: theme.bgMuted,
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
