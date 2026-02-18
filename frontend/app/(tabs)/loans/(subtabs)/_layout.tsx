import { Tabs } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { useContactInvitations } from '@/hooks/useContactInvitations';
import { useUserLoanRequests } from '@/hooks/useUserLoanRequests';

export default function SubTabsLayout() {
  const { pendingCount: invitationCount } = useContactInvitations();
  const { pendingCount: loanRequestCount } = useUserLoanRequests();
  const totalNotifications = invitationCount + loanRequestCount;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: '#757575',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E0E0E0',
          height: Platform.OS === 'web' ? 60 : 56,
          paddingBottom: Platform.OS === 'web' ? 0 : 4,
          paddingTop: Platform.OS === 'web' ? 0 : 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="loans-list"
        options={{
          title: 'Prêts',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="swap-horizontal-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="borrows-list"
        options={{
          title: 'Emprunts',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="contacts-list"
        options={{
          title: 'Contacts',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="invitations"
        options={{
          title: 'Invitations',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <View>
              <MaterialIcons name="person-add" size={size} color={color} />
              {totalNotifications > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {totalNotifications > 9 ? '9+' : totalNotifications}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: '#F44336',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
});
