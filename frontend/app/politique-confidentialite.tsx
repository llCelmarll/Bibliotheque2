import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function PolitiqueConfidentialiteNative() {
  const router = useRouter();
  useEffect(() => { router.replace('/'); }, []);
  return null;
}
