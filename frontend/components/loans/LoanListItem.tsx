import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Pressable, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Loan, LoanStatus } from '@/types/loan';
import { LoanStatusBadge } from './LoanStatusBadge';
import BookCover from '@/components/BookCover';
import { useRouter } from 'expo-router';
import { loanService } from '@/services/loanService';

interface LoanListItemProps {
  loan: Loan;
  onReturn?: () => void;
}

export const LoanListItem: React.FC<LoanListItemProps> = ({ loan, onReturn }) => {
  const router = useRouter();
  const [returning, setReturning] = useState(false);

  const handlePress = () => {
    router.push(`/(tabs)/loans/${loan.id}`);
  };

  const handleReturn = (e: any) => {
    e?.stopPropagation?.();

    if (Platform.OS === 'web') {
      // Sur web, utiliser window.confirm
      const confirmed = window.confirm(
        `Confirmer le retour de "${loan.book.title}" ?`
      );
      if (confirmed) {
        confirmReturn();
      }
    } else {
      // Sur mobile, utiliser Alert.alert
      Alert.alert(
        'Retour du livre',
        `Confirmer le retour de "${loan.book.title}" ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Confirmer',
            onPress: confirmReturn,
          },
        ]
      );
    }
  };

  const confirmReturn = async () => {
    setReturning(true);
    try {
      await loanService.returnLoan(loan.id);
      if (Platform.OS === 'web') {
        window.alert('Le livre a été retourné avec succès.');
      } else {
        Alert.alert('Succès', 'Le livre a été retourné');
      }
      onReturn?.();
    } catch (error) {
      if (Platform.OS === 'web') {
        window.alert('Erreur: Impossible de retourner le livre');
      } else {
        Alert.alert('Erreur', 'Impossible de retourner le livre');
      }
    } finally {
      setReturning(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Non définie';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const daysOverdue = loanService.getDaysOverdue(loan);
  const daysRemaining = loanService.getDaysRemaining(loan);
  const canReturn = loan.status === LoanStatus.ACTIVE || loan.status === LoanStatus.OVERDUE;

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      <BookCover
        url={loan.book.cover_url}
        style={styles.cover}
        containerStyle={styles.coverContainer}
        resizeMode="cover"
      />

      <View style={styles.infoContainer}>
        <Text style={styles.bookTitle} numberOfLines={2}>
          {loan.book.title}
        </Text>

        <Text style={styles.borrowerName}>
          Prêté à : <Text style={styles.borrowerNameBold}>{loan.borrower.name}</Text>
        </Text>

        <View style={styles.datesContainer}>
          <Text style={styles.dateText}>
            Prêté le {formatDate(loan.loan_date)}
          </Text>
          {loan.due_date && (
            <Text style={styles.dateText}>
              Retour prévu : {formatDate(loan.due_date)}
            </Text>
          )}
        </View>

        <LoanStatusBadge
          status={loan.status}
          daysOverdue={daysOverdue}
          daysRemaining={daysRemaining}
        />
      </View>

      {canReturn && (
        <Pressable
          style={styles.returnButton}
          onPress={handleReturn}
          disabled={returning}
          accessibilityLabel="Marquer comme retourné"
          accessibilityHint="Enregistrer le retour de ce livre"
        >
          <MaterialIcons
            name="assignment-return"
            size={20}
            color={returning ? '#BDBDBD' : '#4CAF50'}
          />
          <Text style={[styles.returnButtonText, returning && styles.returnButtonTextDisabled]}>
            Retourner
          </Text>
        </Pressable>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  cover: {
    width: 60,
    height: 90,
  },
  coverContainer: {
    width: 60,
    height: 90,
    marginRight: 12,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 4,
  },
  borrowerName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  borrowerNameBold: {
    fontWeight: '600',
    color: '#424242',
  },
  datesContainer: {
    marginBottom: 6,
  },
  dateText: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 2,
  },
  returnButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 8,
    marginLeft: 8,
  },
  returnButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
  },
  returnButtonTextDisabled: {
    color: '#BDBDBD',
  },
});
