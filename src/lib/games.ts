/**
 * The home screen grid. Adding a game means adding an entry here and a route
 * folder under `src/app/` with the matching id.
 *
 * Gradient classes are written out in full rather than composed from a colour
 * name — Tailwind scans source text, so a class built at runtime never makes
 * it into the stylesheet.
 */
export type GameDef = {
  id: string;
  href: string;
  name: string;
  tagline: string;
  emoji: string;
  players: string;
  minutes: string;
  gradient: string;
};

export const GAMES: GameDef[] = [
  {
    id: "heads-up",
    href: "/heads-up",
    name: "Heads Up",
    tagline: "Phone on your forehead. Guess the word.",
    emoji: "🙈",
    players: "3+",
    minutes: "3 min",
    gradient: "from-amber-400 to-orange-600",
  },
  {
    id: "imposter",
    href: "/imposter",
    name: "Imposter",
    tagline: "Everyone knows the word. Except one.",
    emoji: "🕵️",
    players: "4+",
    minutes: "10 min",
    gradient: "from-rose-500 to-red-700",
  },
  {
    id: "would-you-rather",
    href: "/would-you-rather",
    name: "Would You Rather",
    tagline: "Two options. Everyone picks.",
    emoji: "⚖️",
    players: "2+",
    minutes: "5 min",
    gradient: "from-sky-400 to-blue-600",
  },
  {
    id: "most-likely-to",
    href: "/most-likely-to",
    name: "Most Likely To",
    tagline: "Read it out, then point.",
    emoji: "👉",
    players: "3+",
    minutes: "10 min",
    gradient: "from-violet-500 to-purple-700",
  },
  {
    id: "categories",
    href: "/categories",
    name: "Categories",
    tagline: "A letter, a topic, and a ticking clock.",
    emoji: "⏱️",
    players: "2+",
    minutes: "5 min",
    gradient: "from-emerald-400 to-green-600",
  },
  {
    id: "doodle-dash",
    href: "/doodle-dash",
    name: "Doodle Dash",
    tagline: "Draw it before the time runs out.",
    emoji: "🎨",
    players: "3+",
    minutes: "10 min",
    gradient: "from-pink-500 to-fuchsia-700",
  },
];
