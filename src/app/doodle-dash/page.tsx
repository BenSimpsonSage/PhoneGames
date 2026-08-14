"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import { Button } from "@/components/Button";
import {
  DrawingCanvas,
  type DrawingCanvasHandle,
} from "@/components/DrawingCanvas";
import { GameShell } from "@/components/GameShell";
import { TimerRing } from "@/components/TimerRing";
import { DOODLE_WORDS } from "@/data/doodle";
import { cn } from "@/lib/cn";
import { haptics } from "@/lib/haptics";
import { useCountdown } from "@/lib/hooks/useCountdown";
import { usePersistentState } from "@/lib/hooks/usePersistentState";
import { useWakeLock } from "@/lib/hooks/useWakeLock";
import { Dealer } from "@/lib/shuffle";
import { sfx } from "@/lib/sound";
import { useAppState } from "@/lib/state";
import { filterByTier, type Entry } from "@/lib/types";

type Phase = "setup" | "reveal" | "drawing" | "done";

const DURATIONS = [60, 90, 120];

const PENS = [
  "#f7f3ff",
  "#fb7185",
  "#fbbf24",
  "#34d399",
  "#38bdf8",
  "#c084fc",
  "#a3733f",
  "#0d0a1c",
];

export default function DoodleDashPage() {
  const { tier, players } = useAppState();

  const [phase, setPhase] = useState<Phase>("setup");
  const [duration, setDuration] = usePersistentState(
    "partybox.doodle.duration.v1",
    90,
  );
  const [word, setWord] = useState<Entry | null>(null);
  const [pen, setPen] = useState(PENS[0]);
  const [thick, setThick] = useState(8);
  const [artistIndex, setArtistIndex] = useState(0);
  const [holding, setHolding] = useState(false);
  const [guessed, setGuessed] = useState(false);

  const canvasRef = useRef<DrawingCanvasHandle>(null);
  const dealerRef = useRef<Dealer<Entry> | null>(null);

  const pool = useMemo(() => filterByTier(DOODLE_WORDS, tier), [tier]);

  const artist = players.length > 0 ? players[artistIndex % players.length] : null;

  const timer = useCountdown(duration, {
    onExpire: () => {
      haptics.timeUp();
      sfx.timeUp();
      setGuessed(false);
      setPhase("done");
    },
    onTick: (secondsLeft) => {
      if (secondsLeft <= 5 && secondsLeft > 0) sfx.tick();
    },
  });

  useWakeLock(phase === "drawing" || phase === "reveal");

  const startRound = useCallback(() => {
    if (!dealerRef.current) dealerRef.current = new Dealer(pool);
    setWord(dealerRef.current.next() ?? null);
    setHolding(false);
    setGuessed(false);
    sfx.unlock();
    timer.reset(duration);
    canvasRef.current?.clear();
    setPhase("reveal");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration, pool]);

  const beginDrawing = () => {
    setPhase("drawing");
    timer.start(duration);
  };

  const finish = (didGuess: boolean) => {
    timer.pause();
    setGuessed(didGuess);
    if (didGuess) {
      haptics.correct();
      sfx.fanfare();
    }
    setPhase("done");
  };

  const nextRound = () => {
    setArtistIndex((i) => i + 1);
    startRound();
  };

  if (phase === "reveal" && word) {
    return (
      <GameShell
        title="Doodle Dash"
        subtitle="Artist only"
        onBack={() => setPhase("setup")}
      >
        <div className="safe-x safe-bottom mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-8 pb-6">
          <div className="text-center">
            <p className="text-muted text-lg">
              {artist ? "The artist is" : "Whoever's drawing"}
            </p>
            {artist && <p className="mt-1 text-4xl font-bold">{artist.name}</p>}
          </div>

          <button
            onPointerDown={() => {
              setHolding(true);
              haptics.reveal();
              sfx.reveal();
            }}
            onPointerUp={() => setHolding(false)}
            onPointerLeave={() => setHolding(false)}
            onPointerCancel={() => setHolding(false)}
            onContextMenu={(e) => e.preventDefault()}
            className={cn(
              "rounded-card flex aspect-[4/3] w-full max-w-xs flex-col items-center justify-center border-2 p-6 text-center transition",
              holding
                ? "border-fuchsia-400 bg-fuchsia-500/20"
                : "border-line bg-surface-2 active:scale-[0.98]",
            )}
          >
            {holding ? (
              <>
                <span className="text-muted text-sm">Draw this</span>
                <span className="mt-2 text-4xl leading-tight font-bold text-balance">
                  {word.text}
                </span>
              </>
            ) : (
              <>
                <span className="text-5xl">🎨</span>
                <span className="mt-4 text-2xl font-semibold">
                  Hold to see your word
                </span>
                <span className="text-muted mt-2 text-sm">
                  Artist only — no peeking
                </span>
              </>
            )}
          </button>

          <p className="text-muted text-center text-sm">
            No letters, no numbers, no talking. Just draw.
          </p>

          <Button block onClick={beginDrawing}>
            Start drawing
          </Button>
        </div>
      </GameShell>
    );
  }

  if (phase === "drawing") {
    return (
      <main className="screen-h flex flex-col overflow-hidden">
        <div className="safe-top safe-x flex shrink-0 items-center gap-3 pb-2">
          <TimerRing
            fraction={timer.fraction}
            secondsLeft={timer.secondsLeft}
            size={56}
          />
          <p className="text-muted flex-1 text-sm">
            {artist ? `${artist.name} is drawing` : "Drawing…"}
          </p>
          <button
            onClick={() => canvasRef.current?.undo()}
            className="bg-surface-2 border-line flex size-11 items-center justify-center rounded-full border text-lg active:scale-95"
            aria-label="Undo last stroke"
          >
            ↶
          </button>
          <button
            onClick={() => canvasRef.current?.clear()}
            className="bg-surface-2 border-line flex size-11 items-center justify-center rounded-full border text-lg active:scale-95"
            aria-label="Clear the drawing"
          >
            🗑️
          </button>
        </div>

        <div className="mx-3 flex-1 overflow-hidden rounded-2xl bg-white">
          <DrawingCanvas
            ref={canvasRef}
            color={pen}
            width={thick}
            className="size-full"
          />
        </div>

        <div className="safe-x safe-bottom shrink-0 pt-3">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex flex-1 gap-2 overflow-x-auto">
              {PENS.map((colour) => (
                <button
                  key={colour}
                  onClick={() => {
                    haptics.tap();
                    setPen(colour);
                  }}
                  aria-label={`Pen colour ${colour}`}
                  className={cn(
                    "size-9 shrink-0 rounded-full border-2 transition active:scale-90",
                    pen === colour
                      ? "border-fuchsia-400 scale-110"
                      : "border-white/25",
                  )}
                  style={{ background: colour }}
                />
              ))}
            </div>
            <div className="bg-line h-8 w-px" />
            {[4, 8, 18].map((size) => (
              <button
                key={size}
                onClick={() => {
                  haptics.tap();
                  setThick(size);
                }}
                aria-label={`Brush size ${size}`}
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full border",
                  thick === size
                    ? "border-fuchsia-400 bg-fuchsia-500/20"
                    : "border-line bg-surface-2",
                )}
              >
                <span
                  className="rounded-full bg-current"
                  style={{ width: size / 1.4, height: size / 1.4 }}
                />
              </button>
            ))}
          </div>

          <Button block onClick={() => finish(true)}>
            Somebody guessed it!
          </Button>
        </div>
      </main>
    );
  }

  if (phase === "done" && word) {
    return (
      <GameShell title="Doodle Dash" subtitle={guessed ? "Guessed!" : "Time!"}>
        <div className="safe-x safe-bottom mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-7 pb-6">
          <p className="animate-pop text-6xl">{guessed ? "🎉" : "⏰"}</p>
          <div className="text-center">
            <p className="text-muted">The word was</p>
            <p className="mt-2 text-4xl font-bold text-balance">{word.text}</p>
          </div>
          {guessed && timer.secondsLeft > 0 && (
            <p className="text-muted text-center">
              With {timer.secondsLeft} seconds to spare.
            </p>
          )}
          <div className="mt-auto flex w-full flex-col gap-3">
            <Button block onClick={nextRound}>
              {players.length > 1 ? "Next artist" : "Next word"}
            </Button>
            <Button
              variant="solid"
              size="md"
              block
              onClick={() => setPhase("setup")}
            >
              Settings
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

  return (
    <GameShell title="Doodle Dash" subtitle="Draw it before the time runs out">
      <div className="safe-x safe-bottom mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 overflow-y-auto pb-6">
        <div className="bg-surface-2 border-line rounded-2xl border p-5">
          <h2 className="mb-2 font-semibold">How it works</h2>
          <p className="text-muted text-sm leading-relaxed">
            One person holds the phone and draws. Everyone else shouts guesses.
            No letters, no numbers, no talking — and hand the phone on to the
            next artist each round.
          </p>
        </div>

        {players.length === 0 && (
          <p className="text-muted text-sm">
            Add players in settings on the home screen and the app will take
            turns picking an artist for you.
          </p>
        )}

        <section>
          <h2 className="text-muted mb-3 text-sm font-semibold tracking-wide uppercase">
            Time to draw
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

        <div className="mt-auto flex flex-col gap-3 pt-2">
          <Button block onClick={startRound} disabled={pool.length === 0}>
            Start
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
