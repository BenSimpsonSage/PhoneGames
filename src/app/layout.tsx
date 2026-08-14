import type { Metadata, Viewport } from "next";
import { Fredoka } from "next/font/google";
import {
  APP_DESCRIPTION,
  APP_NAME,
  APP_SHORT_NAME,
  APP_THEME_COLOR,
} from "@/lib/app-config";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import { AppStateProvider } from "@/lib/state";
import "./globals.css";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  // Makes "Add to Home Screen" on iOS launch fullscreen with no Safari chrome.
  appleWebApp: {
    capable: true,
    title: APP_SHORT_NAME,
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // A pinch-zoom mid-game is always an accident, never a request.
  maximumScale: 1,
  userScalable: false,
  themeColor: APP_THEME_COLOR,
  colorScheme: "dark",
  // Let the layout keep its full height when a keyboard appears.
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fredoka.variable} h-full antialiased`}>
      <body className="bg-night text-cream min-h-full">
        <AppStateProvider>{children}</AppStateProvider>
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
