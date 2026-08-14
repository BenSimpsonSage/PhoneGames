"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { GameShell } from "@/components/GameShell";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { PlayerManager } from "@/components/PlayerManager";
import { DILEMMAS, type Dilemma } from "@/data/would-you-rather";
import { cn } from "@/lib/cn";
import { haptics } from "@/lib/haptics";
import { Dealer } from "@/lib/shuffle";
import { sfx } from "@/lib/sound";
import { useAppState, type Player } from "@/lib/state";
import { tiersFor } from "@/lib/types";

type Phase = "read" | "pass" | "vote" | "result";
type Choice = "a" | "b";

export default function WouldYouRatherPage() {
  const { tier, players, hydrated } = useAppState();

  const [phase, setPhase] = useState<Phase>("read");
  const [dilemma, setDilemma] = useState<Dilemma | null>(null);
  const [voteIndex, setVoteIndex] = useState(0);
  const [votes, setVotes] = useState<Record<string, Choice>>({});
  const [played, setPlayed] = useState(0);

  const dealerRef = useRef<Dealer<Dilemma> | null>(null);

  const pool = useMemo(() => {
    const allowed = new Set(tiersFor(tier));
    return DILEMMAS.filter((d) => allowed.has(d.tier));
  }, [tier]);

  // Rebuild the deck when the difficulty changes so the current tier's
  // questions actually come up.
  useEffect(() => {
    dealerRef.current = new Dealer(pool);
    setDilemma(dealerRef.current.next() ?? null);
    setPhase("read");
    setVotes({});
    setVoteIndex(0);
  }, [pool]);

  const votingEnabled = players.length >= 2;

  const nextQuestion = useCallback(() => {
    setDilemma(dealerRef.current?.next() ?? null);
    setVotes({});
    setVoteIndex(0);
    setPlayed((n) => n + 1);
    setPhase("read");
  }, []);

  const castVote = (choice: Choice) => {
    const player = players[voteIndex];
    if (!player) return;
    haptics.correct();
    sfx.tap();
    const nextVotes = { ...votes, [player.id]: choice };
    setVotes(nextVotes);

    if (voteIndex + 1 >= players.length) {
      haptics.reveal();
      sfx.reveal();
      setPhase("result");
    } else {
      setVoteIndex((i) => i + 1);
      setPhase("pass");
    }
  };

  if (!hydrated || !dilemma) {
    return (
      <GameShell title="Would You Rather">
        <div className="flex flex-1 items-center justify-center">
          <p className="text-muted">Shuffling…</p>
        </div>
      </GameShell>
    );
  }

  const forA = players.filter((p) => votes[p.id] === "a");
  const forB = players.filter((p) => votes[p.id] === "b");

  if (phase === "pass") {
    const player = players[voteIndex];
    return (
      <GameShell title="Would You Rather" bare>
        <div className="safe-x flex flex-1 flex-col items-center justify-center gap-6 px-6">
          <p className="text-muted text-lg">Pass the phone to</p>
          <p className="text-5xl font-bold">{player?.name}</p>
          <p className="text-muted text-center">
            Everyone else, look away — keep your answer secret.
          </p>
          <Button block onClick={() => setPhase("vote")}>
            I&apos;m ready
          </Button>
        </div>
      </GameShell>
    );
  }

  if (phase === "result") {
    const total = forA.length + forB.length;
    const unanimous = total > 1 && (forA.length === 0 || forB.length === 0);
    const loner =
      total > 2 && (forA.length === 1 || forB.length === 1)
        ? (forA.length === 1 ? forA[0] : forB[0])
        : null;

    return (
      <GameShell title="Would You Rather" subtitle="The results">
        <div className="safe-x safe-bottom mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 overflow-y-auto pb-6">
          <ResultColumn
            label={dilemma.a}
            voters={forA}
            total={total}
            className="from-sky-400 to-blue-600"
          />
          <ResultColumn
            label={dilemma.b}
            voters={forB}
            total={total}
            className="from-fuchsia-500 to-purple-700"
          />

          {unanimous && (
            <p className="animate-pop text-center text-xl font-semibold text-emerald-300">
              Everyone agreed! 🎉
            </p>
          )}
          {loner && (
            <p className="animate-pop text-center text-xl font-semibold text-amber-300">
              {loner.name} stood alone 😅
            </p>
          )}

          <div className="mt-auto flex flex-col gap-3 pt-2">
            <Button block onClick={nextQuestion}>
              Next question
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

  const voting = phase === "vote";
  const currentPlayer = players[voteIndex];

  return (
    <GameShell
      title="Would You Rather"
      subtitle={
        voting ? `${currentPlayer?.name}'s turn` : `Question ${played + 1}`
      }
    >
      <div className="safe-x safe-bottom mx-auto flex w-full max-w-lg flex-1 flex-col gap-3 pb-6">
        <OptionPanel
          text={dilemma.a}
          className="from-sky-400 to-blue-600"
          onClick={voting ? () => castVote("a") : undefined}
        />
        <div className="text-muted text-center text-sm font-semibold tracking-widest">
          OR
        </div>
        <OptionPanel
          text={dilemma.b}
          className="from-fuchsia-500 to-purple-700"
          onClick={voting ? () => castVote("b") : undefined}
        />

        <div className="mt-auto flex flex-col gap-3 pt-3">
          {voting ? (
            <p className="text-muted text-center text-sm">
              Tap the one you&apos;d pick — nobody else is looking.
            </p>
          ) : votingEnabled ? (
            <>
              <Button block onClick={() => setPhase("pass")}>
                Everyone vote secretly
              </Button>
              <Button variant="ghost" size="md" block onClick={nextQuestion}>
                Skip to the next one
              </Button>
            </>
          ) : (
            <>
              <Button block onClick={nextQuestion}>
                Next question
              </Button>
              <AddPlayersPrompt />
            </>
          )}
        </div>
      </div>
    </GameShell>
  );
}

function OptionPanel({
  text,
  className,
  onClick,
}: {
  text: string;
  className: string;
  onClick?: () => void;
}) {
  const Element = onClick ? "button" : "div";
  return (
    <Element
      onClick={onClick}
      className={cn(
        "rounded-card flex flex-1 items-center justify-center bg-gradient-to-br p-6 text-center shadow-lg shadow-black/40",
        onClick && "transition active:scale-[0.97]",
        className,
      )}
    >
      <span className="text-2xl leading-tight font-bold text-white text-balance drop-shadow">
        {text}
      </span>
    </Element>
  );
}

function ResultColumn({
  label,
  voters,
  total,
  className,
}: {
  label: string;
  voters: Player[];
  total: number;
  className: string;
}) {
  const percent = total > 0 ? Math.round((voters.length / total) * 100) : 0;
  return (
    <div className="bg-surface-2 border-line overflow-hidden rounded-2xl border">
      <div className={cn("bg-gradient-to-br p-4", className)}>
        <p className="text-lg leading-tight font-bold text-white text-balance">
          {label}
        </p>
      </div>
      <div className="p-4">
        <div className="mb-3 flex items-baseline gap-2">
          <span className="text-3xl font-bold">{voters.length}</span>
          <span className="text-muted text-sm">
            {voters.length === 1 ? "vote" : "votes"} · {percent}%
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {voters.map((player) => (
            <span
              key={player.id}
              className="bg-night/60 flex items-center gap-2 rounded-full py-1 pr-3 pl-1"
            >
              <PlayerAvatar player={player} size={26} />
              <span className="text-sm">{player.name}</span>
            </span>
          ))}
          {voters.length === 0 && (
            <span className="text-muted text-sm">Nobody picked this one</span>
          )}
        </div>
      </div>
    </div>
  );
}

/** Shown when there aren't enough saved players to run a secret vote. */
function AddPlayersPrompt() {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-surface-2 border-line rounded-2xl border p-4">
      {open ? (
        <PlayerManager autoFocus />
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="text-muted w-full text-left text-sm"
        >
          Add players to vote secretly and see who picked what →
        </button>
      )}
    </div>
  );
}
