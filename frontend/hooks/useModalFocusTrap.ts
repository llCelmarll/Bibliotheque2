import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Piège la navigation clavier (Tab) à l'intérieur d'une modale et restaure
 * le focus sur l'élément déclencheur à la fermeture.
 * No-op sur natif (iOS/Android) : le Modal RN gère déjà nativement le focus-trap.
 * Utile uniquement pour le build web (react-native-web), où le DOM entier
 * reste techniquement accessible au clavier derrière l'overlay.
 */
export function useModalFocusTrap(containerRef: React.RefObject<any>, visible: boolean) {
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || !visible) return;

    const container = containerRef.current as HTMLElement | null;
    if (!container) return;

    previouslyFocused.current = document.activeElement as HTMLElement;

    const focusables = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));

    const first = focusables()[0];
    first?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return;

      const firstEl = items[0];
      const lastEl = items[items.length - 1];

      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      previouslyFocused.current?.focus();
    };
  }, [visible, containerRef]);
}
