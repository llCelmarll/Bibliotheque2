import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import BookCover from '@/components/BookCover';
import { MagazineIssue } from '@/types/magazine';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

interface Props {
    issue: MagazineIssue;
    seriesId: number;
}

export const MagazineIssueItem: React.FC<Props> = ({ issue, seriesId }) => {
    const router = useRouter();
    const theme = useTheme();

    const isLent = !!issue.current_loan;
    const label = issue.issue_number != null
        ? `#${issue.issue_number}`
        : issue.title || '—';

    return (
        <TouchableOpacity
            onPress={() => router.push(`/(tabs)/magazines/${seriesId}/issues/${issue.id}`)}
            style={[styles.container, { backgroundColor: theme.bgCard, borderColor: theme.borderLight }]}
            activeOpacity={0.75}
        >
            <BookCover
                url={issue.cover_url}
                style={styles.cover}
                containerStyle={styles.coverContainer}
                resizeMode="contain"
            />

            <View style={styles.info}>
                <Text style={[styles.number, { color: theme.textPrimary }]}>{label}</Text>
                {!!issue.title && issue.issue_number != null && (
                    <Text numberOfLines={1} style={[styles.title, { color: theme.textSecondary }]}>{issue.title}</Text>
                )}
                {!!issue.published_date && (
                    <Text style={[styles.date, { color: theme.textMuted }]}>{issue.published_date}</Text>
                )}

                <View style={styles.badges}>
                    {issue.is_read === true && (
                        <View style={[styles.badge, { backgroundColor: theme.successBg }]}>
                            <Ionicons name="checkmark-circle" size={12} color={theme.success} />
                            <Text style={[styles.badgeText, { color: theme.success }]}>Lu</Text>
                        </View>
                    )}
                    {issue.is_read === false && (
                        <View style={[styles.badge, { backgroundColor: theme.bgSecondary }]}>
                            <Ionicons name="ellipse-outline" size={12} color={theme.textMuted} />
                            <Text style={[styles.badgeText, { color: theme.textMuted }]}>Non lu</Text>
                        </View>
                    )}
                    {isLent && (
                        <View style={[styles.badge, { backgroundColor: theme.warningBg }]}>
                            <MaterialIcons name="swap-horiz" size={12} color={theme.warning} />
                            <Text style={[styles.badgeText, { color: theme.warning }]}>Prêté</Text>
                        </View>
                    )}
                </View>
            </View>

            <MaterialIcons name="chevron-right" size={20} color={theme.textMuted} style={styles.chevron} />
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderBottomWidth: 1,
        gap: 12,
    },
    coverContainer: {
        width: 44,
        height: 64,
        borderRadius: 4,
        flexShrink: 0,
    },
    cover: {
        width: 44,
        height: 64,
        borderRadius: 4,
    },
    info: {
        flex: 1,
        gap: 3,
    },
    number: {
        fontSize: 15,
        fontWeight: '700',
    },
    title: {
        fontSize: 13,
    },
    date: {
        fontSize: 12,
    },
    badges: {
        flexDirection: 'row',
        gap: 6,
        marginTop: 2,
        flexWrap: 'wrap',
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    chevron: {
        flexShrink: 0,
    },
});
