"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { ChefHat, Heart, Settings, Sparkles, Utensils } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FoodPreferences from "@/components/FoodPreferences";
import KnownRecipes from "@/components/KnownRecipes";
import NutritionSettings from "@/components/NutritionSettings";
import AIRecipeGenerator from "@/components/AIRecipeGenerator";
import Toast from "@/components/Toast";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";

const HeroScene = dynamic(() => import("@/components/HeroScene"), {
  ssr: false,
});

export default function Home() {
  const [activeTab, setActiveTab] = useState("preferences");

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/50">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary">
              <Utensils className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">RecipeBook</span>
          </div>
          <nav className="flex items-center gap-4"></nav>
        </div>
      </header>

      <main className="container py-8">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <HeroScene />
          <div className="text-center mt-2">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Your Personal AI Meal Planner
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Enter your preferences, save your favorite recipes, and let AI
              generate personalized meal plans tailored to your nutrition goals.
            </p>
          </div>
        </motion.div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 mb-8">
            <TabsTrigger
              value="preferences"
              className="flex items-center gap-2"
            >
              <ChefHat className="h-4 w-4" />
              <span className="hidden sm:inline">Preferences</span>
            </TabsTrigger>
            <TabsTrigger value="recipes" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              <span className="hidden sm:inline">Recipes</span>
            </TabsTrigger>
            <TabsTrigger value="nutrition" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Nutrition</span>
            </TabsTrigger>
            <TabsTrigger value="generate" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Generate</span>
            </TabsTrigger>
          </TabsList>

          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <TabsContent value="preferences">
              <FoodPreferences />
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
        </Tabs>
      </main>

      {/* Floating illustrations */}
      <motion.div
        className="fixed bottom-10 left-10 w-16 h-16 opacity-10 pointer-events-none z-0"
        animate={{ y: [0, -10, 0], rotate: [0, 5, -5, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="w-full h-full bg-gradient-to-br from-primary to-secondary rounded-full" />
      </motion.div>
      <motion.div
        className="fixed top-20 right-20 w-12 h-12 opacity-10 pointer-events-none z-0"
        animate={{ y: [0, 10, 0], rotate: [0, -5, 5, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="w-full h-full bg-gradient-to-br from-accent to-primary rounded-full" />
      </motion.div>

      {/* Toast Notifications */}
      <Toast />
      <PWAInstallPrompt />
    </div>
  );
}
