import {View, StyleSheet} from "react-native";
import { createMaterialTopTabNavigator} from '@react-navigation/material-top-tabs';
import {BookDetail} from "@/types/book";
import {Google} from "@expo/config-plugins/build/ios";
import {BaseInfoTab} from "@/components/BookDetail/BaseInfoTab";
import {GoogleBooksTab} from "@/components/BookDetail/GoogleBooksTab";
import {OpenLibraryTab} from "@/components/BookDetail/OpenLibraryTab";

interface BookDetailTabsProps {
	book: BookDetail;
}

const Tab = createMaterialTopTabNavigator();

export function BookDetailTabs({book}: BookDetailTabsProps) {
	return (
		<Tab.Navigator
		screenOptions={{
			tabBarLabelStyle: { fontSize: 12 },
			tabBarStyle: { backgroundColor: '#fff' },
			tabBarIndicatorStyle: { backgroundColor: '#000' },
		}}
		>
			{book.base && (
				<Tab.Screen
					name="Base"
					component={BaseInfoTab}
					initialParams={{book}}
				/>
			)}
			{book.google_books !== null && (
				<Tab.Screen
					name="Google Books"
					component={GoogleBooksTab}
					initialParams={{book}}
				/>
			)}
			{book.open_library !== null && (
				<Tab.Screen
					name="Open Library"
					component={OpenLibraryTab}
					initialParams={{book}}
				/>
			)}
		</Tab.Navigator>
	);
}