import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LoanStatus } from '@/types/loan';
import { useTheme } from '@/contexts/ThemeContext';

interface LoanStatusBadgeProps {
  status: LoanStatus;
  daysOverdue?: number;
  daysRemaining?: number;
}

export const LoanStatusBadge: React.FC<LoanStatusBadgeProps> = ({
  status,
  daysOverdue,
  daysRemaining,
}) => {
  const theme = useTheme();

  const getStatusConfig = () => {
    switch (status) {
      case LoanStatus.ACTIVE:
        if (daysRemaining !== undefined && daysRemaining <= 3 && daysRemaining > 0) {
          return { text: `${daysRemaining}j restant${daysRemaining > 1 ? 's' : ''}`, color: theme.warning, bg: theme.warningBg };
        }
        return { text: 'En cours', color: theme.success, bg: theme.successBg };
      case LoanStatus.RETURNED:
        return { text: 'Retourné', color: theme.textMuted, bg: theme.bgMuted };
      case LoanStatus.OVERDUE:
        return { text: daysOverdue ? `${daysOverdue}j de retard` : 'En retard', color: theme.danger, bg: theme.dangerBg };
      default:
        return { text: status, color: theme.textMuted, bg: theme.bgMuted };
    }
  };

  const config = getStatusConfig();

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.text, { color: config.color }]}>{config.text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
