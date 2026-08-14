"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { InstallHint } from "@/components/InstallHint";
import { SettingsSheet } from "@/components/SettingsSheet";
import { APP_NAME, APP_TAGLINE } from "@/lib/app-config";
import { GAMES } from "@/lib/games";
import { haptics } from "@/lib/haptics";
import { setSoundEnabled, sfx } from "@/lib/sound";
import { useAppState } from "@/lib/state";
import { TIERS } from "@/lib/types";

export default function Home() {
  const { tier, players, soundOn, hydrated } = useAppState();
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => setSoundEnabled(soundOn), [soundOn]);

  const tierLabel = TIERS.find((option) => option.id === tier)?.label ?? "";

  return (
    <main className="safe-x safe-top safe-bottom mx-auto flex w-full max-w-lg flex-col pb-8">
      <header className="mb-6 flex items-start gap-3">
        <div className="flex-1">
          <h1 className="text-4xl leading-tight font-bold">{APP_NAME}</h1>
          <p className="text-muted mt-1 text-sm">{APP_TAGLINE}</p>
        </div>
        <button
          onClick={() => {
            haptics.tap();
            // First real tap of the session — a good moment to unlock audio,
            // which iOS only permits from inside a user gesture.
            sfx.unlock();
            setSettingsOpen(true);
          }}
          aria-label="Settings"
          className="bg-surface-2 border-line flex size-12 shrink-0 items-center justify-center rounded-full border text-xl active:scale-95"
        >
          ⚙️
        </button>
      </header>

      <button
        onClick={() => {
          haptics.tap();
          sfx.unlock();
          setSettingsOpen(true);
        }}
        className="border-line bg-surface/60 text-muted mb-5 flex items-center gap-2 self-start rounded-full border px-4 py-2 text-sm active:scale-95"
      >
        <span className="text-cream font-semibold">{tierLabel}</span>
        <span aria-hidden>·</span>
        <span>
          {hydrated
            ? players.length === 0
              ? "no players yet"
              : `${players.length} player${players.length === 1 ? "" : "s"}`
            : "…"}
        </span>
      </button>

      <div className="grid grid-cols-2 gap-3">
        {GAMES.map((game) => (
          <Link
            key={game.id}
            href={game.href}
            onClick={() => {
              haptics.tap();
              sfx.unlock();
            }}
            className={`rounded-tile flex min-h-44 flex-col justify-between bg-gradient-to-br p-4 text-left shadow-lg shadow-black/40 transition active:scale-95 ${game.gradient}`}
          >
            <span className="text-4xl drop-shadow">{game.emoji}</span>
            <span>
              <span className="block text-lg leading-tight font-bold text-white drop-shadow">
                {game.name}
              </span>
              <span className="mt-1 block text-xs leading-snug text-white/85">
                {game.tagline}
              </span>
            </span>
            <span className="text-[0.7rem] font-semibold text-white/80">
              {game.players} players · {game.minutes}
            </span>
          </Link>
        ))}
      </div>

      <InstallHint />

      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </main>
  );
}
