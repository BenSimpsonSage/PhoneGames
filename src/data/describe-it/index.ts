import type { DeckCategory, TabooCard } from "@/lib/types";
import { ACTIONS } from "./actions";
import { ANIMALS } from "./animals";
import { AROUND_THE_HOUSE } from "./around-the-house";
import { BOOKS_AND_STORIES } from "./books-and-stories";
import { CHARACTERS } from "./characters";
import { CHRISTMAS } from "./christmas";
import { CLOTHES } from "./clothes";
import { FAMOUS_FACES } from "./famous-faces";
import { FEELINGS } from "./feelings";
import { FOOD } from "./food";
import { FRIENDS } from "./friends";
import { JOBS } from "./jobs";
import { MOVIES_AND_TV } from "./movies-and-tv";
import { MUSIC } from "./music";
import { NATURE } from "./nature";
import { OUT_AND_ABOUT } from "./out-and-about";
import { SPACE_AND_SCIENCE } from "./space-and-science";
import { SPOOKY } from "./spooky";
import { SPORTS } from "./sports";
import { SUPERHEROES } from "./superheroes";
import { THINGS_THAT_GO } from "./things-that-go";
import { TOYS_AND_GAMES } from "./toys-and-games";
import { VIDEO_GAMES } from "./video-games";
import { WORLD } from "./world";

/**
 * Describe It packs. They start from the Heads Up packs but are their own
 * copies, because every card here also carries the four words the describer
 * isn't allowed to say — and those are the first words anyone would reach for.
 */
export const DESCRIBE_IT_CATEGORIES: DeckCategory<TabooCard>[] = [
  ANIMALS,
  FOOD,
  ACTIONS,
  CHARACTERS,
  AROUND_THE_HOUSE,
  OUT_AND_ABOUT,
  FAMOUS_FACES,
  MOVIES_AND_TV,
  BOOKS_AND_STORIES,
  MUSIC,
  SPORTS,
  JOBS,
  THINGS_THAT_GO,
  NATURE,
  SPACE_AND_SCIENCE,
  TOYS_AND_GAMES,
  CLOTHES,
  VIDEO_GAMES,
  SUPERHEROES,
  CHRISTMAS,
  SPOOKY,
  WORLD,
  FEELINGS,
  FRIENDS,
];
