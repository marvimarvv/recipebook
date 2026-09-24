"use client";

import { useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { RotateCcw, Sparkles, Utensils } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import AIRecipeGenerator from "@/components/AIRecipeGenerator";
import OnboardingWizard from "@/components/OnboardingWizard";
import Toast from "@/components/Toast";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import SplashScreen from "@/components/SplashScreen";
import { useStore } from "@/store/useStore";

const HeroScene = dynamic(() => import("@/components/HeroScene"), {
  ssr: false,
});

// The persisted onboarding flag rehydrates from localStorage *after* the
// first client render, so we wait for hydration before deciding whether to
// show the wizard - otherwise returning users would see a flash of it.
// `useStore.persist` only exists in a browser (zustand skips attaching it
// when `localStorage` is unavailable, e.g. during Next.js server
// prerendering), and the server snapshot always reports "not hydrated yet"
// so client/server markup matches on the initial render.
function subscribeToHydration(onStoreChange: () => void) {
  const persistApi = useStore.persist;
  if (!persistApi) return () => {};
  return persistApi.onFinishHydration(onStoreChange);
}

function getHasHydrated() {
  return useStore.persist?.hasHydrated() ?? true;
}

function getHasHydratedServerSnapshot() {
  return false;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState("generate");
  const hasHydrated = useSyncExternalStore(
    subscribeToHydration,
    getHasHydrated,
    getHasHydratedServerSnapshot,
  );
  const hasCompletedOnboarding = useStore(
    (state) => state.hasCompletedOnboarding,
  );
  const restartOnboarding = useStore((state) => state.restartOnboarding);

  if (!hasHydrated) {
    return <SplashScreen />;
  }

  if (!hasCompletedOnboarding) {
    return (
      <div className="min-h-screen bg-linear-to-br from-background to-muted/50">
        <main className="container py-12">
          <OnboardingWizard onFinish={() => setActiveTab("generate")} />
        </main>
        <Toast />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-background to-muted/50">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Header */}
        <header className="sticky top-5 z-50 mx-auto w-[clamp(300px,90vw,1200px)] border bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/60">
          <div className="container flex h-16 items-center gap-6">
            <div className="hidden items-center gap-2 sm:flex">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-primary to-secondary">
                <Utensils className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">RecipeBook</span>
            </div>
            <nav className="flex flex-1 items-center">
              <TabsList className="flex w-full bg-transparent p-0">
                <TabsTrigger
                  value="generate"
                  className="flex flex-1 items-center justify-center gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>My Meal Plan</span>
                </TabsTrigger>
              </TabsList>
            </nav>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="shrink-0">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Restart setup</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Restart the setup wizard?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This walks you through Preferences and Nutrition again
                    and generates a new week when you finish. Your existing
                    meal plans won&apos;t be deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => restartOnboarding()}>
                    Restart
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </header>

        <div className="-mt-21">
          <HeroScene />
        </div>

        <main className="container py-8">
          {/* Main Content Tabs */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <TabsContent value="generate">
              <AIRecipeGenerator />
            </TabsContent>
          </motion.div>
        </main>
      </Tabs>

      {/* Floating illustrations */}
      <motion.div
        className="pointer-events-none fixed bottom-10 left-10 z-0 h-16 w-16 opacity-10"
        animate={{ y: [0, -10, 0], rotate: [0, 5, -5, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="h-full w-full rounded-full bg-linear-to-br from-primary to-secondary" />
      </motion.div>
      <motion.div
        className="pointer-events-none fixed top-20 right-20 z-0 h-12 w-12 opacity-10"
        animate={{ y: [0, 10, 0], rotate: [0, -5, 5, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="h-full w-full rounded-full bg-linear-to-br from-accent to-primary" />
      </motion.div>

      {/* Toast Notifications */}
      <Toast />
      <PWAInstallPrompt />
    </div>
  );
}
