'use client';

import type { Media, Tone } from '@catalysis/api';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, type ComponentProps, type CSSProperties, type ReactNode } from 'react';
import { useDismiss } from '@/lib/hooks';
import { useMediaUrl } from '@/lib/media';

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

/**
 * A component's own display class, unless the caller hides it (`hidden sm:inline-flex`).
 * Two display utilities on one element are resolved by stylesheet order, not by
 * the order they are written in, so the base class has to step aside.
 */
function display(base: string, className: string | undefined): string {
  return /(^|\s)hidden(\s|$)/.test(className ?? '') ? '' : base;
}

/** Accent backgrounds. Anything set on one takes `text-on-a`. */
export const TONE_BG: Record<Tone, string> = {
  a1: 'bg-a1', a2: 'bg-a2', a3: 'bg-a3', a4: 'bg-a4', a5: 'bg-a5', a6: 'bg-a6',
};

/** Rotates through the tints so lists of avatars and cards do not all match. */
export function toneFor(key: string, tones: Tone[] = ['a4', 'a5', 'a3', 'a2']): Tone {
  let sum = 0;
  for (const char of key) sum += char.charCodeAt(0);
  return tones[sum % tones.length] ?? 'a3';
}

export function initials(name: string): string {
  const words = name.replace(/^(Fr|Sr|Br|Dr)\.\s+/, '').trim().split(/\s+/);
  const letters = words.length > 1 ? `${words[0]?.[0] ?? ''}${words[words.length - 1]?.[0] ?? ''}` : (words[0]?.[0] ?? '');
  return letters.toUpperCase() || '·';
}

/** Lucide icon at the design's stroke of 2, sized in px. */
export function Ico({ icon: Icon, size = 17, className, fill }: { icon: LucideIcon; size?: number; className?: string; fill?: string }) {
  return <Icon width={size} height={size} strokeWidth={2} className={cx('shrink-0', className)} fill={fill ?? 'none'} aria-hidden />;
}

/* ---------- surfaces ---------- */

export type Surface = 'card' | 'inset' | 'solid' | Tone;

const SURFACE: Record<Surface, string> = {
  card: 'bg-card border border-line text-ink',
  inset: 'bg-inset text-ink',
  solid: 'bg-solid text-on-solid',
  a1: 'bg-a1 text-on-a', a2: 'bg-a2 text-on-a', a3: 'bg-a3 text-on-a',
  a4: 'bg-a4 text-on-a', a5: 'bg-a5 text-on-a', a6: 'bg-a6 text-on-a',
};

/** The bento card. Padding is left to the caller, since the design varies it. */
export function Card({
  surface = 'card', className, children, as: Tag = 'div', ...rest
}: { surface?: Surface; as?: 'div' | 'section' | 'article' | 'aside' } & ComponentProps<'div'>) {
  return (
    <Tag className={cx('rounded-[28px]', SURFACE[surface], className)} {...rest}>
      {children}
    </Tag>
  );
}

/** Card heading in Outfit. */
export function CardTitle({ children, className, as: Tag = 'h2' }: { children: ReactNode; className?: string; as?: 'h1' | 'h2' | 'h3' }) {
  return <Tag className={cx('bq text-[24px] leading-[1.1] font-bold tracking-[-.03em]', className)}>{children}</Tag>;
}

/* ---------- buttons ---------- */

export type PillVariant = 'primary' | 'accent' | 'highlight' | 'dark' | 'white' | 'ghost' | 'inset' | 'onSolid';

const PILL: Record<PillVariant, string> = {
  /** Navy in light, lime in dark. */
  primary: 'bg-btn text-btn-text',
  accent: 'bg-a1 text-on-a',
  highlight: 'bg-a2 text-on-a',
  /** For use on an accent surface. */
  dark: 'bg-on-a text-white',
  white: 'bg-white text-on-a',
  ghost: 'bg-card text-ink border border-line',
  inset: 'bg-inset text-ink',
  onSolid: 'text-white border border-white/30',
};

type PillProps = {
  variant?: PillVariant;
  icon?: LucideIcon;
  iconAfter?: LucideIcon;
  iconSize?: number;
  className?: string;
  children?: ReactNode;
} & (({ href: string } & Omit<ComponentProps<typeof Link>, 'href' | 'className'>) | ({ href?: undefined } & ComponentProps<'button'>));

/** Pill button or link. Size comes from the caller's padding and text classes. */
export function Pill({ variant = 'primary', icon, iconAfter, iconSize = 16, className, children, ...rest }: PillProps) {
  const classes = cx(
    'gs hover-dim items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap select-none disabled:opacity-40',
    display('inline-flex', className),
    PILL[variant],
    className,
  );
  const content = (
    <>
      {icon ? <Ico icon={icon} size={iconSize} /> : null}
      {children}
      {iconAfter ? <Ico icon={iconAfter} size={iconSize} /> : null}
    </>
  );
  if (rest.href !== undefined) {
    const { href, ...link } = rest;
    return <Link href={href} className={classes} {...link}>{content}</Link>;
  }
  const { type = 'button', ...button } = rest as ComponentProps<'button'>;
  return <button type={type} className={classes} {...button}>{content}</button>;
}

const CIRCLE: Record<'ghost' | 'inset' | 'primary' | 'accent' | 'dark', string> = {
  ghost: 'bg-card border border-line text-ink',
  inset: 'bg-inset text-ink',
  primary: 'bg-btn text-btn-text',
  accent: 'bg-a1 text-on-a',
  dark: 'bg-on-a text-white',
};

type CircleProps = {
  icon: LucideIcon;
  label: string;
  size?: number;
  iconSize?: number;
  variant?: keyof typeof CIRCLE;
  fill?: string;
  className?: string;
} & (({ href: string }) | ({ href?: undefined } & Omit<ComponentProps<'button'>, 'children'>));

/** Round icon button. */
export function CircleButton({ icon, label, size = 40, iconSize = 17, variant = 'ghost', fill, className, ...rest }: CircleProps) {
  const classes = cx('hover-dim shrink-0 items-center justify-center rounded-full disabled:opacity-40', display('inline-flex', className), CIRCLE[variant], className);
  const style = { width: size, height: size };
  if (rest.href !== undefined) {
    return (
      <Link href={rest.href} aria-label={label} title={label} className={classes} style={style}>
        <Ico icon={icon} size={iconSize} fill={fill} />
      </Link>
    );
  }
  const { type = 'button', ...button } = rest as ComponentProps<'button'>;
  return (
    <button type={type} aria-label={label} title={label} className={classes} style={style} {...button}>
      <Ico icon={icon} size={iconSize} fill={fill} />
    </button>
  );
}

/** Quiet text button. */
export function TextAction({ className, children, ...rest }: ComponentProps<'button'>) {
  return (
    <button type="button" className={cx('gs hover-accent relative text-[13px] font-semibold after:absolute after:-inset-2 disabled:opacity-40', className)} {...rest}>
      {children}
    </button>
  );
}

/* ---------- small pieces ---------- */

/** Small rounded label, e.g. "New", "Prayer request", a citation. */
export function Chip({ tone, className, children }: { tone?: Tone | 'inset' | 'white' | 'dark'; className?: string; children: ReactNode }) {
  const surface =
    tone === 'inset' ? 'bg-inset text-ink' : tone === 'white' ? 'bg-white text-on-a' : tone === 'dark' ? 'bg-on-a text-white' : cx(TONE_BG[tone ?? 'a3'], 'text-on-a');
  return <span className={cx('gs items-center gap-[6px] rounded-full px-[10px] py-1 text-[12px] font-semibold', display('inline-flex', className), surface, className)}>{children}</span>;
}

export function Avatar({
  name, tone, size = 42, shape = 'circle', media, className,
}: { name: string; tone?: Tone; size?: number; shape?: 'circle' | 'square'; media?: Media; className?: string }) {
  const url = useMediaUrl(media);
  return (
    <span
      aria-hidden
      className={cx(
        'bq shrink-0 items-center justify-center overflow-hidden font-bold text-on-a',
        display('flex', className),
        shape === 'circle' ? 'rounded-full' : 'rounded-[12px]',
        !url && TONE_BG[tone ?? toneFor(name)],
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.4),
        ...(url ? { background: `url('${url}') ${media?.focus ?? '50% 50%'} / cover no-repeat` } : null),
      }}
    >
      {url ? null : shape === 'square' ? initials(name).charAt(0) : initials(name)}
    </span>
  );
}

/** Rounded progress bar. `value` runs 0–1. */
export function Progress({ value, tone = 'a1', className, label }: { value: number; tone?: 'a1' | 'btn'; className?: string; label: string }) {
  const percent = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} className={cx('h-2 overflow-hidden rounded-full bg-inset', className)}>
      <div className={cx('h-full rounded-full', tone === 'a1' ? 'bg-a1' : 'bg-btn')} style={{ width: `${percent}%` }} />
    </div>
  );
}

export interface SegmentItem<T extends string> {
  id: T;
  label: string;
}

/** Segmented control: Old / New, Month / List. */
export function Segmented<T extends string>({
  items, value, onChange, label, className, stretch,
}: { items: SegmentItem<T>[]; value: T; onChange: (id: T) => void; label: string; className?: string; stretch?: boolean }) {
  return (
    <div role="tablist" aria-label={label} className={cx('gs flex rounded-full bg-inset p-1 text-[13px] font-semibold', className)}>
      {items.map((item) => {
        const selected = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(item.id)}
            className={cx('rounded-full px-[14px] py-2 whitespace-nowrap', stretch && 'flex-1', selected ? 'bg-btn text-btn-text' : 'hover-accent text-muted')}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div aria-hidden className={cx('skeleton', className)} style={style} />;
}

export function SkeletonLines({ lines = 4, className }: { lines?: number; className?: string }) {
  return (
    <div className={cx('flex flex-col gap-3', className)} role="status" aria-label="Loading">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className="h-4" style={{ width: `${i === lines - 1 ? 62 : 100 - ((i * 7) % 18)}%` }} />
      ))}
    </div>
  );
}

export function EmptyState({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx('gs text-[15px] leading-[1.5] text-muted', className)}>{children}</p>;
}

export function FieldError({ id, children }: { id?: string; children?: ReactNode }) {
  if (!children) return null;
  return <p id={id} role="alert" className="gs mt-2 text-[13px] leading-[1.4] font-medium text-a1">{children}</p>;
}

/** Rounded text field with its label and error line. */
export function Field({
  label, error, id, trailing, className, ...rest
}: { label: string; error?: string; id: string; trailing?: ReactNode } & ComponentProps<'input'>) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mn block text-muted">{label}</label>
      <div className={cx('mt-2 flex items-center rounded-[16px] bg-inset pr-4 pl-[18px]', error && 'ring-2 ring-a1')}>
        <input
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className="gs min-w-0 flex-1 py-[14px] text-[16px] text-ink"
          {...rest}
        />
        {trailing}
      </div>
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </div>
  );
}

/** Photo with an optional scrim. Falls back to a dark tile when there is no image. */
export function Photo({
  media, scrim, className, style, children, label,
}: {
  media?: Media;
  scrim?: string;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  label?: string;
}) {
  const url = useMediaUrl(media);
  const isVideo = media?.kind === 'video' && Boolean(media.url);
  return (
    <div
      role={label ? 'img' : undefined}
      aria-label={label}
      className={cx('relative overflow-hidden bg-[#121212]', className)}
      style={{
        ...(url && !isVideo
          ? { backgroundImage: `url('${url}')`, backgroundSize: 'cover', backgroundPosition: media?.focus ?? '50% 50%', backgroundRepeat: 'no-repeat' }
          : !url
            ? { backgroundImage: 'radial-gradient(ellipse 70% 60% at 58% 38%, #5b5a63 0%, #2a2a31 50%, #121214 100%)' }
            : null),
        ...style,
      }}
    >
      {url && isVideo ? <video src={url} muted playsInline preload="metadata" className="absolute inset-0 h-full w-full object-cover" /> : null}
      {scrim ? <div aria-hidden className="absolute inset-0" style={{ background: scrim }} /> : null}
      {children}
    </div>
  );
}

/**
 * Modal layer: a bottom sheet on mobile, a centred panel on desktop.
 * Closes on Escape and on a click outside.
 */
export function Sheet({
  open, onClose, title, children, className,
}: { open: boolean; onClose: () => void; title: string; children: ReactNode; className?: string }) {
  useDismiss(open, onClose);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusable = panel.current?.querySelector<HTMLElement>('input, textarea, button:not([data-close]), [href]');
    (focusable ?? panel.current)?.focus();
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6" role="presentation">
      <button type="button" aria-label="Close" tabIndex={-1} className="absolute inset-0 cursor-default bg-black/50" onClick={onClose} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cx(
          'relative max-h-[88dvh] w-full overflow-y-auto rounded-t-[28px] bg-card px-6 pt-5 pb-[max(26px,env(safe-area-inset-bottom))] text-ink shadow-[0_20px_60px_rgba(0,0,0,.3)] outline-none md:w-[480px] md:rounded-[28px] md:border md:border-line md:p-7',
          className,
        )}
        style={{ animation: 'sheet-up 180ms ease-out' }}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="bq text-[22px] leading-[1.1] font-bold tracking-[-.03em]">{title}</h2>
          <button type="button" data-close onClick={onClose} className="gs hover-dim rounded-full bg-inset px-[14px] py-2 text-[13px] font-semibold text-ink">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** A row in an action list inside a Sheet. */
export function SheetAction({ children, danger, icon, ...rest }: { danger?: boolean; icon?: LucideIcon } & ComponentProps<'button'>) {
  return (
    <button
      type="button"
      className={cx('gs hover-dim mt-2 flex w-full items-center gap-3 rounded-[16px] bg-inset px-4 py-[14px] text-left text-[15px] font-medium first:mt-0', danger ? 'text-a1' : 'text-ink')}
      {...rest}
    >
      {icon ? <Ico icon={icon} size={17} /> : null}
      {children}
    </button>
  );
}

/** Page title: a bold phrase with a lighter accent phrase after it. */
export function PageTitle({ children, accent, className }: { children: ReactNode; accent?: ReactNode; className?: string }) {
  return (
    <h1 className={cx('bq text-[40px] leading-none font-bold tracking-[-.035em] text-ink md:text-[56px]', className)}>
      {children}
      {accent ? <span className="tracking-[-.01em] text-muted"> {accent}</span> : null}
    </h1>
  );
}
