"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { CategoryPicker, MIX_ID } from "@/components/CategoryPicker";
import { GameShell } from "@/components/GameShell";
import { GetReady } from "@/components/GetReady";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { PlayerManager } from "@/components/PlayerManager";
import { TimerRing } from "@/components/TimerRing";
import { HEADS_UP_CATEGORIES } from "@/data/heads-up";
import { cn } from "@/lib/cn";
import { haptics } from "@/lib/haptics";
import { useCountdown } from "@/lib/hooks/useCountdown";
import { usePersistentState } from "@/lib/hooks/usePersistentState";
import { useWakeLock } from "@/lib/hooks/useWakeLock";
import { Dealer } from "@/lib/shuffle";
import { sfx } from "@/lib/sound";
import { useAppState } from "@/lib/state";
import { usableCategories } from "@/lib/types";

type Phase = "setup" | "handover" | "ready" | "playing" | "done";
type Result = { text: string; got: boolean };

const DURATIONS = [30, 60, 90];

export default function DescribeItPage() {
  const { tier, players, hydrated } = useAppState();

  const [phase, setPhase] = useState<Phase>("setup");
  const [categoryId, setCategoryId] = usePersistentState(
    "partybox.describe.category.v1",
    MIX_ID,
  );
  const [duration, setDuration] = usePersistentState(
    "partybox.describe.duration.v1",
    60,
  );

  const [turn, setTurn] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [word, setWord] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [flash, setFlash] = useState<"got" | "pass" | null>(null);

  // One dealer for the whole game, so a word never comes round again until the
  // pack runs out — even across different describers.
  const dealerRef = useRef<Dealer<string> | null>(null);
  // Blocks input while the flash is on screen, so a double tap can't burn
  // through two cards.
  const lockedRef = useRef(false);

  const categories = useMemo(
    () => usableCategories(HEADS_UP_CATEGORIES, tier),
    [tier],
  );

  // Describing works with the same words as Heads Up — both are "say it
  // without saying it" — so the packs are shared rather than duplicated.
  const words = useMemo(() => {
    const chosen =
      categoryId === MIX_ID
        ? categories
        : categories.filter((c) => c.id === categoryId);
    const pool = chosen.flatMap((c) => c.entries.map((e) => e.text));
    return pool.length > 0
      ? pool
      : categories.flatMap((c) => c.entries.map((e) => e.text));
  }, [categories, categoryId]);

  const describer = players.length > 0 ? players[turn % players.length] : null;
  const nextUp =
    players.length > 0 ? players[(turn + 1) % players.length] : null;

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
        setWord(dealerRef.current?.next() ?? "");
        lockedRef.current = false;
      }, 400);
    },
    [word],
  );

  const turnScore = results.filter((r) => r.got).length;

  // The current turn is only banked when the phone moves on, so a card can
  // still be flipped on the summary screen if someone said part of the word.
  const leaderboard = useMemo(
    () =>
      players
        .map((player) => ({
          player,
          score:
            (scores[player.id] ?? 0) +
            (phase === "done" && player.id === describer?.id ? turnScore : 0),
        }))
        .sort((a, b) => b.score - a.score),
    [players, scores, phase, describer, turnScore],
  );

  const startGame = () => {
    dealerRef.current = new Dealer(words);
    setScores({});
    setTurn(0);
    setPhase("handover");
  };

  const beginTurn = () => {
    sfx.unlock();
    setResults([]);
    setWord(dealerRef.current?.next() ?? "");
    timer.reset(duration);
    setPhase("ready");
  };

  const startPlaying = () => {
    setPhase("playing");
    timer.start(duration);
  };

  const nextTurn = () => {
    if (describer) {
      setScores((current) => ({
        ...current,
        [describer.id]: (current[describer.id] ?? 0) + turnScore,
      }));
    }
    setTurn((t) => t + 1);
    setPhase("handover");
  };

  const toggleResult = (index: number) => {
    haptics.tap();
    setResults((current) =>
      current.map((r, i) => (i === index ? { ...r, got: !r.got } : r)),
    );
  };

  if (!hydrated) {
    return (
      <GameShell title="Describe It">
        <div className="flex flex-1 items-center justify-center">
          <p className="text-muted">Loading…</p>
        </div>
      </GameShell>
    );
  }

  if (phase === "handover" && describer) {
    return (
      <GameShell
        title="Describe It"
        subtitle={`Turn ${turn + 1}`}
        onBack={() => setPhase("setup")}
      >
        <div className="safe-x safe-bottom mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-8 pb-6">
          <p className="text-muted text-lg">Pass the phone to</p>
          <div className="animate-pop flex flex-col items-center gap-4">
            <PlayerAvatar player={describer} size={96} />
            <p className="text-4xl font-bold">{describer.name}</p>
          </div>
          <p className="text-muted max-w-xs text-center text-sm">
            Describe each word without saying it, or any part of it. Everyone
            else shouts out guesses.
          </p>
          <Button block onClick={beginTurn}>
            I&apos;m ready
          </Button>
        </div>
      </GameShell>
    );
  }

  if (phase === "ready") {
    return (
      <GameShell title="Describe It" bare>
        <div className="safe-bottom flex flex-1 flex-col items-center justify-center px-8">
          <GetReady
            label={`${describer?.name ?? "You"}, hide the screen from everyone else`}
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
              {flash === "got" ? "+1" : "Skip"}
            </p>
          </div>
        ) : (
          <>
            <div className="safe-top safe-x flex items-center justify-between pb-2">
              <TimerRing
                fraction={timer.fraction}
                secondsLeft={timer.secondsLeft}
                size={72}
              />
              <div className="text-right">
                <p className="text-muted text-sm">{describer?.name}</p>
                <p className="text-3xl font-bold">{turnScore}</p>
              </div>
            </div>

            <div className="flex flex-1 items-center justify-center px-6">
              <p
                key={word}
                className="animate-pop text-center text-5xl leading-tight font-bold text-balance"
              >
                {word}
              </p>
            </div>

            <div className="safe-bottom grid shrink-0 grid-cols-2 gap-3 px-4 pt-2">
              <button
                onClick={() => answer(false)}
                className="min-h-28 rounded-tile bg-amber-500/20 text-2xl font-bold text-amber-300 active:scale-95"
              >
                Skip
              </button>
              <button
                onClick={() => answer(true)}
                className="min-h-28 rounded-tile bg-emerald-500/20 text-2xl font-bold text-emerald-300 active:scale-95"
              >
                Got it
              </button>
            </div>
          </>
        )}
      </main>
    );
  }

  if (phase === "done" && describer) {
    return (
      <GameShell title="Describe It" subtitle={`${describer.name}'s turn`}>
        <div className="safe-x safe-bottom mx-auto flex w-full max-w-lg flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto pb-4">
            <div className="animate-pop py-5 text-center">
              <p className="text-7xl font-bold">{turnScore}</p>
              <p className="text-muted mt-1">
                {turnScore === 1 ? "point" : "points"} for {describer.name}
              </p>
            </div>

            {results.length > 0 && (
              <p className="text-muted mb-2 text-center text-xs">
                Tap a word to change it if someone said part of it
              </p>
            )}
            <ul className="space-y-2">
              {results.map((result, index) => (
                <li key={`${result.text}-${index}`}>
                  <button
                    onClick={() => toggleResult(index)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left active:scale-[0.98]",
                      result.got
                        ? "border-emerald-500/40 bg-emerald-500/10"
                        : "border-line bg-surface-2",
                    )}
                  >
                    <span>{result.got ? "✅" : "⏭️"}</span>
                    <span className={cn(!result.got && "text-muted")}>
                      {result.text}
                    </span>
                  </button>
                </li>
              ))}
              {results.length === 0 && (
                <li className="text-muted py-6 text-center">
                  No cards played that time!
                </li>
              )}
            </ul>

            <h2 className="text-muted mt-6 mb-3 text-sm font-semibold tracking-wide uppercase">
              Scores
            </h2>
            <ul className="flex flex-col gap-2">
              {leaderboard.map(({ player, score }, index) => (
                <li
                  key={player.id}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border p-3",
                    index === 0 && score > 0
                      ? "border-amber-400/50 bg-amber-400/10"
                      : "border-line bg-surface-2",
                  )}
                >
                  <span className="text-muted w-6 text-center font-bold">
                    {index + 1}
                  </span>
                  <PlayerAvatar player={player} size={36} />
                  <span className="flex-1 truncate">{player.name}</span>
                  <span className="text-xl font-bold">{score}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex shrink-0 gap-3 pt-2">
            <Button
              variant="solid"
              size="md"
              onClick={() => setPhase("setup")}
            >
              End game
            </Button>
            <Button size="md" block onClick={nextTurn}>
              {nextUp && nextUp.id !== describer.id
                ? `Pass to ${nextUp.name}`
                : "Next turn"}
            </Button>
          </div>
        </div>
      </GameShell>
    );
  }

  return (
    <GameShell title="Describe It" subtitle="Say it without saying it">
      <div className="safe-x safe-bottom mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 overflow-y-auto pb-6">
        <div className="bg-surface-2 border-line rounded-2xl border p-5">
          <h2 className="mb-2 font-semibold">How it works</h2>
          <p className="text-muted text-sm leading-relaxed">
            Take it in turns to hold the phone and describe the words on screen
            — without saying the word, any part of it, or what it rhymes with.
            Get through as many as you can before time runs out. Every word
            guessed is a point for the describer.
          </p>
        </div>

        {players.length < 2 ? (
          <section>
            <p className="text-muted mb-3 text-sm">
              Add at least two players so the app can take turns for you.
            </p>
            <PlayerManager autoFocus />
          </section>
        ) : (
          <section>
            <h2 className="text-muted mb-3 text-sm font-semibold tracking-wide uppercase">
              Playing
            </h2>
            <div className="flex flex-wrap gap-2">
              {players.map((player) => (
                <span
                  key={player.id}
                  className="bg-surface-2 border-line flex items-center gap-2 rounded-full border py-1 pr-3 pl-1"
                >
                  <PlayerAvatar player={player} size={28} />
                  <span className="text-sm">{player.name}</span>
                </span>
              ))}
            </div>
          </section>
        )}

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
            Turn length
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
          <Button
            block
            onClick={startGame}
            disabled={players.length < 2 || words.length === 0}
          >
            Start game
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
