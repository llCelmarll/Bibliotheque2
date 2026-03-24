import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Borrower } from '@/types/borrower';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';

interface BorrowerListItemProps {
  borrower: Borrower;
  onPress?: (borrower: Borrower) => void;
  showContact?: boolean;
  showStats?: boolean;
}

export const BorrowerListItem: React.FC<BorrowerListItemProps> = ({
  borrower,
  onPress,
  showContact = true,
  showStats = false,
}) => {
  const theme = useTheme();

  const handlePress = () => {
    onPress?.(borrower);
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: theme.bgCard, borderBottomColor: theme.borderLight }]}
      onPress={handlePress}
      disabled={!onPress}
      testID={`borrower-item-${borrower.id}`}
    >
      <View style={[styles.iconContainer, { backgroundColor: theme.accentLight }]}>
        <MaterialIcons name="person" size={32} color={theme.accent} />
      </View>

      <View style={styles.infoContainer}>
        <Text style={[styles.name, { color: theme.textPrimary }]}>{borrower.name}</Text>

        {showStats ? (
          <View style={styles.statsRow}>
            {borrower.active_loans_count !== undefined && borrower.active_loans_count > 0 ? (
              <View style={[styles.statBadge, { backgroundColor: theme.successBg }]}>
                <MaterialIcons name="library-books" size={14} color={theme.success} />
                <Text style={[styles.statText, { color: theme.success }]}>
                  {borrower.active_loans_count} prêt{borrower.active_loans_count > 1 ? 's' : ''} en cours
                </Text>
              </View>
            ) : (
              <Text style={[styles.noLoanText, { color: theme.textMuted }]}>Aucun prêt en cours</Text>
            )}
          </View>
        ) : (
          showContact && (
            <>
              {borrower.email && (
                <View style={styles.contactRow}>
                  <MaterialIcons name="email" size={14} color={theme.textMuted} />
                  <Text style={[styles.contactText, { color: theme.textSecondary }]}>{borrower.email}</Text>
                </View>
              )}

              {borrower.phone && (
                <View style={styles.contactRow}>
                  <MaterialIcons name="phone" size={14} color={theme.textMuted} />
                  <Text style={[styles.contactText, { color: theme.textSecondary }]}>{borrower.phone}</Text>
                </View>
              )}

              {borrower.notes && (
                <View style={styles.contactRow}>
                  <MaterialIcons name="note" size={14} color={theme.textMuted} />
                  <Text style={[styles.contactText, { color: theme.textSecondary }]} numberOfLines={1}>
                    {borrower.notes}
                  </Text>
                </View>
              )}
            </>
          )
        )}
      </View>

      {onPress && (
        <MaterialIcons name="chevron-right" size={24} color={theme.textMuted} />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContainer: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  contactText: {
    fontSize: 13,
    marginLeft: 6,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  statText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '600',
  },
  noLoanText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
});
