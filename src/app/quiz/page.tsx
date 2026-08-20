"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { GameShell } from "@/components/GameShell";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { PlayerManager } from "@/components/PlayerManager";
import { QUIZ_QUESTIONS, type Question } from "@/data/quiz";
import { cn } from "@/lib/cn";
import { haptics } from "@/lib/haptics";
import { usePersistentState } from "@/lib/hooks/usePersistentState";
import { Dealer, shuffle } from "@/lib/shuffle";
import { sfx } from "@/lib/sound";
import { useAppState } from "@/lib/state";
import { tiersFor } from "@/lib/types";

type Phase = "setup" | "pass" | "ask" | "answered" | "done";

/** A question with its options already shuffled for this particular asking. */
type Asked = { question: Question; options: string[] };

const ROUND_LENGTHS = [3, 5, 10];

/** Stands in for a player when nobody has been added — quizzing alone is fine. */
const SOLO = { id: "solo", name: "You" };

export default function QuizPage() {
  const { tier, players, hydrated } = useAppState();

  const [phase, setPhase] = useState<Phase>("setup");
  const [perPlayer, setPerPlayer] = usePersistentState(
    "partybox.quiz.perplayer.v1",
    5,
  );
  const [asked, setAsked] = useState<Asked | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [askedCount, setAskedCount] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({});

  const dealerRef = useRef<Dealer<Question> | null>(null);

  const pool = useMemo(() => {
    const allowed = new Set(tiersFor(tier));
    return QUIZ_QUESTIONS.filter((question) => allowed.has(question.tier));
  }, [tier]);

  // The turn order is the saved players, or a single stand-in when there are
  // none, so the whole game below never has to special-case playing solo.
  const order = players.length > 0 ? players : [SOLO];
  const solo = players.length === 0;
  const total = perPlayer * order.length;
  const current = order[askedCount % order.length];
  const round = Math.floor(askedCount / order.length) + 1;

  const draw = useCallback(() => {
    const question = dealerRef.current?.next() ?? null;
    setAsked(
      question ? { question, options: shuffle(question.options) } : null,
    );
    setPicked(null);
  }, []);

  const start = useCallback(() => {
    dealerRef.current = new Dealer(pool);
    setScores({});
    setAskedCount(0);
    draw();
    sfx.unlock();
    setPhase(players.length > 1 ? "pass" : "ask");
  }, [draw, players.length, pool]);

  const answer = (option: string) => {
    if (!asked || picked) return;
    const correct = option === asked.question.options[0];
    setPicked(option);
    if (correct) {
      haptics.correct();
      sfx.correct();
      setScores((s) => ({ ...s, [current.id]: (s[current.id] ?? 0) + 1 }));
    } else {
      haptics.skip();
      sfx.skip();
    }
    setPhase("answered");
  };

  const next = () => {
    if (askedCount + 1 >= total) {
      haptics.reveal();
      sfx.fanfare();
      setPhase("done");
      return;
    }
    setAskedCount((n) => n + 1);
    draw();
    setPhase(players.length > 1 ? "pass" : "ask");
  };

  if (!hydrated) {
    return (
      <GameShell title="Quiz Night">
        <div className="flex flex-1 items-center justify-center">
          <p className="text-muted">Shuffling…</p>
        </div>
      </GameShell>
    );
  }

  if (phase === "setup") {
    return (
      <GameShell title="Quiz Night" subtitle="Four answers. One is right.">
        <div className="safe-x safe-bottom mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 overflow-y-auto pb-6">
          <div className="bg-surface-2 border-line rounded-2xl border p-5">
            <h2 className="mb-2 font-semibold">How it works</h2>
            <p className="text-muted text-sm leading-relaxed">
              The phone goes round the room. Everyone gets the same number of
              questions, one at a time — tap an answer and find out straight
              away. Most right answers at the end wins.
            </p>
          </div>

          <section>
            <h2 className="text-muted mb-3 text-sm font-semibold tracking-wide uppercase">
              Questions each
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {ROUND_LENGTHS.map((count) => (
                <button
                  key={count}
                  onClick={() => {
                    haptics.tap();
                    setPerPlayer(count);
                  }}
                  aria-pressed={count === perPlayer}
                  className={cn(
                    "min-h-14 rounded-2xl border text-lg font-semibold active:scale-95",
                    count === perPlayer
                      ? "border-fuchsia-400 bg-fuchsia-500/20"
                      : "border-line bg-surface-2",
                  )}
                >
                  {count}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-muted mb-3 text-sm font-semibold tracking-wide uppercase">
              Who&apos;s playing
            </h2>
            <div className="bg-surface-2 border-line rounded-2xl border p-4">
              {solo ? (
                <>
                  <p className="text-muted mb-3 text-sm">
                    No players added — you can play on your own, or add everyone
                    to keep score.
                  </p>
                  <PlayerManager />
                </>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {players.map((player) => (
                    <span
                      key={player.id}
                      className="bg-night/60 flex items-center gap-2 rounded-full py-1 pr-3 pl-1"
                    >
                      <PlayerAvatar player={player} size={26} />
                      <span className="text-sm">{player.name}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>

          <div className="mt-auto flex flex-col gap-3 pt-2">
            <Button block onClick={start} disabled={pool.length === 0}>
              Start the quiz
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

  if (phase === "done") {
    // `player` is null when playing solo, which is the one case with nobody to
    // draw an avatar for.
    const table = (
      solo
        ? [{ id: SOLO.id, name: SOLO.name, player: null, score: scores[SOLO.id] ?? 0 }]
        : players.map((p) => ({
            id: p.id,
            name: p.name,
            player: p,
            score: scores[p.id] ?? 0,
          }))
    ).sort((a, b) => b.score - a.score);
    const top = table[0]?.score ?? 0;
    const winners = table.filter((row) => row.score === top && top > 0);

    return (
      <GameShell title="Quiz Night" subtitle="Final scores">
        <div className="safe-x safe-bottom mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 overflow-y-auto pb-6">
          <p className="animate-pop text-center text-2xl font-bold text-balance">
            {winners.length === 0
              ? "Nobody got a single one 😬"
              : winners.length === 1
                ? `${winners[0].name} wins! 🏆`
                : `It's a tie! ${winners.map((w) => w.name).join(" & ")} 🏆`}
          </p>

          <ul className="flex flex-col gap-2">
            {table.map((row, index) => (
              <li
                key={row.id}
                className={cn(
                  "bg-surface-2 border-line flex items-center gap-3 rounded-2xl border p-3",
                  row.score === top && top > 0 && "border-amber-400/60",
                )}
              >
                <span className="text-muted w-6 text-center font-semibold">
                  {index + 1}
                </span>
                {row.player && <PlayerAvatar player={row.player} size={34} />}
                <span className="flex-1 truncate font-semibold">
                  {row.name}
                </span>
                <span className="text-lg font-bold">
                  {row.score}
                  <span className="text-muted text-sm font-normal">
                    /{perPlayer}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-auto flex flex-col gap-3 pt-2">
            <Button block onClick={start}>
              Play again
            </Button>
            <Button
              variant="solid"
              size="md"
              block
              onClick={() => setPhase("setup")}
            >
              Change the settings
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

  if (phase === "pass") {
    return (
      <GameShell title="Quiz Night" bare>
        <div className="safe-x flex flex-1 flex-col items-center justify-center gap-6 px-6">
          <p className="text-muted text-lg">Pass the phone to</p>
          <p className="text-5xl font-bold text-balance">{current.name}</p>
          <p className="text-muted text-center">
            Question {askedCount + 1} of {total} · round {round}
          </p>
          <Button block onClick={() => setPhase("ask")}>
            I&apos;m ready
          </Button>
        </div>
      </GameShell>
    );
  }

  if (!asked) {
    return (
      <GameShell title="Quiz Night">
        <div className="flex flex-1 items-center justify-center">
          <p className="text-muted">Out of questions — try another tier.</p>
        </div>
      </GameShell>
    );
  }

  const answered = phase === "answered";
  const correctAnswer = asked.question.options[0];
  const gotIt = picked === correctAnswer;

  return (
    <GameShell
      title="Quiz Night"
      subtitle={`${current.name} · question ${askedCount + 1} of ${total}`}
    >
      <div className="safe-x safe-bottom mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 pb-6">
        <div className="flex flex-col items-center gap-3 pt-2">
          <span className="bg-surface-2 border-line text-muted rounded-full border px-3 py-1 text-xs font-semibold tracking-wide uppercase">
            {asked.question.topic}
          </span>
          <p className="text-center text-2xl leading-tight font-bold text-balance">
            {asked.question.text}
          </p>
        </div>

        <div className="flex flex-1 flex-col justify-center gap-3">
          {asked.options.map((option) => {
            const isCorrect = option === correctAnswer;
            const isPicked = option === picked;
            return (
              <button
                key={option}
                onClick={() => answer(option)}
                disabled={answered}
                className={cn(
                  "min-h-16 rounded-2xl border p-4 text-lg font-semibold transition active:scale-[0.98]",
                  // Once answered, the right answer always lights up green —
                  // being told you were wrong without being told what was right
                  // is the fastest way to start an argument.
                  !answered && "border-line bg-surface-2",
                  answered &&
                    isCorrect &&
                    "border-emerald-400 bg-emerald-500/20 text-emerald-100",
                  answered &&
                    isPicked &&
                    !isCorrect &&
                    "border-rose-400 bg-rose-500/20 text-rose-100",
                  answered &&
                    !isCorrect &&
                    !isPicked &&
                    "border-line bg-surface-2 opacity-50",
                  answered && "disabled:opacity-100",
                )}
              >
                {option}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-3">
          {answered ? (
            <>
              <p
                className={cn(
                  "animate-pop text-center text-xl font-bold",
                  gotIt ? "text-emerald-300" : "text-rose-300",
                )}
              >
                {gotIt ? "Correct! +1 point" : "Not this time"}
              </p>
              <Button block onClick={next}>
                {askedCount + 1 >= total ? "See the scores" : "Next question"}
              </Button>
            </>
          ) : (
            <p className="text-muted text-center text-sm">
              {solo ? "Pick an answer." : "No shouting out the answer."}
            </p>
          )}
        </div>
      </div>
    </GameShell>
  );
}
