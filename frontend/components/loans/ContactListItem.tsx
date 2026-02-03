import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Contact } from '@/types/contact';
import { MaterialIcons } from '@expo/vector-icons';

interface ContactListItemProps {
  contact: Contact;
  onPress?: (contact: Contact) => void;
  showContact?: boolean;
  showStats?: boolean;
}

export const ContactListItem: React.FC<ContactListItemProps> = ({
  contact,
  onPress,
  showContact = true,
  showStats = false,
}) => {
  const handlePress = () => {
    onPress?.(contact);
  };

  const activeLoans = contact.active_loans_count || 0;
  const activeBorrows = contact.active_borrows_count || 0;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      disabled={!onPress}
      testID={`contact-item-${contact.id}`}
    >
      <View style={styles.iconContainer}>
        <MaterialIcons name="person" size={32} color="#2196F3" />
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.name}>{contact.name}</Text>

        {showStats ? (
          <View style={styles.statsRow}>
            {activeLoans > 0 && (
              <View style={styles.statBadge}>
                <MaterialIcons name="call-made" size={14} color="#4CAF50" />
                <Text style={styles.statText}>
                  {activeLoans} {activeLoans === 1 ? 'prêt' : 'prêts'}
                </Text>
              </View>
            )}
            {activeBorrows > 0 && (
              <View style={[styles.statBadge, styles.borrowBadge]}>
                <MaterialIcons name="call-received" size={14} color="#FF9800" />
                <Text style={[styles.statText, styles.borrowText]}>
                  {activeBorrows} {activeBorrows === 1 ? 'emprunt' : 'emprunts'}
                </Text>
              </View>
            )}
            {activeLoans === 0 && activeBorrows === 0 && (
              <Text style={styles.noLoanText}>Aucun en cours</Text>
            )}
          </View>
        ) : (
          showContact && (
            <>
              {contact.email && (
                <View style={styles.contactRow}>
                  <MaterialIcons name="email" size={14} color="#757575" />
                  <Text style={styles.contactText}>{contact.email}</Text>
                </View>
              )}

              {contact.phone && (
                <View style={styles.contactRow}>
                  <MaterialIcons name="phone" size={14} color="#757575" />
                  <Text style={styles.contactText}>{contact.phone}</Text>
                </View>
              )}

              {contact.notes && (
                <View style={styles.contactRow}>
                  <MaterialIcons name="note" size={14} color="#757575" />
                  <Text style={styles.contactText} numberOfLines={1}>
                    {contact.notes}
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
    gap: 6,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  borrowBadge: {
    backgroundColor: '#FFF3E0',
  },
  statText: {
    fontSize: 12,
    color: '#4CAF50',
    marginLeft: 4,
    fontWeight: '600',
  },
  borrowText: {
    color: '#FF9800',
  },
  noLoanText: {
    fontSize: 13,
    color: '#9E9E9E',
    fontStyle: 'italic',
  },
});
