"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/Button";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { haptics } from "@/lib/haptics";
import { useAppState } from "@/lib/state";

const MAX_PLAYERS = 12;

/**
 * Add and remove the people in the room. Shared between the settings sheet and
 * the "you need players first" prompt inside the games that tally by person.
 */
export function PlayerManager({ autoFocus = false }: { autoFocus?: boolean }) {
  const { players, addPlayer, removePlayer } = useAppState();
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const full = players.length >= MAX_PLAYERS;

  const submit = () => {
    if (!draft.trim() || full) return;
    addPlayer(draft);
    haptics.correct();
    setDraft("");
    // Keep the keyboard up so a whole family can be typed in one go.
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex gap-2"
      >
        <input
          ref={inputRef}
          autoFocus={autoFocus}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={full ? "That's plenty of players!" : "Add a name…"}
          maxLength={14}
          disabled={full}
          enterKeyHint="done"
          autoCapitalize="words"
          autoCorrect="off"
          className="bg-surface-2 border-line placeholder:text-muted/70 min-h-13 flex-1 rounded-2xl border px-4 text-lg outline-none focus:border-fuchsia-400 disabled:opacity-50"
        />
        <Button type="submit" size="md" disabled={!draft.trim() || full}>
          Add
        </Button>
      </form>

      {players.length === 0 ? (
        <p className="text-muted text-sm">
          No players yet. Add everyone who&apos;s playing and the games can keep
          score.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {players.map((player) => (
            <li
              key={player.id}
              className="bg-surface-2 border-line flex items-center gap-3 rounded-2xl border p-2 pr-3"
            >
              <PlayerAvatar player={player} />
              <span className="flex-1 truncate text-lg">{player.name}</span>
              <button
                onClick={() => {
                  haptics.skip();
                  removePlayer(player.id);
                }}
                aria-label={`Remove ${player.name}`}
                className="text-muted flex size-9 items-center justify-center rounded-full active:scale-90"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
