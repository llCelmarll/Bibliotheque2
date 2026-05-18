import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { BookDetail } from "@/types/book";
import { BaseInfoTab } from "@/components/BookDetail/BaseInfoTab";
import { useTheme } from '@/contexts/ThemeContext';

interface BookDetailTabsProps {
	book: BookDetail;
	onBookUpdated?: () => void;
	readOnly?: boolean;
}

const Tab = createMaterialTopTabNavigator();

export function BookDetailTabs({ book, onBookUpdated, readOnly }: BookDetailTabsProps) {
	const theme = useTheme();

	return (
		<Tab.Navigator
			screenOptions={{
				tabBarLabelStyle: { fontSize: 12 },
				tabBarStyle: { backgroundColor: theme.bgCard },
				tabBarIndicatorStyle: { backgroundColor: theme.accent },
				tabBarActiveTintColor: theme.textPrimary,
				tabBarInactiveTintColor: theme.textMuted,
				sceneStyle: { backgroundColor: theme.bgPrimary },
			}}
		>
			{book.base && (
				<Tab.Screen
					name="Base"
					component={BaseInfoTab}
					initialParams={{ book, onBookUpdated, readOnly }}
					key={`base-${book.base.id}-${book.base.updated_at ?? ''}`}
				/>
			)}
		</Tab.Navigator>
	);
}
