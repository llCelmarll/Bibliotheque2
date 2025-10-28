import React from "react";
import { Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {BookFilter,FilterType} from "@/types/filter";


type ClickableTagProps = {
	filter: BookFilter;
	onPress: (filter: BookFilter) => void;
};

export function ClickableTag(props: ClickableTagProps) {
    // Déterminer l'icône en fonction du type
    let iconName: any = "pricetag-outline";
    if (props.filter.type === "author") iconName = "person-outline";
    else if (props.filter.type === "genre") iconName = "bookmark-outline";
    else if (props.filter.type === "publisher") iconName = "book-outline";
    
    // Déterminer la couleur en fonction du type
    let tagColor = "#eef";
    let textColor = "#0066cc";
    if (props.filter.type === "author") {
        tagColor = "#e6f7ff";
        textColor = "#0077cc"; 
    } else if (props.filter.type === "genre") {
        tagColor = "#f0f8e6";
        textColor = "#4caf50";
    } else if (props.filter.type === "publisher") {
        tagColor = "#fff3e0";
        textColor = "#ff9800";
    }
    
    return (
        <TouchableOpacity 
            style={[styles.tag, { backgroundColor: tagColor }]} 
            onPress={() => props.onPress(props.filter)}
            testID="clickable-tag">
            <Ionicons name={iconName} size={14} color={textColor} />
            <Text style={[styles.text, { color: textColor }]}>{props.filter.name}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    tag: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginRight: 4,
        marginBottom: 4,
        elevation: 1,
    },
    text: {
        fontSize: 14,
        marginLeft: 4,
    },
});