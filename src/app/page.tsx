"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import {
  ChefHat,
  Heart,
  RotateCcw,
  Settings,
  Sparkles,
  Utensils,
} from "lucide-react";
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
import FoodPreferences from "@/components/FoodPreferences";
import KnownRecipes from "@/components/KnownRecipes";
import NutritionSettings from "@/components/NutritionSettings";
import AdditionalSettings from "@/components/AdditionalSettings";
import AIRecipeGenerator from "@/components/AIRecipeGenerator";
import OnboardingWizard from "@/components/OnboardingWizard";
import Toast from "@/components/Toast";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import { useStore } from "@/store/useStore";

const HeroScene = dynamic(() => import("@/components/HeroScene"), {
  ssr: false,
});

export default function Home() {
  const [activeTab, setActiveTab] = useState("preferences");
  const [hasHydrated, setHasHydrated] = useState(false);
  const hasCompletedOnboarding = useStore(
    (state) => state.hasCompletedOnboarding,
  );
  const restartOnboarding = useStore((state) => state.restartOnboarding);

  // The persisted onboarding flag rehydrates from localStorage *after* the
  // first client render, so wait for hydration before deciding whether to
  // show the wizard - otherwise returning users would see a flash of it.
  // `useStore.persist` only exists in a browser (zustand skips attaching it
  // when `localStorage` is unavailable, e.g. during Next.js server
  // prerendering), so this must only ever run client-side inside an effect,
  // never during render.
  useEffect(() => {
    const persistApi = useStore.persist;
    if (!persistApi || persistApi.hasHydrated()) {
      setHasHydrated(true);
      return;
    }
    return persistApi.onFinishHydration(() => setHasHydrated(true));
  }, []);

  if (!hasHydrated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/50" />
    );
  }

  if (!hasCompletedOnboarding) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/50">
        <main className="container py-12">
          <OnboardingWizard onFinish={() => setActiveTab("generate")} />
        </main>
        <Toast />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/50">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Header */}
        <header className="sticky top-5 z-50 mx-auto w-[clamp(300px,90vw,1200px)] border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-16 items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary">
                <Utensils className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">RecipeBook</span>
            </div>
            <nav className="flex flex-1 items-center">
              <TabsList className="flex w-full bg-transparent p-0">
                <TabsTrigger
                  value="preferences"
                  className="flex flex-1 items-center justify-center gap-2"
                >
                  <ChefHat className="h-4 w-4" />
                  <span className="hidden sm:inline">Preferences</span>
                </TabsTrigger>
                <TabsTrigger
                  value="recipes"
                  className="flex flex-1 items-center justify-center gap-2"
                >
                  <Heart className="h-4 w-4" />
                  <span className="hidden sm:inline">Recipes</span>
                </TabsTrigger>
                <TabsTrigger
                  value="nutrition"
                  className="flex flex-1 items-center justify-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">Nutrition</span>
                </TabsTrigger>
                <TabsTrigger
                  value="generate"
                  className="flex flex-1 items-center justify-center gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  <span className="hidden sm:inline">Generate</span>
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
                    This walks you through Preferences, Recipes, and Nutrition
                    again and generates a new week when you finish. Your
                    existing saved recipes and meal plans won&apos;t be deleted.
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

        <div className="-mt-[5.25rem]">
          <HeroScene />
        </div>

        <main className="container py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-12"
          >
            <div className="mt-2 text-center">
              <h1 className="mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-4xl font-bold text-transparent md:text-5xl">
                Your Personal AI Meal Planner
              </h1>
              <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
                Enter your preferences, save your favorite recipes, and let AI
                generate personalized meal plans tailored to your nutrition
                goals.
              </p>
            </div>
          </motion.div>

          {/* Main Content Tabs */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <TabsContent value="preferences">
              <div className="space-y-6">
                <FoodPreferences />
                <AdditionalSettings />
              </div>
            </TabsContent>
            <TabsContent value="recipes">
              <KnownRecipes />
            </TabsContent>
            <TabsContent value="nutrition">
              <NutritionSettings />
            </TabsContent>
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
        <div className="h-full w-full rounded-full bg-gradient-to-br from-primary to-secondary" />
      </motion.div>
      <motion.div
        className="pointer-events-none fixed right-20 top-20 z-0 h-12 w-12 opacity-10"
        animate={{ y: [0, 10, 0], rotate: [0, -5, 5, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="h-full w-full rounded-full bg-gradient-to-br from-accent to-primary" />
      </motion.div>

      {/* Toast Notifications */}
      <Toast />
      <PWAInstallPrompt />
    </div>
  );
}
