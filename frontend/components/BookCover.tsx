import React, { useState } from 'react';
import { View, Image, ActivityIndicator, StyleSheet, StyleProp, ViewStyle, ImageStyle, ImageResizeMode } from "react-native";
import { resolveCoverUrl } from '@/utils/coverUrl';
import { useTheme } from '@/contexts/ThemeContext';

interface BookCoverProps {
    url?: string;
    style?: StyleProp<ImageStyle>;
    containerStyle?: StyleProp<ViewStyle>;
    resizeMode?: ImageResizeMode;
}

const BookCover = ({ url, style, containerStyle, resizeMode }: BookCoverProps) => {
    const [loading, setLoading] = useState(true);
    const [useFallback, setUseFallback] = useState(false);
    const theme = useTheme();

    const resolvedUrl = url ? resolveCoverUrl(url) : undefined;
    const source = (!resolvedUrl || useFallback)
        ? require('../assets/images/default-book-cover.jpg')
        : { uri: resolvedUrl };

    return (
        <View style={[styles.coverContainer, { backgroundColor: theme.bgMuted }, containerStyle]} testID="book-cover-container">
            {loading && <ActivityIndicator style={styles.imageLoader} testID="book-cover-loading" />}
            <Image
                testID="book-cover-image"
                source={source}
                style={[styles.coverImage, style]}
                resizeMode={resizeMode || 'cover'}
                onLoad={(e) => {
                    const source = e.nativeEvent.source;
                    if (source && source.width <= 1 && source.height <= 1) {
                        setUseFallback(true);
                    }
                    if (loading) setLoading(false);
                }}
                onLoadEnd={() => {
                    if (loading) setLoading(false);
                }}
                onError={() => {
                    if (loading) setLoading(false);
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    coverContainer: {
        width: 80,
        aspectRatio: 2/3,
        position: "relative",
        overflow: "hidden",
    },
    coverImage: {
        width: "100%",
        height: "100%",
    },
    imageLoader: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center",
    },
});

export default BookCover;