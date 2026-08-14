"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { usePersistentState } from "@/lib/hooks/usePersistentState";
import type { Tier } from "@/lib/types";

export type Player = {
  id: string;
  name: string;
  /** Index into PLAYER_COLORS — stored as a number so the palette can change. */
  color: number;
};

/** Avatar colours, deliberately far apart so young kids can tell them apart. */
export const PLAYER_COLORS = [
  "#fb7185",
  "#fbbf24",
  "#34d399",
  "#38bdf8",
  "#c084fc",
  "#f472b6",
  "#a3e635",
  "#fb923c",
];

export function colorOf(player: Player): string {
  return PLAYER_COLORS[player.color % PLAYER_COLORS.length];
}

type AppState = {
  players: Player[];
  tier: Tier;
  soundOn: boolean;
  hydrated: boolean;
  addPlayer: (name: string) => void;
  removePlayer: (id: string) => void;
  renamePlayer: (id: string, name: string) => void;
  clearPlayers: () => void;
  setTier: (tier: Tier) => void;
  setSoundOn: (on: boolean) => void;
};

const AppStateContext = createContext<AppState | null>(null);

const PLAYERS_KEY = "partybox.players.v1";
const TIER_KEY = "partybox.tier.v1";
const SOUND_KEY = "partybox.sound.v1";

function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [players, setPlayers, playersHydrated] = usePersistentState<Player[]>(
    PLAYERS_KEY,
    [],
  );
  const [tier, setTier, tierHydrated] = usePersistentState<Tier>(
    TIER_KEY,
    "family",
  );
  const [soundOn, setSoundOn] = usePersistentState<boolean>(SOUND_KEY, true);

  const addPlayer = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      setPlayers((current) => [
        ...current,
        { id: makeId(), name: trimmed.slice(0, 14), color: current.length },
      ]);
    },
    [setPlayers],
  );

  const removePlayer = useCallback(
    (id: string) => {
      setPlayers((current) => current.filter((p) => p.id !== id));
    },
    [setPlayers],
  );

  const renamePlayer = useCallback(
    (id: string, name: string) => {
      setPlayers((current) =>
        current.map((p) =>
          p.id === id ? { ...p, name: name.trim().slice(0, 14) } : p,
        ),
      );
    },
    [setPlayers],
  );

  const clearPlayers = useCallback(() => setPlayers([]), [setPlayers]);

  const value = useMemo<AppState>(
    () => ({
      players,
      tier,
      soundOn,
      hydrated: playersHydrated && tierHydrated,
      addPlayer,
      removePlayer,
      renamePlayer,
      clearPlayers,
      setTier,
      setSoundOn,
    }),
    [
      players,
      tier,
      soundOn,
      playersHydrated,
      tierHydrated,
      addPlayer,
      removePlayer,
      renamePlayer,
      clearPlayers,
      setTier,
      setSoundOn,
    ],
  );

  return (
    <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
  );
}

export function useAppState(): AppState {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error("useAppState must be used inside <AppStateProvider>");
  }
  return context;
}
