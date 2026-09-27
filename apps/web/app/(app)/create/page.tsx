'use client';

import {
  myGroups, REEL_MAX_SECONDS, suggestedVerses, verseLabel, type Audience, type Media, type PostType, type VerseRef,
} from '@catalysis/api';
import { Check, ChevronRight, HandHeart, Images, Plus, SwitchCamera, Timer, Upload, X, Zap, ZapOff, type LucideIcon } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useRef, useState, type ComponentProps } from 'react';
import { Chip, cx, Ico, Sheet, SheetAction } from '@/components/ui';
import { preparePhoto, saveBlob, savePhoto, videoDuration } from '@/lib/media';
import { useApp } from '@/lib/store';

type Mode = 'photo' | 'reel' | 'text';
type Camera = 'idle' | 'starting' | 'live' | 'denied' | 'unavailable';

const MODES: { id: Mode; label: string }[] = [
  { id: 'photo', label: 'Photo' },
  { id: 'reel', label: 'Reel' },
  { id: 'text', label: 'Text' },
];
const AUDIENCES: { id: Audience; label: string }[] = [
  { id: 'everyone', label: 'Everyone' },
  { id: 'parish', label: 'Parish' },
  { id: 'followers', label: 'Followers' },
];
const TIMERS = [0, 3, 10];

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

interface Captured {
  kind: 'image' | 'video';
  blob: Blob;
  preview: string;
}

/* This screen is always dark, so its surfaces are fixed colours; only the accents follow the theme. */

const PILL = 'gs hover-dim inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap select-none';

/** Round control over the camera picture. */
function StageButton({ icon, label, className, ...rest }: { icon: LucideIcon; label: string } & Omit<ComponentProps<'button'>, 'children'>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx('hover-dim flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur', className)}
      {...rest}
    >
      <Ico icon={icon} size={19} />
    </button>
  );
}

/** Option chip in the bottom panel. */
function OptionChip({ on, icon, className, children, ...rest }: { on?: boolean; icon?: LucideIcon } & ComponentProps<'button'>) {
  return (
    <button
      type="button"
      className={cx(PILL, 'border px-[14px] py-[9px] text-[13px]', on ? 'border-white bg-white text-[#0C0C0F]' : 'border-white/25 text-white', className)}
      {...rest}
    >
      {icon ? <Ico icon={icon} size={14} /> : null}
      {children}
    </button>
  );
}

function Create() {
  const router = useRouter();
  const params = useSearchParams();
  const asked = params.get('mode');
  const addPost = useApp((s) => s.addPost);

  const [mode, setMode] = useState<Mode>(asked === 'text' || asked === 'photo' ? asked : 'reel');
  const [step, setStep] = useState<'capture' | 'caption'>('capture');
  const [camera, setCamera] = useState<Camera>('idle');
  const [facing, setFacing] = useState<'user' | 'environment'>('environment');
  const [torch, setTorch] = useState(false);
  const [timer, setTimer] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [captured, setCaptured] = useState<Captured | null>(null);
  const [text, setText] = useState('');
  const [caption, setCaption] = useState('');
  const [request, setRequest] = useState(false);
  const [verse, setVerse] = useState<VerseRef | null>(null);
  const [parish, setParish] = useState(false);
  // Sharing "to the parish" posts in the first group the member belongs to.
  const parishGroup = useApp((s) => myGroups(s)[0]);
  const [audience, setAudience] = useState<Audience>('everyone');
  const [sheet, setSheet] = useState<'verse' | 'audience' | null>(null);
  const [notice, setNotice] = useState('');
  const [posting, setPosting] = useState(false);
  const [verses, setVerses] = useState<VerseRef[]>([]);

  useEffect(() => {
    let live = true;
    void suggestedVerses().then((list) => {
      if (live) setVerses(list.map((v) => ({ ...v, label: verseLabel(v.bookId, v.chapter, v.verse) })));
    });
    return () => {
      live = false;
    };
  }, []);

  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const tick = useRef<number | undefined>(undefined);
  const file = useRef<HTMLInputElement>(null);

  const say = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice((current) => (current === message ? '' : current)), 2600);
  };

  const stopCamera = useCallback(() => {
    window.clearInterval(tick.current);
    if (recorder.current?.state === 'recording') recorder.current.stop();
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  }, []);

  const startCamera = useCallback(async (face: 'user' | 'environment', withAudio: boolean) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamera('unavailable');
      return;
    }
    setCamera('starting');
    stopCamera();
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: face, width: { ideal: 1080 }, height: { ideal: 1920 } },
        audio: withAudio,
      });
      stream.current = media;
      if (video.current) {
        video.current.srcObject = media;
        await video.current.play().catch(() => undefined);
      }
      setCamera('live');
    } catch (error) {
      const name = (error as DOMException).name;
      setCamera(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'unavailable');
    }
  }, [stopCamera]);

  useEffect(() => stopCamera, [stopCamera]);

  useEffect(() => () => {
    if (captured) URL.revokeObjectURL(captured.preview);
  }, [captured]);

  const switchMode = (to: Mode) => {
    if (recording) return;
    setMode(to);
    setCaptured(null);
    setStep('capture');
    if (to === 'text') {
      stopCamera();
      setCamera('idle');
    } else if (camera === 'live') {
      // Reels need the microphone as well.
      void startCamera(facing, to === 'reel');
    }
  };

  const flip = () => {
    const to = facing === 'user' ? 'environment' : 'user';
    setFacing(to);
    if (camera === 'live') void startCamera(to, mode === 'reel');
  };

  const toggleTorch = async () => {
    const track = stream.current?.getVideoTracks()[0];
    const supported = Boolean((track?.getCapabilities?.() as { torch?: boolean } | undefined)?.torch);
    if (!track || !supported) {
      say('Flash isn’t available on this camera.');
      return;
    }
    try {
      await track.applyConstraints({ advanced: [{ torch: !torch } as MediaTrackConstraintSet] });
      setTorch(!torch);
    } catch {
      say('Flash isn’t available on this camera.');
    }
  };

  const take = (blob: Blob, kind: 'image' | 'video') => {
    setCaptured({ kind, blob, preview: URL.createObjectURL(blob) });
  };

  const snap = () => {
    const el = video.current;
    if (!el || !el.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = el.videoWidth;
    canvas.height = el.videoHeight;
    canvas.getContext('2d')?.drawImage(el, 0, 0);
    canvas.toBlob((blob) => blob && take(blob, 'image'), 'image/jpeg', 0.9);
  };

  const stopRecording = () => {
    window.clearInterval(tick.current);
    if (recorder.current?.state === 'recording') recorder.current.stop();
    setRecording(false);
  };

  const record = () => {
    if (!stream.current || typeof MediaRecorder === 'undefined') {
      say('Recording isn’t supported in this browser. Upload a video instead.');
      return;
    }
    chunks.current = [];
    const rec = new MediaRecorder(stream.current);
    rec.ondataavailable = (e) => e.data.size > 0 && chunks.current.push(e.data);
    rec.onstop = () => take(new Blob(chunks.current, { type: rec.mimeType || 'video/webm' }), 'video');
    recorder.current = rec;
    rec.start();
    setElapsed(0);
    setRecording(true);
    const started = Date.now();
    tick.current = window.setInterval(() => {
      const seconds = (Date.now() - started) / 1000;
      setElapsed(seconds);
      if (seconds >= REEL_MAX_SECONDS) stopRecording();
    }, 200);
  };

  const shutter = () => {
    if (camera !== 'live') {
      void startCamera(facing, mode === 'reel');
      return;
    }
    if (recording) {
      stopRecording();
      return;
    }
    const fire = mode === 'photo' ? snap : record;
    if (!timer) {
      fire();
      return;
    }
    setCountdown(timer);
    let left = timer;
    const id = window.setInterval(() => {
      left -= 1;
      setCountdown(left);
      if (left <= 0) {
        window.clearInterval(id);
        fire();
      }
    }, 1000);
  };

  const pick = async (picked: File | undefined) => {
    if (!picked) return;
    if (picked.type.startsWith('video/')) {
      try {
        const seconds = await videoDuration(picked);
        if (seconds > REEL_MAX_SECONDS + 0.5) {
          say(`Reels can be up to ${REEL_MAX_SECONDS} seconds. That video is ${clock(seconds)}.`);
          return;
        }
      } catch (error) {
        say((error as Error).message);
        return;
      }
      setMode('reel');
      take(picked, 'video');
      return;
    }
    if (picked.type.startsWith('image/')) {
      setMode('photo');
      take(picked, 'image');
      return;
    }
    say('Choose a photo or a video.');
  };

  const hasContent = mode === 'text' ? text.trim().length > 0 : captured !== null;

  const publish = async () => {
    if (!hasContent || posting) return;
    setPosting(true);
    try {
      let media: Media | undefined;
      let type: PostType = request ? 'request' : 'reflection';
      let body = text;
      if (mode !== 'text' && captured) {
        // Photos go to the server, where others can see them. Videos are too large for it and stay on this device.
        const url = captured.kind === 'image' ? await savePhoto(await preparePhoto(captured.blob)) : await saveBlob(captured.blob);
        media = { kind: captured.kind, url };
        type = captured.kind === 'video' ? 'reel' : 'photo';
        body = caption;
      }
      const post = addPost({
        type,
        body,
        media,
        verse: verse ?? undefined,
        groupId: parish ? parishGroup?.id : undefined,
        audience: parish && audience === 'everyone' ? 'parish' : audience,
      });
      if (!post) {
        say('Add something to share first.');
        return;
      }
      stopCamera();
      router.replace(type === 'reel' ? `/reels?reel=${post.id}` : '/community');
    } catch {
      say('That could not be saved on this device. Try a smaller file.');
    } finally {
      setPosting(false);
    }
  };

  const next = () => {
    if (!hasContent) return;
    if (mode === 'text' || step === 'caption') void publish();
    else setStep('caption');
  };

  const cancel = () => {
    stopCamera();
    if (window.history.length > 1) router.back();
    else router.replace('/community');
  };

  const shownAudience = parish && audience === 'everyone' ? 'parish' : audience;
  const audienceLabel = AUDIENCES.find((a) => a.id === shownAudience)?.label ?? 'Everyone';

  return (
    <main className="min-h-dvh bg-[#0C0C0F] text-white">
      <div className="mx-auto flex min-h-dvh max-w-[460px] flex-col">
        <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-[14px]">
          <button
            type="button"
            onClick={step === 'caption' ? () => setStep('capture') : cancel}
            className={cx(PILL, 'bg-white/10 px-4 py-[10px] text-[14px] text-white')}
          >
            {step === 'caption' ? 'Back' : 'Cancel'}
          </button>
          <h1 className="bq text-[22px] leading-none font-bold tracking-[-.03em] text-white">New post</h1>
          <button
            type="button"
            onClick={next}
            disabled={!hasContent || posting}
            className={cx(PILL, 'bg-a1 px-[18px] py-[10px] text-[14px] text-on-a disabled:bg-white/10 disabled:text-white/40')}
          >
            {mode === 'text' || step === 'caption' ? 'Share' : 'Next'}
          </button>
        </div>

        <div className="px-4">
          {mode === 'text' ? (
            <div className="flex h-[440px] flex-col rounded-[28px] bg-[#16161B] p-6">
              <textarea
                aria-label="Your reflection or intention"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Share a reflection or an intention…"
                maxLength={1200}
                className="gs flex-1 resize-none text-[22px] leading-[1.4] text-white placeholder:text-white/40"
              />
              <div className="flex items-center justify-between gap-3 pt-3">
                <button
                  type="button"
                  aria-pressed={request}
                  onClick={() => setRequest((v) => !v)}
                  className={cx(PILL, 'border px-[14px] py-[9px] text-[13px]', request ? 'border-a1 bg-a1 text-on-a' : 'border-white/25 text-white')}
                >
                  <Ico icon={HandHeart} size={14} />
                  Prayer request
                </button>
                <span className="gs text-[12px] font-medium text-white/45">{text.length} / 1200</span>
              </div>
            </div>
          ) : (
            <div
              className="relative h-[440px] overflow-hidden rounded-[28px] bg-[#121214]"
              style={{ backgroundImage: 'radial-gradient(ellipse 70% 60% at 58% 38%, #3a3a42 0%, #1f1f26 50%, #121214 100%)' }}
            >
              <video
                ref={video}
                muted
                playsInline
                aria-label="Camera preview"
                className={cx('absolute inset-0 h-full w-full object-cover', facing === 'user' && '-scale-x-100', (camera !== 'live' || captured) && 'hidden')}
              />
              {captured ? (
                captured.kind === 'video' ? (
                  <video src={captured.preview} controls playsInline loop className="absolute inset-0 h-full w-full bg-black object-contain" />
                ) : (
                  <div aria-label="Captured photo" role="img" className="absolute inset-0" style={{ background: `#0C0C0F url('${captured.preview}') center / cover no-repeat` }} />
                )
              ) : null}

              {!captured && camera !== 'live' ? (
                <div className="absolute inset-x-8 top-[26%] text-center">
                  <p className="gs text-[15px] leading-[1.5] text-white/80">
                    {camera === 'denied'
                      ? 'Camera access was declined. Allow it in your browser settings, or upload from your library.'
                      : camera === 'unavailable'
                        ? 'No camera was found. Upload from your library instead.'
                        : camera === 'starting'
                          ? 'Opening the camera…'
                          : mode === 'reel'
                            ? 'Record a reel of up to sixty seconds, or upload one.'
                            : 'Take a photo, or upload one.'}
                  </p>
                  {camera === 'idle' || camera === 'denied' ? (
                    <button
                      type="button"
                      onClick={() => void startCamera(facing, mode === 'reel')}
                      className={cx(PILL, 'mt-5 border border-white/30 px-5 py-3 text-[14px] text-white')}
                    >
                      Allow camera
                    </button>
                  ) : null}
                </div>
              ) : null}

              {countdown > 0 ? (
                <div aria-live="assertive" className="bq pointer-events-none absolute inset-0 flex items-center justify-center text-[120px] font-extrabold text-white">{countdown}</div>
              ) : null}

              {captured ? (
                <div className="absolute top-4 right-4 left-4 flex items-center justify-between">
                  <Chip tone="a2">{captured.kind === 'video' ? 'Reel ready' : 'Photo ready'}</Chip>
                  <button type="button" onClick={() => setCaptured(null)} className={cx(PILL, 'bg-black/45 px-4 py-[10px] text-[13px] text-white backdrop-blur')}>
                    Retake
                  </button>
                </div>
              ) : (
                <>
                  <div className="gs absolute top-4 left-4 inline-flex items-center gap-2 rounded-full bg-black/45 px-3 py-[7px] text-[12px] font-semibold text-white backdrop-blur" aria-live="off">
                    {recording ? <span aria-hidden className="h-2 w-2 rounded-full bg-a1" /> : null}
                    {mode === 'reel' ? `${clock(elapsed)} / ${clock(REEL_MAX_SECONDS)}` : 'Photo'}
                  </div>
                  <div className="absolute top-4 right-4 flex flex-col items-center gap-3">
                    <StageButton icon={torch ? Zap : ZapOff} label={torch ? 'Turn flash off' : 'Turn flash on'} aria-pressed={torch} onClick={toggleTorch} />
                    <StageButton icon={SwitchCamera} label="Flip camera" onClick={flip} />
                    <span className="flex flex-col items-center">
                      <StageButton
                        icon={Timer}
                        label={`Timer: ${timer ? `${timer} seconds` : 'off'}`}
                        onClick={() => setTimer(TIMERS[(TIMERS.indexOf(timer) + 1) % TIMERS.length] ?? 0)}
                      />
                      {timer ? <span className="gs mt-1 text-[11px] font-semibold text-white">{timer}s</span> : null}
                    </span>
                  </div>
                </>
              )}

              {captured ? null : (
                <div className="absolute inset-x-0 bottom-6 flex items-center justify-center gap-9">
                  <StageButton icon={Images} label="Choose from library" onClick={() => file.current?.click()} />
                  <button
                    type="button"
                    aria-label={camera !== 'live' ? 'Open camera' : mode === 'photo' ? 'Take photo' : recording ? 'Stop recording' : 'Start recording'}
                    aria-pressed={recording}
                    onClick={shutter}
                    disabled={countdown > 0}
                    className="flex h-[76px] w-[76px] items-center justify-center rounded-full border-4 border-white"
                  >
                    <span className={cx('block bg-a1 transition-all', recording ? 'h-7 w-7 rounded-[8px]' : 'h-14 w-14 rounded-full')} />
                  </button>
                  <StageButton icon={Upload} label="Upload" onClick={() => file.current?.click()} />
                </div>
              )}
              <input
                ref={file}
                type="file"
                hidden
                accept={mode === 'photo' ? 'image/*' : 'video/*,image/*'}
                onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ''; }}
              />
            </div>
          )}
        </div>

        {step === 'caption' && mode !== 'text' ? (
          <div className="px-4 pt-4 pb-2">
            <label htmlFor="caption" className="mn block text-white/60">Caption</label>
            <textarea
              id="caption"
              rows={3}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a caption…"
              maxLength={300}
              className="gs mt-2 block w-full resize-none rounded-[18px] bg-white/10 px-[18px] py-[14px] text-[17px] leading-[1.45] text-white placeholder:text-white/40"
            />
          </div>
        ) : (
          <div className="flex justify-center py-4">
            <div role="tablist" aria-label="Post type" className="gs flex rounded-full bg-white/10 p-1 text-[13px] font-semibold">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="tab"
                  aria-selected={mode === m.id}
                  onClick={() => switchMode(m.id)}
                  className={cx('rounded-full px-5 py-[9px]', mode === m.id ? 'bg-white text-[#0C0C0F]' : 'text-white/70')}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <p role="status" className="gs min-h-[22px] px-6 pb-3 text-center text-[14px] leading-[1.4] text-white/80">{notice}</p>

        <div className="mt-auto rounded-t-[28px] bg-[#16161B] px-5 pt-5 pb-[max(30px,env(safe-area-inset-bottom))]">
          <div className="flex flex-wrap gap-2">
            {verse ? (
              <OptionChip on onClick={() => setVerse(null)} aria-label={`Remove ${verse.label}`}>
                {verse.label}
                <Ico icon={X} size={14} />
              </OptionChip>
            ) : (
              <OptionChip icon={Plus} onClick={() => setSheet('verse')}>Add a verse</OptionChip>
            )}
            {parishGroup ? (
              <OptionChip on={parish} aria-pressed={parish} onClick={() => setParish((v) => !v)}>Share to {parishGroup.shortName}</OptionChip>
            ) : null}
          </div>
          <button type="button" onClick={() => setSheet('audience')} className="hover-dim mt-4 flex w-full items-center justify-between rounded-[18px] bg-white/10 px-4 py-[14px]">
            <span className="mn text-white/60">Audience</span>
            <span className="gs inline-flex items-center gap-1 text-[14px] font-semibold text-white">
              {audienceLabel}
              <Ico icon={ChevronRight} size={16} />
            </span>
          </button>
        </div>
      </div>

      <Sheet open={sheet === 'verse'} onClose={() => setSheet(null)} title="Add a verse">
        <ul className="flex flex-col gap-2">
          {verses.map((v) => (
            <li key={v.verse}>
              <button type="button" onClick={() => { setVerse(v); setSheet(null); }} className="hover-dim block w-full rounded-[16px] bg-inset px-4 py-[14px] text-left">
                <Chip tone="a3">{v.label}</Chip>
                <span className="nr mt-2 block text-[16px] leading-[1.5] text-ink">{v.text}</span>
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
      <Sheet open={sheet === 'audience'} onClose={() => setSheet(null)} title="Audience">
        <div role="radiogroup" aria-label="Audience">
          {AUDIENCES.map((a) => (
            <SheetAction key={a.id} role="radio" aria-checked={audience === a.id} onClick={() => { setAudience(a.id); setSheet(null); }}>
              <span className={cx('flex-1', audience === a.id && 'font-semibold')}>{a.label}</span>
              {audience === a.id ? <Ico icon={Check} size={17} className="text-a1" /> : null}
            </SheetAction>
          ))}
        </div>
      </Sheet>
    </main>
  );
}

export default function CreatePage() {
  return (
    <Suspense fallback={<main className="min-h-dvh bg-[#0C0C0F]" />}>
      <Create />
    </Suspense>
  );
}
