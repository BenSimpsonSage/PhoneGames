"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { CategoryPicker, MIX_ID } from "@/components/CategoryPicker";
import { GameShell } from "@/components/GameShell";
import { TimerRing } from "@/components/TimerRing";
import { IMPOSTER_CATEGORIES } from "@/data/imposter";
import { cn } from "@/lib/cn";
import { haptics } from "@/lib/haptics";
import { useCountdown } from "@/lib/hooks/useCountdown";
import { usePersistentState } from "@/lib/hooks/usePersistentState";
import { useWakeLock } from "@/lib/hooks/useWakeLock";
import { pickOne, shuffle } from "@/lib/shuffle";
import { sfx } from "@/lib/sound";
import { useAppState } from "@/lib/state";
import { usableCategories } from "@/lib/types";

type Phase = "setup" | "deal" | "discuss" | "reveal";

type RoundPlayer = { id: string; name: string };

type Assignment = {
  word: string;
  packName: string;
  imposterIds: string[];
};

const DISCUSS_OPTIONS = [
  { seconds: 0, label: "No timer" },
  { seconds: 120, label: "2 min" },
  { seconds: 180, label: "3 min" },
  { seconds: 300, label: "5 min" },
];

export default function ImposterPage() {
  const { tier, players } = useAppState();

  const [phase, setPhase] = useState<Phase>("setup");
  const [categoryId, setCategoryId] = usePersistentState(
    "partybox.imposter.category.v1",
    MIX_ID,
  );
  const [headcount, setHeadcount] = usePersistentState(
    "partybox.imposter.headcount.v1",
    5,
  );
  const [imposterCount, setImposterCount] = usePersistentState(
    "partybox.imposter.imposters.v1",
    1,
  );
  const [discussSeconds, setDiscussSeconds] = usePersistentState(
    "partybox.imposter.discuss.v1",
    180,
  );

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [roundPlayers, setRoundPlayers] = useState<RoundPlayer[]>([]);
  const [dealIndex, setDealIndex] = useState(0);
  const [holding, setHolding] = useState(false);
  const [hasPeeked, setHasPeeked] = useState(false);
  const [scores, setScores] = useState({ group: 0, imposter: 0 });

  const categories = useMemo(
    () => usableCategories(IMPOSTER_CATEGORIES, tier),
    [tier],
  );

  /** Named people if the roster is set up, otherwise plain numbered seats. */
  const lineup = useMemo<RoundPlayer[]>(() => {
    if (players.length >= 3) {
      return players.map((p) => ({ id: p.id, name: p.name }));
    }
    return Array.from({ length: headcount }, (_, i) => ({
      id: `seat-${i}`,
      name: `Player ${i + 1}`,
    }));
  }, [players, headcount]);

  const usingRoster = players.length >= 3;
  const maxImposters = Math.max(1, Math.floor((lineup.length - 1) / 3));

  const timer = useCountdown(discussSeconds || 1, {
    onExpire: () => {
      haptics.timeUp();
      sfx.timeUp();
    },
    onTick: (secondsLeft) => {
      if (secondsLeft <= 5 && secondsLeft > 0) sfx.tick();
    },
  });

  useWakeLock(phase === "deal" || phase === "discuss");

  const deal = useCallback(() => {
    const chosen =
      categoryId === MIX_ID
        ? categories
        : categories.filter((c) => c.id === categoryId);
    const packs = chosen.length > 0 ? chosen : categories;
    if (packs.length === 0) return;

    const pack = pickOne(packs);
    const word = pickOne(pack.entries).text;

    const effectiveImposters = Math.min(imposterCount, maxImposters);
    const imposterIds = shuffle(lineup)
      .slice(0, effectiveImposters)
      .map((p) => p.id);

    setAssignment({ word, packName: pack.name, imposterIds });
    setRoundPlayers(lineup);
    setDealIndex(0);
    setHasPeeked(false);
    setHolding(false);
    sfx.unlock();
    setPhase("deal");
  }, [categories, categoryId, imposterCount, lineup, maxImposters]);

  const nextDeal = () => {
    if (dealIndex + 1 >= roundPlayers.length) {
      setPhase("discuss");
      if (discussSeconds > 0) timer.start(discussSeconds);
      return;
    }
    setDealIndex((i) => i + 1);
    setHasPeeked(false);
    setHolding(false);
  };

  const finishRound = (winner: "group" | "imposter") => {
    setScores((s) => ({ ...s, [winner]: s[winner] + 1 }));
    haptics.reveal();
    sfx.fanfare();
    setPhase("setup");
  };

  if (phase === "deal" && assignment) {
    const player = roundPlayers[dealIndex];
    const isImposter = assignment.imposterIds.includes(player.id);

    return (
      <GameShell
        title="Imposter"
        subtitle={`Card ${dealIndex + 1} of ${roundPlayers.length}`}
        onBack={() => setPhase("setup")}
      >
        <div className="safe-x safe-bottom mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-8 pb-6">
          <div className="text-center">
            <p className="text-muted text-lg">Pass the phone to</p>
            <p className="mt-1 text-4xl font-bold">{player.name}</p>
          </div>

          <button
            // Hold-to-reveal rather than a toggle: a card left face-up on a
            // table by a distracted 8-year-old ends the round instantly.
            onPointerDown={() => {
              setHolding(true);
              setHasPeeked(true);
              haptics.reveal();
              sfx.reveal();
            }}
            onPointerUp={() => setHolding(false)}
            onPointerLeave={() => setHolding(false)}
            onPointerCancel={() => setHolding(false)}
            onContextMenu={(e) => e.preventDefault()}
            className={cn(
              "rounded-card flex aspect-[3/4] w-full max-w-xs flex-col items-center justify-center border-2 p-6 text-center transition",
              holding
                ? isImposter
                  ? "border-rose-400 bg-rose-500/20"
                  : "border-emerald-400 bg-emerald-500/15"
                : "border-line bg-surface-2 active:scale-[0.98]",
            )}
          >
            {holding ? (
              isImposter ? (
                <>
                  <span className="text-5xl">🕵️</span>
                  <span className="mt-3 text-3xl font-bold text-rose-300">
                    You&apos;re the imposter
                  </span>
                  <span className="text-muted mt-4 text-sm">
                    Everyone else has a word from
                  </span>
                  <span className="text-cream text-xl font-semibold">
                    {assignment.packName}
                  </span>
                  <span className="text-muted mt-3 text-xs">
                    Blend in. Don&apos;t get caught.
                  </span>
                </>
              ) : (
                <>
                  <span className="text-muted text-sm">
                    {assignment.packName}
                  </span>
                  <span className="mt-2 text-4xl leading-tight font-bold text-balance">
                    {assignment.word}
                  </span>
                  <span className="text-muted mt-4 text-xs">
                    One player doesn&apos;t know this
                  </span>
                </>
              )
            ) : (
              <>
                <span className="text-5xl">🤫</span>
                <span className="mt-4 text-2xl font-semibold">
                  Hold to see your card
                </span>
                <span className="text-muted mt-2 text-sm">
                  Don&apos;t let anyone else look
                </span>
              </>
            )}
          </button>

          <Button block onClick={nextDeal} disabled={!hasPeeked}>
            {dealIndex + 1 >= roundPlayers.length
              ? "Everyone's seen it"
              : "Next player"}
          </Button>
        </div>
      </GameShell>
    );
  }

  if (phase === "discuss" && assignment) {
    return (
      <GameShell
        title="Imposter"
        subtitle="Talk it out"
        onBack={() => setPhase("setup")}
      >
        <div className="safe-x safe-bottom mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-8 pb-6">
          {discussSeconds > 0 ? (
            <TimerRing
              fraction={timer.fraction}
              secondsLeft={timer.secondsLeft}
              size={180}
            />
          ) : (
            <span className="text-7xl">💬</span>
          )}

          <div className="px-4 text-center">
            <p className="text-2xl font-semibold">
              Everyone describe the word — one sentence each
            </p>
            <p className="text-muted mt-3">
              Then count down from three and all point at who you think the
              imposter is.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3">
            {discussSeconds > 0 && (
              <Button
                variant="solid"
                size="md"
                block
                onClick={() => (timer.running ? timer.pause() : timer.resume())}
              >
                {timer.running ? "Pause" : "Resume"}
              </Button>
            )}
            <Button block onClick={() => setPhase("reveal")}>
              Reveal the imposter
            </Button>
          </div>
        </div>
      </GameShell>
    );
  }

  if (phase === "reveal" && assignment) {
    const imposters = roundPlayers.filter((p) =>
      assignment.imposterIds.includes(p.id),
    );

    return (
      <GameShell title="Imposter" subtitle="The truth" onBack={() => setPhase("setup")}>
        <div className="safe-x safe-bottom mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-7 pb-6">
          <div className="animate-pop text-center">
            <p className="text-muted">
              {imposters.length === 1 ? "The imposter was" : "The imposters were"}
            </p>
            <p className="mt-2 text-4xl font-bold text-rose-300">
              {imposters.map((p) => p.name).join(" & ")}
            </p>
          </div>

          <div className="bg-surface-2 border-line w-full rounded-2xl border p-5 text-center">
            <p className="text-muted text-sm">The word was</p>
            <p className="mt-1 text-3xl font-bold">{assignment.word}</p>
            <p className="text-muted mt-2 text-xs">{assignment.packName}</p>
          </div>

          <div className="w-full">
            <p className="text-muted mb-3 text-center text-sm">
              Who won the round?
            </p>
            <div className="flex gap-3">
              <Button
                variant="solid"
                size="md"
                block
                onClick={() => finishRound("group")}
              >
                Everyone else
              </Button>
              <Button size="md" block onClick={() => finishRound("imposter")}>
                The imposter
              </Button>
            </div>
          </div>
        </div>
      </GameShell>
    );
  }

  return (
    <GameShell title="Imposter" subtitle="Everyone knows the word. Except one.">
      <div className="safe-x safe-bottom mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 overflow-y-auto pb-6">
        {(scores.group > 0 || scores.imposter > 0) && (
          <div className="bg-surface-2 border-line flex items-center justify-around rounded-2xl border p-3 text-center">
            <div>
              <p className="text-2xl font-bold">{scores.group}</p>
              <p className="text-muted text-xs">Group</p>
            </div>
            <div className="bg-line h-8 w-px" />
            <div>
              <p className="text-2xl font-bold text-rose-300">
                {scores.imposter}
              </p>
              <p className="text-muted text-xs">Imposters</p>
            </div>
          </div>
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
            Players
          </h2>
          {usingRoster ? (
            <p className="bg-surface-2 border-line text-muted rounded-2xl border p-4 text-sm">
              Using your {players.length} saved players:{" "}
              <span className="text-cream">
                {players.map((p) => p.name).join(", ")}
              </span>
              . Change them in settings on the home screen.
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {[3, 4, 5, 6, 7, 8, 9, 10].map((count) => (
                <button
                  key={count}
                  onClick={() => {
                    haptics.tap();
                    setHeadcount(count);
                  }}
                  aria-pressed={count === headcount}
                  className={cn(
                    "min-h-13 rounded-2xl border text-lg font-semibold active:scale-95",
                    count === headcount
                      ? "border-fuchsia-400 bg-fuchsia-500/20"
                      : "border-line bg-surface-2",
                  )}
                >
                  {count}
                </button>
              ))}
            </div>
          )}
        </section>

        {maxImposters > 1 && (
          <section>
            <h2 className="text-muted mb-3 text-sm font-semibold tracking-wide uppercase">
              How many imposters
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: maxImposters }, (_, i) => i + 1).map(
                (count) => (
                  <button
                    key={count}
                    onClick={() => {
                      haptics.tap();
                      setImposterCount(count);
                    }}
                    aria-pressed={count === imposterCount}
                    className={cn(
                      "min-h-13 rounded-2xl border text-lg font-semibold active:scale-95",
                      count === imposterCount
                        ? "border-fuchsia-400 bg-fuchsia-500/20"
                        : "border-line bg-surface-2",
                    )}
                  >
                    {count}
                  </button>
                ),
              )}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-muted mb-3 text-sm font-semibold tracking-wide uppercase">
            Discussion time
          </h2>
          <div className="grid grid-cols-4 gap-2">
            {DISCUSS_OPTIONS.map((option) => (
              <button
                key={option.seconds}
                onClick={() => {
                  haptics.tap();
                  setDiscussSeconds(option.seconds);
                }}
                aria-pressed={option.seconds === discussSeconds}
                className={cn(
                  "min-h-13 rounded-2xl border px-1 text-sm font-semibold active:scale-95",
                  option.seconds === discussSeconds
                    ? "border-fuchsia-400 bg-fuchsia-500/20"
                    : "border-line bg-surface-2",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>

        <div className="mt-auto flex flex-col gap-3 pt-2">
          <Button block onClick={deal} disabled={categories.length === 0}>
            Deal the cards
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
