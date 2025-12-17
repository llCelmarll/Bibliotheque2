import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LoanStatus } from '@/types/loan';

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
  const getStatusConfig = () => {
    switch (status) {
      case LoanStatus.ACTIVE:
        if (daysRemaining !== undefined && daysRemaining <= 3 && daysRemaining > 0) {
          return {
            text: `${daysRemaining}j restant${daysRemaining > 1 ? 's' : ''}`,
            color: '#FFA500',
            backgroundColor: '#FFF3E0',
          };
        }
        return {
          text: 'En cours',
          color: '#4CAF50',
          backgroundColor: '#E8F5E9',
        };
      case LoanStatus.RETURNED:
        return {
          text: 'Retourné',
          color: '#757575',
          backgroundColor: '#F5F5F5',
        };
      case LoanStatus.OVERDUE:
        return {
          text: daysOverdue ? `${daysOverdue}j de retard` : 'En retard',
          color: '#F44336',
          backgroundColor: '#FFEBEE',
        };
      default:
        return {
          text: status,
          color: '#757575',
          backgroundColor: '#F5F5F5',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <View style={[styles.badge, { backgroundColor: config.backgroundColor }]}>
      <Text style={[styles.text, { color: config.color }]}>
        {config.text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
