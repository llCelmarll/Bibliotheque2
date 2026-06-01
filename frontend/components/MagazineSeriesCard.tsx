import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import BookCover from '@/components/BookCover';
import { MagazineSeries } from '@/types/magazine';

interface Props {
    series: MagazineSeries;
}

const COVER_RATIO = 2 / 3;

export const MagazineSeriesCard: React.FC<Props> = ({ series }) => {
    const router = useRouter();
    const theme = useTheme();

    return (
        <TouchableOpacity
            onPress={() => router.push(`/(tabs)/magazines/${series.id}`)}
            style={[styles.card, { backgroundColor: theme.bgCard, borderRadius: theme.radiusCard, shadowColor: theme.accent }]}
            activeOpacity={0.8}
        >
            <BookCover
                url={series.cover_url}
                style={styles.cover}
                containerStyle={styles.coverContainer}
                resizeMode="contain"
            />
            <View style={styles.info}>
                <Text numberOfLines={2} style={[styles.title, { color: theme.textPrimary }]}>
                    {series.title}
                </Text>
                {!!series.publisher && (
                    <Text numberOfLines={1} style={[styles.publisher, { color: theme.textSecondary }]}>
                        {series.publisher}
                    </Text>
                )}
                <Text style={[styles.count, { color: theme.textMuted }]}>
                    {series.issue_count} numéro{series.issue_count !== 1 ? 's' : ''}
                </Text>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        overflow: 'hidden',
        shadowOpacity: 0.07,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 3 },
        elevation: 3,
    },
    cover: {
        width: '100%',
        aspectRatio: COVER_RATIO,
    },
    coverContainer: {
        width: '100%',
        aspectRatio: COVER_RATIO,
    },
    info: {
        padding: 10,
        gap: 4,
    },
    title: {
        fontWeight: '700',
        fontSize: Platform.OS === 'web' ? 15 : 16,
    },
    publisher: {
        fontSize: 13,
    },
    count: {
        fontSize: 12,
    },
});
