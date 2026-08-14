"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { CategoryPicker, MIX_ID } from "@/components/CategoryPicker";
import { GameShell } from "@/components/GameShell";
import { GetReady } from "@/components/GetReady";
import { TimerRing } from "@/components/TimerRing";
import { HEADS_UP_CATEGORIES } from "@/data/heads-up";
import { cn } from "@/lib/cn";
import { haptics } from "@/lib/haptics";
import { useCountdown } from "@/lib/hooks/useCountdown";
import { usePersistentState } from "@/lib/hooks/usePersistentState";
import { requestTiltPermission, useTilt } from "@/lib/hooks/useTilt";
import { useWakeLock } from "@/lib/hooks/useWakeLock";
import { sfx } from "@/lib/sound";
import { useAppState } from "@/lib/state";
import { Dealer } from "@/lib/shuffle";
import { usableCategories } from "@/lib/types";

type Phase = "setup" | "ready" | "playing" | "done";
type Result = { text: string; got: boolean };

const DURATIONS = [30, 60, 90];

export default function HeadsUpPage() {
  const { tier } = useAppState();

  const [phase, setPhase] = useState<Phase>("setup");
  const [categoryId, setCategoryId] = usePersistentState(
    "partybox.headsup.category.v1",
    MIX_ID,
  );
  const [duration, setDuration] = usePersistentState(
    "partybox.headsup.duration.v1",
    60,
  );
  const [invertTilt, setInvertTilt] = usePersistentState(
    "partybox.headsup.invertTilt.v1",
    false,
  );

  const [word, setWord] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [flash, setFlash] = useState<"got" | "pass" | null>(null);

  const dealerRef = useRef<Dealer<string> | null>(null);
  // Blocks input while the green/amber flash is on screen, so one tilt or tap
  // can't burn through three cards.
  const lockedRef = useRef(false);

  const categories = useMemo(
    () => usableCategories(HEADS_UP_CATEGORIES, tier),
    [tier],
  );

  const words = useMemo(() => {
    const chosen =
      categoryId === MIX_ID
        ? categories
        : categories.filter((c) => c.id === categoryId);
    const pool = chosen.flatMap((c) => c.entries.map((e) => e.text));
    // A pack that vanished when the difficulty changed falls back to the lot.
    return pool.length > 0
      ? pool
      : categories.flatMap((c) => c.entries.map((e) => e.text));
  }, [categories, categoryId]);

  const timer = useCountdown(duration, {
    onExpire: () => {
      haptics.timeUp();
      sfx.timeUp();
      setFlash(null);
      setPhase("done");
    },
    onTick: (secondsLeft) => {
      if (secondsLeft <= 5 && secondsLeft > 0) sfx.tick();
    },
  });

  useWakeLock(phase === "playing" || phase === "ready");

  const nextWord = useCallback(() => {
    setWord(dealerRef.current?.next() ?? "");
  }, []);

  const answer = useCallback(
    (got: boolean) => {
      if (lockedRef.current) return;
      lockedRef.current = true;

      setResults((current) => [...current, { text: word, got }]);
      setFlash(got ? "got" : "pass");
      if (got) {
        haptics.correct();
        sfx.correct();
      } else {
        haptics.skip();
        sfx.skip();
      }

      window.setTimeout(() => {
        setFlash(null);
        nextWord();
        lockedRef.current = false;
      }, 550);
    },
    [nextWord, word],
  );

  const { supported: tiltSupported } = useTilt({
    enabled: phase === "playing",
    inverted: invertTilt,
    onDown: () => answer(true),
    onUp: () => answer(false),
  });

  const beginRound = async () => {
    // Must happen inside the tap for iOS to even show the permission dialog.
    await requestTiltPermission();
    sfx.unlock();
    dealerRef.current = new Dealer(words);
    setResults([]);
    setWord(dealerRef.current.next() ?? "");
    timer.reset(duration);
    setPhase("ready");
  };

  const startPlaying = () => {
    setPhase("playing");
    timer.start(duration);
  };

  const score = results.filter((r) => r.got).length;

  if (phase === "ready") {
    return (
      <GameShell title="Heads Up" bare>
        <div className="safe-bottom flex flex-1 flex-col items-center justify-center px-8">
          <GetReady
            label="Hold the phone on your forehead, screen facing everyone else"
            onDone={startPlaying}
          />
        </div>
      </GameShell>
    );
  }

  if (phase === "playing") {
    return (
      <main
        className={cn(
          "screen-h relative flex flex-col transition-colors duration-150",
          flash === "got" && "bg-emerald-500",
          flash === "pass" && "bg-amber-500",
          !flash && "bg-night",
        )}
      >
        {flash ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="animate-pop text-6xl font-bold text-black/80">
              {flash === "got" ? "Correct!" : "Pass"}
            </p>
          </div>
        ) : (
          <>
            <div className="safe-top flex justify-center pb-2">
              <TimerRing
                fraction={timer.fraction}
                secondsLeft={timer.secondsLeft}
                size={92}
              />
            </div>

            <div className="flex flex-1 items-center justify-center px-6">
              <p
                key={word}
                className="animate-pop text-center text-5xl leading-tight font-bold text-balance"
              >
                {word}
              </p>
            </div>

            {/* Tap targets fill the bottom half so nobody has to aim while
                the phone is pressed to their head. */}
            <div className="safe-bottom grid shrink-0 grid-cols-2 gap-3 px-4 pt-2">
              <button
                onClick={() => answer(false)}
                className="min-h-28 rounded-tile bg-amber-500/20 text-2xl font-bold text-amber-300 active:scale-95"
              >
                Pass
                <span className="mt-1 block text-xs font-normal opacity-70">
                  tilt up
                </span>
              </button>
              <button
                onClick={() => answer(true)}
                className="min-h-28 rounded-tile bg-emerald-500/20 text-2xl font-bold text-emerald-300 active:scale-95"
              >
                Got it
                <span className="mt-1 block text-xs font-normal opacity-70">
                  tilt down
                </span>
              </button>
            </div>
            {!tiltSupported && (
              <p className="text-muted safe-bottom px-6 pb-1 text-center text-xs">
                Tilting isn&apos;t available on this device — use the buttons.
              </p>
            )}
          </>
        )}
      </main>
    );
  }

  if (phase === "done") {
    return (
      <GameShell title="Heads Up" subtitle="Round over">
        <div className="safe-x safe-bottom mx-auto flex w-full max-w-lg flex-1 flex-col overflow-hidden">
          <div className="animate-pop py-6 text-center">
            <p className="text-7xl font-bold">{score}</p>
            <p className="text-muted mt-1">
              {score === 1 ? "word guessed" : "words guessed"}
            </p>
          </div>

          <ul className="flex-1 space-y-2 overflow-y-auto pb-4">
            {results.map((result, index) => (
              <li
                key={`${result.text}-${index}`}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border px-4 py-3",
                  result.got
                    ? "border-emerald-500/40 bg-emerald-500/10"
                    : "border-line bg-surface-2",
                )}
              >
                <span>{result.got ? "✅" : "⏭️"}</span>
                <span className={cn(!result.got && "text-muted")}>
                  {result.text}
                </span>
              </li>
            ))}
            {results.length === 0 && (
              <li className="text-muted py-8 text-center">
                No cards played that time!
              </li>
            )}
          </ul>

          <div className="flex shrink-0 gap-3 pt-2">
            <Button variant="solid" size="md" onClick={() => setPhase("setup")}>
              Change pack
            </Button>
            <Button size="md" block onClick={beginRound}>
              Play again
            </Button>
          </div>
        </div>
      </GameShell>
    );
  }

  return (
    <GameShell title="Heads Up" subtitle="Guess the word on your forehead">
      <div className="safe-x safe-bottom mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 overflow-y-auto pb-6">
        <section>
          <h2 className="text-muted mb-3 text-sm font-semibold tracking-wide uppercase">
            Pack
          </h2>
          <CategoryPicker
            categories={categories}
            value={categoryId}
            onChange={setCategoryId}
          />
        </section>

        <section>
          <h2 className="text-muted mb-3 text-sm font-semibold tracking-wide uppercase">
            Round length
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {DURATIONS.map((seconds) => (
              <button
                key={seconds}
                onClick={() => {
                  haptics.tap();
                  setDuration(seconds);
                }}
                aria-pressed={seconds === duration}
                className={cn(
                  "min-h-14 rounded-2xl border text-lg font-semibold active:scale-95",
                  seconds === duration
                    ? "border-fuchsia-400 bg-fuchsia-500/20"
                    : "border-line bg-surface-2",
                )}
              >
                {seconds}s
              </button>
            ))}
          </div>
        </section>

        <section>
          <button
            onClick={() => {
              haptics.tap();
              setInvertTilt((current) => !current);
            }}
            className="bg-surface-2 border-line flex w-full items-center gap-3 rounded-2xl border p-4 text-left active:scale-[0.98]"
          >
            <span className="text-2xl">🔄</span>
            <span className="flex-1">
              <span className="block font-semibold">Swap the tilt</span>
              <span className="text-muted block text-xs">
                Turn this on if tilting down is passing instead of scoring
              </span>
            </span>
            <span
              className={cn(
                "relative h-7 w-12 shrink-0 rounded-full transition",
                invertTilt ? "bg-fuchsia-500" : "bg-line",
              )}
            >
              <span
                className={cn(
                  "absolute top-1 size-5 rounded-full bg-white transition-all",
                  invertTilt ? "left-6" : "left-1",
                )}
              />
            </span>
          </button>
        </section>

        <div className="mt-auto flex flex-col gap-3 pt-2">
          <Button block onClick={beginRound} disabled={words.length === 0}>
            Start round
          </Button>
          <Link
            href="/"
            className="text-muted py-2 text-center text-sm underline-offset-4 active:underline"
          >
            Back to games
          </Link>
        </div>
      </div>
    </GameShell>
  );
}
