import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Contact } from '@/types/contact';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';

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
  const theme = useTheme();

  const handlePress = () => {
    onPress?.(contact);
  };

  const activeLoans = contact.active_loans_count || 0;
  const activeBorrows = contact.active_borrows_count || 0;

  return (
    <TouchableOpacity
      style={[styles.container, { borderBottomColor: theme.borderLight, backgroundColor: theme.bgCard }]}
      onPress={handlePress}
      disabled={!onPress}
      testID={`contact-item-${contact.id}`}
    >
      <View style={[styles.iconContainer, { backgroundColor: contact.linked_user_id ? theme.accentLight : theme.accentLight }]}>
        <MaterialIcons name="person" size={32} color={contact.linked_user_id ? theme.accentMedium : theme.accent} />
      </View>

      <View style={styles.infoContainer}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: theme.textPrimary }]}>{contact.name}</Text>
          {contact.linked_user_id && (
            <View style={[styles.memberBadge, { backgroundColor: theme.accentMedium }]}>
              <Text style={[styles.memberBadgeText, { color: theme.textInverse }]}>Membre</Text>
            </View>
          )}
        </View>

        {showStats ? (
          <View style={styles.statsRow}>
            {activeLoans > 0 && (
              <View style={[styles.statBadge, { backgroundColor: theme.successBg }]}>
                <MaterialIcons name="call-made" size={14} color={theme.success} />
                <Text style={[styles.statText, { color: theme.success }]}>
                  {activeLoans} {activeLoans === 1 ? 'prêt' : 'prêts'}
                </Text>
              </View>
            )}
            {activeBorrows > 0 && (
              <View style={[styles.statBadge, { backgroundColor: theme.warningBg }]}>
                <MaterialIcons name="call-received" size={14} color={theme.warning} />
                <Text style={[styles.statText, { color: theme.warning }]}>
                  {activeBorrows} {activeBorrows === 1 ? 'emprunt' : 'emprunts'}
                </Text>
              </View>
            )}
            {activeLoans === 0 && activeBorrows === 0 && (
              <Text style={[styles.noLoanText, { color: theme.textMuted }]}>Aucun en cours</Text>
            )}
          </View>
        ) : (
          showContact && (
            <>
              {contact.email && (
                <View style={styles.contactRow}>
                  <MaterialIcons name="email" size={14} color={theme.textMuted} />
                  <Text style={[styles.contactText, { color: theme.textSecondary }]}>{contact.email}</Text>
                </View>
              )}

              {contact.phone && (
                <View style={styles.contactRow}>
                  <MaterialIcons name="phone" size={14} color={theme.textMuted} />
                  <Text style={[styles.contactText, { color: theme.textSecondary }]}>{contact.phone}</Text>
                </View>
              )}

              {contact.notes && (
                <View style={styles.contactRow}>
                  <MaterialIcons name="note" size={14} color={theme.textMuted} />
                  <Text style={[styles.contactText, { color: theme.textSecondary }]} numberOfLines={1}>
                    {contact.notes}
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
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  memberBadge: {
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  memberBadgeText: {
    fontSize: 10,
    fontWeight: '700',
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
    gap: 6,
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
