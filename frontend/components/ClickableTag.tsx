import React from "react";
import { Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {FilterType} from "@/types/filter";

type ClickableTagProps = {
	type: FilterType;
	label: string;
	id: number;
	onPress: (type: FilterType, id: number) => void | undefined;
};

export function ClickableTag(props: ClickableTagProps) {
    // Déterminer l'icône en fonction du type
    let iconName: any = "pricetag-outline";
    if (props.type === "author") iconName = "person-outline";
    else if (props.type === "genre") iconName = "bookmark-outline";
    else if (props.type === "publisher") iconName = "book-outline";
    
    // Déterminer la couleur en fonction du type
    let tagColor = "#eef";
    let textColor = "#0066cc";
    if (props.type === "author") {
        tagColor = "#e6f7ff";
        textColor = "#0077cc"; 
    } else if (props.type === "genre") {
        tagColor = "#f0f8e6";
        textColor = "#4caf50";
    } else if (props.type === "publisher") {
        tagColor = "#fff3e0";
        textColor = "#ff9800";
    }
    
    return (
        <TouchableOpacity 
            style={[styles.tag, { backgroundColor: tagColor }]} 
            onPress={() => props.onPress(props.type, props.id)}>
            <Ionicons name={iconName} size={14} color={textColor} />
            <Text style={[styles.text, { color: textColor }]}>{props.label}</Text>
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