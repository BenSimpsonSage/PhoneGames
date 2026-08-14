"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { GameShell } from "@/components/GameShell";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { PlayerManager } from "@/components/PlayerManager";
import { Sheet } from "@/components/Sheet";
import { MOST_LIKELY_TO } from "@/data/most-likely-to";
import { cn } from "@/lib/cn";
import { haptics } from "@/lib/haptics";
import { Dealer } from "@/lib/shuffle";
import { sfx } from "@/lib/sound";
import { useAppState } from "@/lib/state";
import { filterByTier, type Entry } from "@/lib/types";

export default function MostLikelyToPage() {
  const { tier, players, hydrated } = useAppState();

  const [prompt, setPrompt] = useState<Entry | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [tally, setTally] = useState<Record<string, number>>({});
  const [round, setRound] = useState(1);
  const [scoresOpen, setScoresOpen] = useState(false);

  const dealerRef = useRef<Dealer<Entry> | null>(null);

  const pool = useMemo(() => filterByTier(MOST_LIKELY_TO, tier), [tier]);

  useEffect(() => {
    dealerRef.current = new Dealer(pool);
    setPrompt(dealerRef.current.next() ?? null);
    setPicked([]);
  }, [pool]);

  const nextPrompt = useCallback(() => {
    // Ties are normal here — a whole family shouting one name is the fun bit,
    // but two names is just as valid an answer.
    setTally((current) => {
      const updated = { ...current };
      picked.forEach((id) => {
        updated[id] = (updated[id] ?? 0) + 1;
      });
      return updated;
    });
    setPicked([]);
    setPrompt(dealerRef.current?.next() ?? null);
    setRound((n) => n + 1);
    haptics.tap();
  }, [picked]);

  const togglePick = (id: string) => {
    haptics.correct();
    sfx.tap();
    setPicked((current) =>
      current.includes(id)
        ? current.filter((p) => p !== id)
        : [...current, id],
    );
  };

  const leaderboard = useMemo(
    () =>
      [...players]
        .map((player) => ({ player, score: tally[player.id] ?? 0 }))
        .sort((a, b) => b.score - a.score),
    [players, tally],
  );

  if (!hydrated) {
    return (
      <GameShell title="Most Likely To">
        <div className="flex flex-1 items-center justify-center">
          <p className="text-muted">Loading…</p>
        </div>
      </GameShell>
    );
  }

  if (players.length < 3) {
    return (
      <GameShell title="Most Likely To" subtitle="Who's playing?">
        <div className="safe-x safe-bottom mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 overflow-y-auto pb-6">
          <p className="text-muted">
            This one needs at least three people. Add everyone in the room and
            they&apos;ll be remembered for next time.
          </p>
          <PlayerManager autoFocus />
          <Link
            href="/"
            className="text-muted mt-auto py-2 text-center text-sm underline-offset-4 active:underline"
          >
            Back to games
          </Link>
        </div>
      </GameShell>
    );
  }

  return (
    <GameShell title="Most Likely To" subtitle={`Round ${round}`}>
      <div className="safe-x safe-bottom mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 overflow-y-auto pb-6">
        <div className="rounded-card bg-gradient-to-br from-violet-500 to-purple-700 p-6 text-center shadow-lg shadow-black/40">
          <p className="text-sm font-semibold tracking-wide text-white/70 uppercase">
            Most likely to
          </p>
          <p
            key={prompt?.text}
            className="animate-pop mt-2 text-3xl leading-tight font-bold text-white text-balance"
          >
            {prompt?.text ?? "…"}
          </p>
        </div>

        <p className="text-muted text-center text-sm">
          Count to three, everyone point — then tap who got the most fingers.
        </p>

        <div className="grid grid-cols-2 gap-3">
          {players.map((player) => {
            const selected = picked.includes(player.id);
            return (
              <button
                key={player.id}
                onClick={() => togglePick(player.id)}
                aria-pressed={selected}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border p-3 text-left transition active:scale-95",
                  selected
                    ? "border-fuchsia-400 bg-fuchsia-500/20"
                    : "border-line bg-surface-2",
                )}
              >
                <PlayerAvatar player={player} size={38} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">
                    {player.name}
                  </span>
                  <span className="text-muted text-xs">
                    {tally[player.id] ?? 0} pts
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-auto flex flex-col gap-3 pt-2">
          <Button block onClick={nextPrompt}>
            {picked.length === 0 ? "Skip this one" : "Next"}
          </Button>
          <div className="flex gap-3">
            <Button
              variant="solid"
              size="md"
              block
              onClick={() => setScoresOpen(true)}
            >
              Scores
            </Button>
            <Button
              variant="ghost"
              size="md"
              block
              onClick={() => {
                setTally({});
                setRound(1);
                haptics.skip();
              }}
            >
              Reset
            </Button>
          </div>
          <Link
            href="/"
            className="text-muted py-2 text-center text-sm underline-offset-4 active:underline"
          >
            Back to games
          </Link>
        </div>
      </div>

      <Sheet
        open={scoresOpen}
        title="Scores"
        onClose={() => setScoresOpen(false)}
      >
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
        <Button
          block
          size="md"
          className="mt-5"
          onClick={() => {
            sfx.fanfare();
            setScoresOpen(false);
          }}
        >
          Keep playing
        </Button>
      </Sheet>
    </GameShell>
  );
}
