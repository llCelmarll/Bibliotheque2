import React from "react";
import { Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BookFilter } from "@/types/filter";
import { useTheme } from "@/contexts/ThemeContext";


type ClickableTagProps = {
	filter: BookFilter;
	onPress: (filter: BookFilter) => void;
};

export function ClickableTag(props: ClickableTagProps) {
    const theme = useTheme();

    let iconName: any = "pricetag-outline";
    if (props.filter.type === "author") iconName = "person-outline";
    else if (props.filter.type === "genre") iconName = "bookmark-outline";
    else if (props.filter.type === "publisher") iconName = "book-outline";
    else if (props.filter.type === "series") iconName = "layers-outline";

    return (
        <TouchableOpacity
            style={[styles.tag, { backgroundColor: theme.accentLight }]}
            onPress={() => props.onPress(props.filter)}
            testID="clickable-tag">
            <Ionicons name={iconName} size={13} color={theme.accent} />
            <Text style={[styles.text, { color: theme.accent }]}>{props.filter.name}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    tag: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 20,
        marginRight: 4,
        marginBottom: 4,
    },
    text: {
        fontSize: 13,
        marginLeft: 4,
        fontWeight: '500',
    },
});