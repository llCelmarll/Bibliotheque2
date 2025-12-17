import { Redirect } from 'expo-router';

export default function LoansIndex() {
  return <Redirect href="/(tabs)/loans/(subtabs)/loans-list" />;
}
