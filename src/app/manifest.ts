import type { MetadataRoute } from "next";
import {
  APP_DESCRIPTION,
  APP_NAME,
  APP_SHORT_NAME,
  APP_THEME_COLOR,
} from "@/lib/app-config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_SHORT_NAME,
    description: APP_DESCRIPTION,
    start_url: "/",
    // `fullscreen` would hide the clock and battery too, which parents hate.
    display: "standalone",
    orientation: "portrait",
    background_color: APP_THEME_COLOR,
    theme_color: APP_THEME_COLOR,
    categories: ["games", "entertainment"],
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
