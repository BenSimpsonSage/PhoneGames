"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { GameShell } from "@/components/GameShell";
import { GetReady } from "@/components/GetReady";
import { TimerRing } from "@/components/TimerRing";
import { CATEGORY_PROMPTS } from "@/data/categories";
import { cn } from "@/lib/cn";
import { haptics } from "@/lib/haptics";
import { useCountdown } from "@/lib/hooks/useCountdown";
import { usePersistentState } from "@/lib/hooks/usePersistentState";
import { useWakeLock } from "@/lib/hooks/useWakeLock";
import { Dealer, pickOne } from "@/lib/shuffle";
import { sfx } from "@/lib/sound";
import { useAppState } from "@/lib/state";
import { filterByTier, type Entry } from "@/lib/types";

type Phase = "setup" | "ready" | "playing" | "done";

const DURATIONS = [30, 45, 60];

/**
 * Q, X and Z are technically letters and practically a dead round, so they
 * only appear for the players who'd enjoy the challenge.
 */
const EASY_LETTERS = "ABCDEFGHIJLMNOPRSTW".split("");
const TRICKY_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWY".split("");

export default function CategoriesPage() {
  const { tier } = useAppState();

  const [phase, setPhase] = useState<Phase>("setup");
  const [duration, setDuration] = usePersistentState(
    "partybox.categories.duration.v1",
    45,
  );
  const [prompt, setPrompt] = useState<Entry | null>(null);
  const [letter, setLetter] = useState("A");
  const [round, setRound] = useState(0);

  const dealerRef = useRef<Dealer<Entry> | null>(null);

  const pool = useMemo(() => filterByTier(CATEGORY_PROMPTS, tier), [tier]);
  const letters = tier === "tricky" ? TRICKY_LETTERS : EASY_LETTERS;

  const timer = useCountdown(duration, {
    onExpire: () => {
      haptics.timeUp();
      sfx.timeUp();
      setPhase("done");
    },
    onTick: (secondsLeft) => {
      if (secondsLeft <= 5 && secondsLeft > 0) sfx.tick();
    },
  });

  useWakeLock(phase === "playing" || phase === "ready");

  const draw = useCallback(() => {
    if (!dealerRef.current) dealerRef.current = new Dealer(pool);
    setPrompt(dealerRef.current.next() ?? null);
    setLetter(pickOne(letters));
    setRound((n) => n + 1);
    timer.reset(duration);
    sfx.unlock();
    setPhase("ready");
    // `timer` is stable enough in practice, but listing it would re-create
    // this callback on every animation frame while a round is running.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration, letters, pool]);

  const promptText = prompt?.text ?? "Animals";

  if (phase === "ready") {
    return (
      <GameShell title="Categories" bare>
        <div className="safe-bottom flex flex-1 flex-col items-center justify-center gap-8 px-8">
          <Headline letter={letter} promptText={promptText} />
          <GetReady onDone={() => { setPhase("playing"); timer.start(duration); }} />
        </div>
      </GameShell>
    );
  }

  if (phase === "playing") {
    return (
      <GameShell title="Categories" bare>
        <div className="safe-top safe-x safe-bottom flex flex-1 flex-col items-center justify-between gap-6 py-4">
          <Headline letter={letter} promptText={promptText} />

          <TimerRing
            fraction={timer.fraction}
            secondsLeft={timer.secondsLeft}
            size={190}
          />

          <div className="flex w-full max-w-lg flex-col gap-3">
            <p className="text-muted text-center text-sm">
              Go round the circle. No repeats, no hesitating.
            </p>
            <div className="flex gap-3">
              <Button
                variant="solid"
                size="md"
                block
                onClick={() => (timer.running ? timer.pause() : timer.resume())}
              >
                {timer.running ? "Pause" : "Resume"}
              </Button>
              <Button
                variant="danger"
                size="md"
                block
                onClick={() => {
                  haptics.timeUp();
                  sfx.timeUp();
                  timer.pause();
                  setPhase("done");
                }}
              >
                Buzz out
              </Button>
            </div>
          </div>
        </div>
      </GameShell>
    );
  }

  if (phase === "done") {
    return (
      <GameShell title="Categories" subtitle={`Round ${round}`}>
        <div className="safe-x safe-bottom mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-8 pb-6">
          <p className="animate-pop text-6xl">⏰</p>
          <div className="text-center">
            <p className="text-3xl font-bold">Time!</p>
            <p className="text-muted mt-2">
              Whoever was stuck when the buzzer went is out.
            </p>
          </div>
          <Headline letter={letter} promptText={promptText} />
          <div className="mt-auto flex w-full flex-col gap-3">
            <Button block onClick={draw}>
              Next round
            </Button>
            <Button
              variant="solid"
              size="md"
              block
              onClick={() => setPhase("setup")}
            >
              Change the timer
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
    <GameShell title="Categories" subtitle="A letter, a topic, a ticking clock">
      <div className="safe-x safe-bottom mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 overflow-y-auto pb-6">
        <div className="bg-surface-2 border-line rounded-2xl border p-5">
          <h2 className="mb-2 font-semibold">How it works</h2>
          <p className="text-muted text-sm leading-relaxed">
            You get a topic and a letter — say, <em>Animals</em> starting with{" "}
            <strong className="text-cream">M</strong>. Go round the circle
            naming one each. Repeat something, or freeze for too long, and
            you&apos;re out.
          </p>
        </div>

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

        <div className="mt-auto flex flex-col gap-3 pt-2">
          <Button block onClick={draw} disabled={pool.length === 0}>
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

function Headline({
  letter,
  promptText,
}: {
  letter: string;
  promptText: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <p className="text-2xl leading-tight font-bold text-balance">
        {promptText}
      </p>
      <p className="text-muted text-sm">starting with</p>
      <p className="animate-pop rounded-tile bg-gradient-to-br from-emerald-400 to-green-600 px-8 py-3 text-6xl font-bold text-white shadow-lg shadow-black/40">
        {letter}
      </p>
    </div>
  );
}
