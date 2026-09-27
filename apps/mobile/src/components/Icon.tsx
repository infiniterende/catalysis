// LEGACY (editorial) component, kept so screens that are not restyled yet still compile.
// New code uses the kit in '@/components/ui' (see KIT.md). Deleted once nothing imports it.
import type { LucideIcon } from 'lucide-react-native';
import ArrowUp from 'lucide-react-native/icons/arrow-up';
import Bell from 'lucide-react-native/icons/bell';
import BookOpen from 'lucide-react-native/icons/book-open';
import Bookmark from 'lucide-react-native/icons/bookmark';
import Check from 'lucide-react-native/icons/check';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import Clapperboard from 'lucide-react-native/icons/clapperboard';
import Ellipsis from 'lucide-react-native/icons/ellipsis';
import Flame from 'lucide-react-native/icons/flame';
import Heart from 'lucide-react-native/icons/heart';
import Image from 'lucide-react-native/icons/image';
import MessageCircle from 'lucide-react-native/icons/message-circle';
import MessageSquare from 'lucide-react-native/icons/message-square';
import Music from 'lucide-react-native/icons/music';
import PenLine from 'lucide-react-native/icons/pen-line';
import Play from 'lucide-react-native/icons/play';
import Plus from 'lucide-react-native/icons/plus';
import Search from 'lucide-react-native/icons/search';
import Send from 'lucide-react-native/icons/send';
import Settings from 'lucide-react-native/icons/settings';
import Sun from 'lucide-react-native/icons/sun';
import SwitchCamera from 'lucide-react-native/icons/switch-camera';
import Timer from 'lucide-react-native/icons/timer';
import Type from 'lucide-react-native/icons/type';
import Upload from 'lucide-react-native/icons/upload';
import Users from 'lucide-react-native/icons/users';
import Volume2 from 'lucide-react-native/icons/volume-2';
import VolumeX from 'lucide-react-native/icons/volume-x';
import X from 'lucide-react-native/icons/x';
import Zap from 'lucide-react-native/icons/zap';
import ZapOff from 'lucide-react-native/icons/zap-off';

import { colors } from '@/theme';

// Imported one by one so the bundle carries only the icons the design uses.
const ICONS = {
  'arrow-up': ArrowUp,
  bell: Bell,
  'book-open': BookOpen,
  bookmark: Bookmark,
  check: Check,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  clapperboard: Clapperboard,
  flame: Flame,
  heart: Heart,
  image: Image,
  'message-circle': MessageCircle,
  'message-square': MessageSquare,
  'more-horizontal': Ellipsis,
  music: Music,
  'pen-line': PenLine,
  play: Play,
  plus: Plus,
  search: Search,
  send: Send,
  settings: Settings,
  sun: Sun,
  'switch-camera': SwitchCamera,
  timer: Timer,
  type: Type,
  upload: Upload,
  users: Users,
  'volume-2': Volume2,
  'volume-x': VolumeX,
  x: X,
  zap: Zap,
  'zap-off': ZapOff,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  /** Solid fill, for the liked heart and the set bookmark. */
  filled?: boolean;
}

export function Icon({ name, size = 19, color = colors.ink, filled = false }: IconProps) {
  const Glyph = ICONS[name];
  return <Glyph size={size} color={color} strokeWidth={1.5} fill={filled ? color : 'none'} />;
}
