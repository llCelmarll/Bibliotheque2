import React, { useState } from 'react';
import { View, Image, ActivityIndicator, StyleSheet, StyleProp, ViewStyle, ImageStyle, ImageResizeMode } from "react-native";
import { resolveCoverUrl } from '@/utils/coverUrl';

interface BookCoverProps {
    url?: string;
    style?: StyleProp<ImageStyle>;
    containerStyle?: StyleProp<ViewStyle>;
    resizeMode?: ImageResizeMode;
}

const BookCover = ({ url, style, containerStyle, resizeMode }: BookCoverProps) => {
    const [loading, setLoading] = useState(true);

    return (
        <View style={[styles.coverContainer, containerStyle]} testID="book-cover-container">
            {loading && <ActivityIndicator style={styles.imageLoader} testID="book-cover-loading" />}
            <Image
                testID="book-cover-image"
                source={
                    url ? {uri: resolveCoverUrl(url)} : require('../assets/images/default-book-cover.jpg')
                }
                style={[styles.coverImage, style]}
                resizeMode={resizeMode || 'cover'}
                // onLoadStart={() => {                                                   ATTENTION CAUSE RE-RENDER EN BOUCLE
                //     if (!loading) setLoading(true); // évite le setState inutile
                // }}
                onLoadEnd={() => {
                    if (loading) setLoading(false); // évite boucle
                }}
                onError={() => {
                    if (loading) setLoading(false); // idem
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
        backgroundColor: '#f3f4f6',
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