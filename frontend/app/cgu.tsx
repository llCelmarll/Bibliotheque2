import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function CGUNative() {
  const router = useRouter();
  useEffect(() => { router.replace('/'); }, []);
  return null;
}
