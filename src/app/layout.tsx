import type { Metadata, Viewport } from "next";
import { Cal_Sans } from "next/font/google";
import FoodBackground from "@/components/FoodBackground";
import MeshGradient from "@/components/MeshGradient";
import "./globals.css";

const calSans = Cal_Sans({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-cal-sans",
});

export const metadata: Metadata = {
  title: "RecipeBook - Your AI Meal Planner",
  description:
    "A PWA that lets you enter your nutrition preferences and leverages AI to generate personalized recipes and meal plans",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "RecipeBook",
  },
  icons: {
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
      {
        url: "/icons/apple-touch-icon-167x167.png",
        sizes: "167x167",
        type: "image/png",
      },
    ],
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#f06f19",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Browser extensions (e.g. LanguageTool's data-lt-installed) add attributes
    // to <html> before React hydrates; this only silences that one element.
    <html lang="en" suppressHydrationWarning>
      <body className={`${calSans.variable} ${calSans.className} antialiased`}>
        {/* Same matte mesh as the Recap, behind everything (the food shapes
            come after it in DOM order, so they stay on top). */}
        <div className="pointer-events-none fixed inset-0 z-0 opacity-45">
          <MeshGradient />
        </div>
        <FoodBackground />
        {children}
      </body>
    </html>
  );
}
