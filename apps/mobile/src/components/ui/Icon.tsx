import type { LucideIcon } from 'lucide-react-native';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import ArrowRight from 'lucide-react-native/icons/arrow-right';
import ArrowUp from 'lucide-react-native/icons/arrow-up';
import Bell from 'lucide-react-native/icons/bell';
import BookOpen from 'lucide-react-native/icons/book-open';
import Bookmark from 'lucide-react-native/icons/bookmark';
import CalendarPlus from 'lucide-react-native/icons/calendar-plus';
import Check from 'lucide-react-native/icons/check';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import Clapperboard from 'lucide-react-native/icons/clapperboard';
import Copy from 'lucide-react-native/icons/copy';
import Ellipsis from 'lucide-react-native/icons/ellipsis';
import Eye from 'lucide-react-native/icons/eye';
import EyeOff from 'lucide-react-native/icons/eye-off';
import Flag from 'lucide-react-native/icons/flag';
import Flame from 'lucide-react-native/icons/flame';
import Globe from 'lucide-react-native/icons/globe';
import HandHeart from 'lucide-react-native/icons/hand-heart';
import Headphones from 'lucide-react-native/icons/headphones';
import Heart from 'lucide-react-native/icons/heart';
import HeartHandshake from 'lucide-react-native/icons/heart-handshake';
import House from 'lucide-react-native/icons/house';
import Image from 'lucide-react-native/icons/image';
import Lock from 'lucide-react-native/icons/lock';
import LogOut from 'lucide-react-native/icons/log-out';
import Mail from 'lucide-react-native/icons/mail';
import MapPin from 'lucide-react-native/icons/map-pin';
import MessageCircle from 'lucide-react-native/icons/message-circle';
import MessageSquare from 'lucide-react-native/icons/message-square';
import Mic from 'lucide-react-native/icons/mic';
import Moon from 'lucide-react-native/icons/moon';
import Music from 'lucide-react-native/icons/music';
import Pause from 'lucide-react-native/icons/pause';
import PenLine from 'lucide-react-native/icons/pen-line';
import Play from 'lucide-react-native/icons/play';
import Plus from 'lucide-react-native/icons/plus';
import Search from 'lucide-react-native/icons/search';
import Send from 'lucide-react-native/icons/send';
import Settings from 'lucide-react-native/icons/settings';
import Share2 from 'lucide-react-native/icons/share-2';
import Sparkles from 'lucide-react-native/icons/sparkles';
import Sun from 'lucide-react-native/icons/sun';
import SunMoon from 'lucide-react-native/icons/sun-moon';
import SwitchCamera from 'lucide-react-native/icons/switch-camera';
import Timer from 'lucide-react-native/icons/timer';
import Trash from 'lucide-react-native/icons/trash';
import Type from 'lucide-react-native/icons/type';
import Upload from 'lucide-react-native/icons/upload';
import User from 'lucide-react-native/icons/user';
import Users from 'lucide-react-native/icons/users';
import Volume2 from 'lucide-react-native/icons/volume-2';
import VolumeX from 'lucide-react-native/icons/volume-x';
import X from 'lucide-react-native/icons/x';
import Zap from 'lucide-react-native/icons/zap';
import ZapOff from 'lucide-react-native/icons/zap-off';

import { ICON_STROKE, useTheme } from '@/theme';

/**
 * Imported one by one so the bundle carries only the icons in use. Names are the
 * design's `data-lucide` names; add an icon here before using it.
 */
const ICONS = {
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  'arrow-up': ArrowUp,
  bell: Bell,
  'book-open': BookOpen,
  bookmark: Bookmark,
  'calendar-plus': CalendarPlus,
  check: Check,
  'chevron-down': ChevronDown,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  clapperboard: Clapperboard,
  copy: Copy,
  eye: Eye,
  'eye-off': EyeOff,
  flag: Flag,
  flame: Flame,
  globe: Globe,
  'hand-heart': HandHeart,
  headphones: Headphones,
  heart: Heart,
  'heart-handshake': HeartHandshake,
  /** Lucide renamed `home` to `house`; both names work here. */
  home: House,
  house: House,
  image: Image,
  lock: Lock,
  'log-out': LogOut,
  mail: Mail,
  'map-pin': MapPin,
  'message-circle': MessageCircle,
  'message-square': MessageSquare,
  mic: Mic,
  moon: Moon,
  'more-horizontal': Ellipsis,
  music: Music,
  pause: Pause,
  'pen-line': PenLine,
  play: Play,
  plus: Plus,
  search: Search,
  send: Send,
  settings: Settings,
  'share-2': Share2,
  sparkles: Sparkles,
  sun: Sun,
  'sun-moon': SunMoon,
  'switch-camera': SwitchCamera,
  timer: Timer,
  trash: Trash,
  type: Type,
  upload: Upload,
  user: User,
  users: Users,
  'volume-2': Volume2,
  'volume-x': VolumeX,
  x: X,
  zap: Zap,
  'zap-off': ZapOff,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

export interface IconProps {
  name: IconName;
  size?: number;
  /** Defaults to the theme's `ink`. */
  color?: string;
  /** Solid fill, for the liked heart and the set bookmark. */
  filled?: boolean;
  strokeWidth?: number;
}

export function Icon({ name, size = 19, color, filled = false, strokeWidth = ICON_STROKE }: IconProps) {
  const { colors } = useTheme();
  const Glyph = ICONS[name];
  const tint = color ?? colors.ink;
  return <Glyph size={size} color={tint} strokeWidth={strokeWidth} fill={filled ? tint : 'none'} />;
}
