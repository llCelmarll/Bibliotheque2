import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ChangelogEntry } from '@/utils/useChangelog';
import { useTheme } from '@/contexts/ThemeContext';

interface Props {
  visible: boolean;
  entry: ChangelogEntry;
  onClose: () => void;
}

export function WhatsNewModal({ visible, entry, onClose }: Props) {
  const router = useRouter();
  const theme = useTheme();

  const handleViewHistory = () => {
    onClose();
    router.push('/account/changelog');
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: `${theme.textPrimary}80` }]}>
        <View style={[styles.container, { backgroundColor: theme.bgCard, shadowColor: theme.textPrimary }]}>
          <Text style={[styles.header, { color: theme.accent }]}>Nouveautés</Text>
          <Text style={[styles.version, { color: theme.textPrimary }]}>Version {entry.version}</Text>
          <Text style={[styles.date, { color: theme.textMuted }]}>{formatDate(entry.date)}</Text>
          <Text style={[styles.title, { color: theme.textPrimary }]}>{entry.title}</Text>
          <Text style={[styles.description, { color: theme.textSecondary }]}>{entry.description}</Text>
          <View style={styles.buttons}>
            <TouchableOpacity style={[styles.secondaryButton, { borderColor: theme.accent }]} onPress={handleViewHistory}>
              <Text style={[styles.secondaryButtonText, { color: theme.accent }]}>Voir l'historique</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.primaryButton, { backgroundColor: theme.accent }]} onPress={onClose}>
              <Text style={[styles.primaryButtonText, { color: theme.textInverse }]}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  version: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  date: {
    fontSize: 13,
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
});
