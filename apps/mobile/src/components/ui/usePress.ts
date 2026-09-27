import { useRouter, type Href } from 'expo-router';

export interface PressTarget {
  onPress?: () => void;
  /** Makes the control a link: it pushes this route and is announced as a link. */
  href?: Href;
}

/** Resolves `onPress` / `href` to one handler and the matching accessibility role. */
export function usePress({ onPress, href }: PressTarget): { press?: () => void; role: 'button' | 'link' } {
  const router = useRouter();
  if (href === undefined) return { press: onPress, role: 'button' };
  return {
    role: 'link',
    press: () => {
      onPress?.();
      router.push(href);
    },
  };
}
