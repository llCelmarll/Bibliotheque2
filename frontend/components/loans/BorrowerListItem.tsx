import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Borrower } from '@/types/borrower';
import { MaterialIcons } from '@expo/vector-icons';

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
  const handlePress = () => {
    onPress?.(borrower);
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      disabled={!onPress}
    >
      <View style={styles.iconContainer}>
        <MaterialIcons name="person" size={32} color="#2196F3" />
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.name}>{borrower.name}</Text>

        {showStats ? (
          <View style={styles.statsRow}>
            {borrower.active_loans_count !== undefined && borrower.active_loans_count > 0 ? (
              <View style={styles.statBadge}>
                <MaterialIcons name="library-books" size={14} color="#4CAF50" />
                <Text style={styles.statText}>
                  {borrower.active_loans_count} prêt{borrower.active_loans_count > 1 ? 's' : ''} en cours
                </Text>
              </View>
            ) : (
              <Text style={styles.noLoanText}>Aucun prêt en cours</Text>
            )}
          </View>
        ) : (
          showContact && (
            <>
              {borrower.email && (
                <View style={styles.contactRow}>
                  <MaterialIcons name="email" size={14} color="#757575" />
                  <Text style={styles.contactText}>{borrower.email}</Text>
                </View>
              )}

              {borrower.phone && (
                <View style={styles.contactRow}>
                  <MaterialIcons name="phone" size={14} color="#757575" />
                  <Text style={styles.contactText}>{borrower.phone}</Text>
                </View>
              )}

              {borrower.notes && (
                <View style={styles.contactRow}>
                  <MaterialIcons name="note" size={14} color="#757575" />
                  <Text style={styles.contactText} numberOfLines={1}>
                    {borrower.notes}
                  </Text>
                </View>
              )}
            </>
          )
        )}
      </View>

      {onPress && (
        <MaterialIcons name="chevron-right" size={24} color="#BDBDBD" />
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
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E3F2FD',
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
    color: '#212121',
    marginBottom: 4,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  contactText: {
    fontSize: 13,
    color: '#757575',
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
    backgroundColor: '#E8F5E9',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  statText: {
    fontSize: 12,
    color: '#4CAF50',
    marginLeft: 4,
    fontWeight: '600',
  },
  noLoanText: {
    fontSize: 13,
    color: '#9E9E9E',
    fontStyle: 'italic',
  },
});
