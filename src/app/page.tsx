'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChefHat, Heart, Settings, Sparkles, TrendingUp, Calendar, Utensils } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import FoodPreferences from '@/components/FoodPreferences'
import KnownRecipes from '@/components/KnownRecipes'
import NutritionSettings from '@/components/NutritionSettings'
import AIRecipeGenerator from '@/components/AIRecipeGenerator'
import Toast from '@/components/Toast'
import PWAInstallPrompt from '@/components/PWAInstallPrompt'

export default function Home() {
  const [activeTab, setActiveTab] = useState('preferences')

  const features = [
    {
      icon: <ChefHat className="h-6 w-6" />,
      title: 'Food Preferences',
      description: 'Tell us what you love and hate',
      tab: 'preferences'
    },
    {
      icon: <Heart className="h-6 w-6" />,
      title: 'Known Recipes',
      description: 'Save your favorite recipes',
      tab: 'recipes'
    },
    {
      icon: <Settings className="h-6 w-6" />,
      title: 'Nutrition Settings',
      description: 'Set your calorie and macro goals',
      tab: 'nutrition'
    },
    {
      icon: <Sparkles className="h-6 w-6" />,
      title: 'AI Generation',
      description: 'Generate personalized meal plans',
      tab: 'generate'
    }
  ]

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
          <nav className="flex items-center gap-4">
            <Button variant="ghost" size="sm" className="hidden md:flex">
              <TrendingUp className="h-4 w-4 mr-2" />
              Analytics
            </Button>
            <Button variant="ghost" size="sm" className="hidden md:flex">
              <Calendar className="h-4 w-4 mr-2" />
              Calendar
            </Button>
          </nav>
        </div>
      </header>

      <main className="container py-8">
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <motion.div 
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary mb-6"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <Sparkles className="h-10 w-10 text-primary-foreground" />
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Your Personal AI Meal Planner
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Enter your preferences, save your favorite recipes, and let AI generate personalized meal plans tailored to your nutrition goals.
          </p>
        </motion.div>

        {/* Feature Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
        >
          {features.map((feature, index) => (
            <Card 
              key={feature.tab}
              className="cursor-pointer hover:shadow-lg transition-shadow duration-300 group"
              onClick={() => setActiveTab(feature.tab)}
            >
              <CardHeader>
                <motion.div 
                  className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {feature.icon}
                </motion.div>
                <CardTitle className="text-center">{feature.title}</CardTitle>
                <CardDescription className="text-center">{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </motion.div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 mb-8">
            <TabsTrigger value="preferences" className="flex items-center gap-2">
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
  )
}
