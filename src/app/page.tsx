"use client";

import { useState, useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import AIRecipeGenerator from "@/components/AIRecipeGenerator";
import OnboardingWizard from "@/components/OnboardingWizard";
import Recap from "@/components/Recap";
import Toast from "@/components/Toast";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import SplashScreen from "@/components/SplashScreen";
import { useStore } from "@/store/useStore";

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
  const recapOpen = useStore((state) => state.recapPhase !== "closed");

  if (!hasHydrated) {
    return <SplashScreen />;
  }

  // Both branches keep the Recap at the same position so it survives the
  // switch from the wizard to the meal plan, which happens behind it.
  const recap = <Recap onFinish={() => setActiveTab("generate")} />;

  if (!hasCompletedOnboarding) {
    return (
      <>
        <div className="relative z-10 min-h-screen" inert={recapOpen}>
          <main className="container py-12">
            <OnboardingWizard onFinish={() => setActiveTab("generate")} />
          </main>
          <Toast />
        </div>
        {recap}
      </>
    );
  }

  return (
    <>
      <div className="relative z-10 min-h-screen" inert={recapOpen}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
      {recap}
    </>
  );
}
