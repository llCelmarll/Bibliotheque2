import { useRef } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { ExternalLink } from '@/components/ExternalLink';
import API_CONFIG from '@/config/api';
import { useModalFocusTrap } from '@/hooks/useModalFocusTrap';

interface Props {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
  loading?: boolean;
}

export function ConsentUpdateModal({ visible, onAccept, onDecline, loading = false }: Props) {
  const theme = useTheme();
  const modalRef = useRef<View>(null);
  useModalFocusTrap(modalRef, visible);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDecline}
    >
      <View style={[styles.overlay, { backgroundColor: `${theme.textPrimary}80` }]}>
        <View ref={modalRef} style={[styles.container, { backgroundColor: theme.bgCard, shadowColor: theme.textPrimary }]}>
          <Text style={[styles.header, { color: theme.accent }]}>Mise à jour des CGU</Text>
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            Nos conditions ont été mises à jour
          </Text>
          <Text style={[styles.description, { color: theme.textSecondary }]}>
            Veuillez lire et accepter nos{' '}
            <ExternalLink href={`${API_CONFIG.WEB_URL}/cgu`}>
              <Text style={{ color: theme.accent }}>Conditions Générales d'Utilisation</Text>
            </ExternalLink>
            {' '}et notre{' '}
            <ExternalLink href={`${API_CONFIG.WEB_URL}/politique-confidentialite`}>
              <Text style={{ color: theme.accent }}>politique de confidentialité</Text>
            </ExternalLink>
            {' '}pour continuer à utiliser l'application.
          </Text>
          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: theme.textMuted }]}
              onPress={onDecline}
            >
              <Text style={[styles.secondaryButtonText, { color: theme.textMuted }]}>
                Se déconnecter
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: theme.accent, opacity: loading ? 0.6 : 1 }]}
              onPress={onAccept}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator size="small" color={theme.textInverse} />
                : <Text style={[styles.primaryButtonText, { color: theme.textInverse }]}>J'accepte</Text>
              }
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
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
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
