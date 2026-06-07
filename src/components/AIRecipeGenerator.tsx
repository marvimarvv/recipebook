'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ChefHat, Clock, Users, Flame, Loader2, Check, X, Sun, Moon, Coffee, Cake, Bot, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useStore } from '@/store/useStore'
import { GeneratedRecipe, MealPlan, COOKING_TIME_OPTIONS, DIFFICULTY_OPTIONS } from '@/types'
import { generateMealPlanWithMistral, parseMealPlanResponse, checkMistralAPI } from '@/lib/mistral'

export default function AIRecipeGenerator() {
  const preferences = useStore(state => state.preferences)
  const nutritionSettings = useStore(state => state.nutritionSettings)
  const addMealPlan = useStore(state => state.addMealPlan)
  const addToast = useStore(state => state.addToast)
  
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedMealPlan, setGeneratedMealPlan] = useState<MealPlan | null>(null)
  const [generationOptions, setGenerationOptions] = useState({
    cookingTime: 'medium' as typeof COOKING_TIME_OPTIONS[number],
    difficulty: 'medium' as typeof DIFFICULTY_OPTIONS[number],
    includeAllPreferences: true,
    randomize: false
  })
  const [useMistralAPI, setUseMistralAPI] = useState(true)
  const [apiAvailable, setApiAvailable] = useState<boolean | null>(null)

  // Check Mistral API availability on component mount
  useEffect(() => {
    const checkAPI = async () => {
      try {
        const available = await checkMistralAPI()
        setApiAvailable(available)
      } catch (error) {
        setApiAvailable(false)
      }
    }
    checkAPI()
  }, [])

  // Generate recipes using Mistral AI
  const generateRecipesWithAI = async (): Promise<GeneratedRecipe[]> => {
    try {
      const response = await generateMealPlanWithMistral(preferences, nutritionSettings, generationOptions)
      const mealPlanData = parseMealPlanResponse(response)
      
      if (!mealPlanData) {
        throw new Error('Invalid response format from AI')
      }
      
      // Convert the AI response to our GeneratedRecipe format
      const recipes: GeneratedRecipe[] = []
      
      Object.entries(mealPlanData.meals || {}).forEach(([mealType, mealRecipes]) => {
        if (Array.isArray(mealRecipes)) {
          mealRecipes.forEach((recipe: any) => {
            recipes.push({
              id: `${mealType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              name: recipe.name || 'Untitled Recipe',
              description: recipe.description || '',
              ingredients: recipe.ingredients || [],
              instructions: recipe.instructions || [],
              prepTime: recipe.prepTime || 0,
              cookTime: recipe.cookTime || 0,
              servings: recipe.servings || 1,
              nutrition: recipe.nutrition || {
                calories: 0,
                protein: 0,
                carbs: 0,
                fat: 0
              },
              mealType: mealType as 'breakfast' | 'lunch' | 'dinner' | 'snack',
              tags: recipe.tags || []
            })
          })
        }
      })
      
      return recipes
    } catch (error) {
      console.error('AI generation error:', error)
      addToast({
        title: 'AI Error',
        description: 'Failed to generate with Mistral AI. Falling back to mock data.',
        type: 'error'
      })
      // Fall back to mock data
      return generateMockRecipes()
    }
  }

  // Fallback mock AI generation function
  const generateMockRecipes = async (): Promise<GeneratedRecipe[]> => {
    const mockRecipes: GeneratedRecipe[] = [
      {
        id: `breakfast-${Date.now()}`,
        name: 'Greek Yogurt Parfait',
        description: 'A protein-packed breakfast with layers of yogurt, granola, and fresh berries',
        ingredients: ['1 cup Greek yogurt', '1/2 cup granola', '1/2 cup mixed berries', '1 tbsp honey', '1 tbsp chia seeds'],
        instructions: ['Layer yogurt, granola, and berries in a bowl', 'Drizzle with honey', 'Sprinkle chia seeds on top', 'Serve immediately'],
        prepTime: 5,
        cookTime: 0,
        servings: 1,
        nutrition: {
          calories: Math.round(nutritionSettings.dailyCalories * 0.2),
          protein: Math.round((nutritionSettings.dailyCalories * 0.2 * (nutritionSettings.proteinGoal / 100)) / 4),
          carbs: Math.round((nutritionSettings.dailyCalories * 0.2 * (nutritionSettings.carbGoal / 100)) / 4),
          fat: Math.round((nutritionSettings.dailyCalories * 0.2 * (nutritionSettings.fatGoal / 100)) / 9)
        },
        mealType: 'breakfast',
        tags: ['healthy', 'quick', 'high-protein']
      },
      {
        id: `lunch-${Date.now()}`,
        name: 'Grilled Chicken Quinoa Bowl',
        description: 'A balanced lunch with grilled chicken, quinoa, and fresh vegetables',
        ingredients: ['1 chicken breast', '1/2 cup cooked quinoa', '1/2 cup mixed greens', '1/4 avocado', '1 tbsp olive oil', 'Lemon juice'],
        instructions: ['Grill chicken breast', 'Cook quinoa', 'Chop vegetables', 'Assemble bowl with all ingredients', 'Drizzle with olive oil and lemon juice'],
        prepTime: 15,
        cookTime: 20,
        servings: 1,
        nutrition: {
          calories: Math.round(nutritionSettings.dailyCalories * 0.4),
          protein: Math.round((nutritionSettings.dailyCalories * 0.4 * (nutritionSettings.proteinGoal / 100)) / 4),
          carbs: Math.round((nutritionSettings.dailyCalories * 0.4 * (nutritionSettings.carbGoal / 100)) / 4),
          fat: Math.round((nutritionSettings.dailyCalories * 0.4 * (nutritionSettings.fatGoal / 100)) / 9)
        },
        mealType: 'lunch',
        tags: ['high-protein', 'balanced', 'healthy']
      },
      {
        id: `dinner-${Date.now()}`,
        name: 'Baked Salmon with Sweet Potato',
        description: 'A nutritious dinner with omega-3 rich salmon and fiber-packed sweet potato',
        ingredients: ['1 salmon fillet', '1 medium sweet potato', '1 cup broccoli', '1 tbsp olive oil', 'Salt and pepper'],
        instructions: ['Preheat oven to 400°F', 'Season salmon with salt and pepper', 'Bake salmon and sweet potato for 20 minutes', 'Steam broccoli', 'Serve all together'],
        prepTime: 10,
        cookTime: 25,
        servings: 1,
        nutrition: {
          calories: Math.round(nutritionSettings.dailyCalories * 0.3),
          protein: Math.round((nutritionSettings.dailyCalories * 0.3 * (nutritionSettings.proteinGoal / 100)) / 4),
          carbs: Math.round((nutritionSettings.dailyCalories * 0.3 * (nutritionSettings.carbGoal / 100)) / 4),
          fat: Math.round((nutritionSettings.dailyCalories * 0.3 * (nutritionSettings.fatGoal / 100)) / 9)
        },
        mealType: 'dinner',
        tags: ['omega-3', 'nutritious', 'baked']
      },
      {
        id: `snack-1-${Date.now()}`,
        name: 'Apple with Almond Butter',
        description: 'A simple and healthy snack option',
        ingredients: ['1 medium apple', '2 tbsp almond butter'],
        instructions: ['Slice apple', 'Spread almond butter on apple slices', 'Enjoy'],
        prepTime: 2,
        cookTime: 0,
        servings: 1,
        nutrition: {
          calories: Math.round(nutritionSettings.dailyCalories * 0.05),
          protein: Math.round((nutritionSettings.dailyCalories * 0.05 * (nutritionSettings.proteinGoal / 100)) / 4),
          carbs: Math.round((nutritionSettings.dailyCalories * 0.05 * (nutritionSettings.carbGoal / 100)) / 4),
          fat: Math.round((nutritionSettings.dailyCalories * 0.05 * (nutritionSettings.fatGoal / 100)) / 9)
        },
        mealType: 'snack',
        tags: ['quick', 'healthy', 'vegetarian']
      },
      {
        id: `snack-2-${Date.now()}`,
        name: 'Greek Yogurt with Nuts',
        description: 'A protein-rich snack to keep you full',
        ingredients: ['1 cup Greek yogurt', '1/4 cup mixed nuts', '1 tsp honey'],
        instructions: ['Mix yogurt with nuts', 'Drizzle with honey', 'Stir and enjoy'],
        prepTime: 2,
        cookTime: 0,
        servings: 1,
        nutrition: {
          calories: Math.round(nutritionSettings.dailyCalories * 0.05),
          protein: Math.round((nutritionSettings.dailyCalories * 0.05 * (nutritionSettings.proteinGoal / 100)) / 4),
          carbs: Math.round((nutritionSettings.dailyCalories * 0.05 * (nutritionSettings.carbGoal / 100)) / 4),
          fat: Math.round((nutritionSettings.dailyCalories * 0.05 * (nutritionSettings.fatGoal / 100)) / 9)
        },
        mealType: 'snack',
        tags: ['high-protein', 'quick', 'healthy']
      }
    ]
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000))
    return mockRecipes
  }

  const handleGenerateMealPlan = async () => {
    setIsGenerating(true)
    setGeneratedMealPlan(null)
    
    try {
      // Use Mistral AI if available and enabled
      const recipes = useMistralAPI && apiAvailable 
        ? await generateRecipesWithAI()
        : await generateMockRecipes()
      
      // Create meal plan based on settings
      const mealPlan: MealPlan = {
        id: Date.now().toString(),
        date: new Date(),
        meals: {},
        totalNutrition: {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0
        }
      }
      
      // Add meals based on settings
      if (nutritionSettings.mealPlan.breakfast) {
        const breakfastRecipe = recipes.find(r => r.mealType === 'breakfast')
        if (breakfastRecipe) {
          mealPlan.meals.breakfast = [breakfastRecipe]
          mealPlan.totalNutrition.calories += breakfastRecipe.nutrition.calories
          mealPlan.totalNutrition.protein += breakfastRecipe.nutrition.protein
          mealPlan.totalNutrition.carbs += breakfastRecipe.nutrition.carbs
          mealPlan.totalNutrition.fat += breakfastRecipe.nutrition.fat
        }
      }
      
      if (nutritionSettings.mealPlan.lunch) {
        const lunchRecipe = recipes.find(r => r.mealType === 'lunch')
        if (lunchRecipe) {
          mealPlan.meals.lunch = [lunchRecipe]
          mealPlan.totalNutrition.calories += lunchRecipe.nutrition.calories
          mealPlan.totalNutrition.protein += lunchRecipe.nutrition.protein
          mealPlan.totalNutrition.carbs += lunchRecipe.nutrition.carbs
          mealPlan.totalNutrition.fat += lunchRecipe.nutrition.fat
        }
      }
      
      if (nutritionSettings.mealPlan.dinner) {
        const dinnerRecipe = recipes.find(r => r.mealType === 'dinner')
        if (dinnerRecipe) {
          mealPlan.meals.dinner = [dinnerRecipe]
          mealPlan.totalNutrition.calories += dinnerRecipe.nutrition.calories
          mealPlan.totalNutrition.protein += dinnerRecipe.nutrition.protein
          mealPlan.totalNutrition.carbs += dinnerRecipe.nutrition.carbs
          mealPlan.totalNutrition.fat += dinnerRecipe.nutrition.fat
        }
      }
      
      if (nutritionSettings.mealPlan.snacks) {
        const snackRecipes = recipes.filter(r => r.mealType === 'snack')
        mealPlan.meals.snacks = snackRecipes.slice(0, nutritionSettings.mealPlan.snackCount)
        snackRecipes.slice(0, nutritionSettings.mealPlan.snackCount).forEach(recipe => {
          mealPlan.totalNutrition.calories += recipe.nutrition.calories
          mealPlan.totalNutrition.protein += recipe.nutrition.protein
          mealPlan.totalNutrition.carbs += recipe.nutrition.carbs
          mealPlan.totalNutrition.fat += recipe.nutrition.fat
        })
      }
      
      setGeneratedMealPlan(mealPlan)
      addToast({
        title: 'Meal Plan Generated',
        description: 'Your personalized meal plan is ready!',
        type: 'success'
      })
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Failed to generate meal plan. Please try again.',
        type: 'error'
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSaveMealPlan = () => {
    if (generatedMealPlan) {
      addMealPlan(generatedMealPlan)
      addToast({
        title: 'Meal Plan Saved',
        description: 'Your meal plan has been saved to your collection.',
        type: 'success'
      })
    }
  }

  const mealTypeIcons: Record<string, React.ReactNode> = {
    breakfast: <Sun className="h-5 w-5" />,
    lunch: <Coffee className="h-5 w-5" />,
    dinner: <Moon className="h-5 w-5" />,
    snack: <Cake className="h-5 w-5" />
  }

  const mealTypeColors: Record<string, string> = {
    breakfast: 'bg-gradient-to-br from-amber-500 to-orange-500',
    lunch: 'bg-gradient-to-br from-blue-500 to-cyan-500',
    dinner: 'bg-gradient-to-br from-purple-500 to-pink-500',
    snack: 'bg-gradient-to-br from-green-500 to-emerald-500'
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AI Recipe Generator</h2>
          <p className="text-muted-foreground">Generate personalized meal plans based on your preferences</p>
        </div>
      </div>

      {/* API Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Mistral AI Integration</CardTitle>
          <CardDescription>
            Your Mistral API key is configured and ready to use
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {apiAvailable === true && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm font-medium">Mistral AI: Connected</span>
                </div>
              )}
              {apiAvailable === false && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-sm font-medium">Mistral AI: Connection failed</span>
                </div>
              )}
              {apiAvailable === null && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse" />
                  <span className="text-sm font-medium">Checking Mistral AI connection...</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Use AI:</span>
              <Button
                variant={useMistralAPI ? 'default' : 'outline'}
                size="sm"
                onClick={() => setUseMistralAPI(!useMistralAPI)}
                disabled={apiAvailable === false}
              >
                {useMistralAPI ? 'Yes' : 'No'}
              </Button>
            </div>
          </div>
          {apiAvailable === false && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-md text-sm"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span>Mistral API connection failed. Using mock data for demonstration.</span>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Generation Options */}
      <Card>
        <CardHeader>
          <CardTitle>Generation Options</CardTitle>
          <CardDescription>
            Customize how AI generates your meal plan
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Cooking Time</label>
              <div className="flex gap-2">
                {COOKING_TIME_OPTIONS.map((option) => (
                  <Button
                    key={option}
                    variant={generationOptions.cookingTime === option ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setGenerationOptions({ ...generationOptions, cookingTime: option })}
                  >
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Difficulty</label>
              <div className="flex gap-2">
                {DIFFICULTY_OPTIONS.map((option) => (
                  <Button
                    key={option}
                    variant={generationOptions.difficulty === option ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setGenerationOptions({ ...generationOptions, difficulty: option })}
                  >
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Include All Preferences</label>
              <Button
                variant={generationOptions.includeAllPreferences ? 'default' : 'outline'}
                size="sm"
                onClick={() => setGenerationOptions({ 
                  ...generationOptions, 
                  includeAllPreferences: !generationOptions.includeAllPreferences 
                })}
              >
                {generationOptions.includeAllPreferences ? 'Yes' : 'No'}
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Randomize Selection</label>
              <Button
                variant={generationOptions.randomize ? 'default' : 'outline'}
                size="sm"
                onClick={() => setGenerationOptions({ 
                  ...generationOptions, 
                  randomize: !generationOptions.randomize 
                })}
              >
                {generationOptions.randomize ? 'Yes' : 'No'}
              </Button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button 
            onClick={handleGenerateMealPlan}
            disabled={isGenerating}
            className="min-w-[150px]"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Meal Plan
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      {/* Preferences Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Your Preferences Summary</CardTitle>
          <CardDescription>
            AI will use these preferences to generate your meal plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Cuisines</h4>
              {preferences.cuisines.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {preferences.cuisines.map(cuisine => (
                    <Badge key={cuisine} variant="secondary">{cuisine}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No cuisines selected</p>
              )}
            </div>
            <div>
              <h4 className="font-medium mb-2">Diets</h4>
              {preferences.diets.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {preferences.diets.map(diet => (
                    <Badge key={diet} variant="secondary">{diet}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No diets selected</p>
              )}
            </div>
            <div>
              <h4 className="font-medium mb-2">Allergies</h4>
              {preferences.allergies.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {preferences.allergies.map(allergy => (
                    <Badge key={allergy} variant="destructive">{allergy}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No allergies specified</p>
              )}
            </div>
            <div>
              <h4 className="font-medium mb-2">Nutrition Goals</h4>
              <div className="space-y-1">
                <p className="text-sm"><span className="font-medium">Calories:</span> {nutritionSettings.dailyCalories} kcal/day</p>
                <p className="text-sm"><span className="font-medium">Macros:</span> P: {nutritionSettings.proteinGoal}% | C: {nutritionSettings.carbGoal}% | F: {nutritionSettings.fatGoal}%</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generated Meal Plan */}
      <AnimatePresence>
        {isGenerating && !generatedMealPlan && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center py-12"
          >
            <motion.div 
              className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary mb-6"
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              {useMistralAPI && apiAvailable ? (
                <Bot className="h-10 w-10 text-primary-foreground" />
              ) : (
                <ChefHat className="h-10 w-10 text-primary-foreground" />
              )}
            </motion.div>
            <h3 className="text-xl font-semibold mb-2">
              {useMistralAPI && apiAvailable ? 'Mistral AI is Generating...' : 'Cooking Up Something Delicious...'}
            </h3>
            <p className="text-muted-foreground">
              {useMistralAPI && apiAvailable 
                ? 'Using Mistral AI to create a personalized meal plan based on your preferences!' 
                : 'AI is analyzing your preferences and creating a personalized meal plan just for you!'}
            </p>
            <div className="flex justify-center gap-2 mt-6">
              <motion.div 
                className="w-3 h-3 rounded-full bg-primary"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 0.5, repeat: Infinity, delay: 0 }}
              />
              <motion.div 
                className="w-3 h-3 rounded-full bg-secondary"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 0.5, repeat: Infinity, delay: 0.1 }}
              />
              <motion.div 
                className="w-3 h-3 rounded-full bg-accent"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 0.5, repeat: Infinity, delay: 0.2 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generated Meal Plan Display */}
      <AnimatePresence>
        {generatedMealPlan && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Your Generated Meal Plan</CardTitle>
                    <CardDescription>
                      {new Date().toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </CardDescription>
                  </div>
                  <Button onClick={handleSaveMealPlan}>
                    <Check className="h-4 w-4 mr-2" />
                    Save Plan
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Total Nutrition Summary */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold">{generatedMealPlan.totalNutrition.calories}</div>
                    <div className="text-sm text-muted-foreground">Calories</div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold">{generatedMealPlan.totalNutrition.protein}g</div>
                    <div className="text-sm text-muted-foreground">Protein</div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold">{generatedMealPlan.totalNutrition.carbs}g</div>
                    <div className="text-sm text-muted-foreground">Carbs</div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold">{generatedMealPlan.totalNutrition.fat}g</div>
                    <div className="text-sm text-muted-foreground">Fat</div>
                  </div>
                </div>

                {/* Meal Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(generatedMealPlan.meals).map(([mealType, recipes]) => {
                    if (!recipes || recipes.length === 0) return null
                    
                    return recipes.map((recipe, index) => (
                      <Card key={`${mealType}-${index}`} className="hover:shadow-lg transition-shadow">
                        <CardHeader className={`pb-0 ${mealTypeColors[mealType]}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-white">
                              {mealTypeIcons[mealType]}
                              <CardTitle className="text-white">{mealType.charAt(0).toUpperCase() + mealType.slice(1)}</CardTitle>
                            </div>
                            <Badge variant="secondary" className="text-white">
                              {recipe.nutrition.calories} cal
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h4 className="font-semibold text-lg">{recipe.name}</h4>
                              <p className="text-sm text-muted-foreground">{recipe.description}</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 mb-4">
                            {recipe.tags.map((tag) => (
                              <Badge key={tag} variant="outline">{tag}</Badge>
                            ))}
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>{recipe.prepTime + recipe.cookTime} min</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span>{recipe.servings} serving</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Flame className="h-4 w-4 text-muted-foreground" />
                              <span>{recipe.nutrition.calories} cal</span>
                            </div>
                          </div>
                          <div className="mt-4 pt-4 border-t space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Protein: {recipe.nutrition.protein}g</span>
                              <span>Carbs: {recipe.nutrition.carbs}g</span>
                              <span>Fat: {recipe.nutrition.fat}g</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {!isGenerating && !generatedMealPlan && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted mx-auto mb-4">
            <Sparkles className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Ready to Generate?</h3>
          <p className="text-muted-foreground mb-4">
            Click the button above to let AI create a personalized meal plan based on your preferences and nutrition goals!
          </p>
          <div className="flex justify-center gap-4">
            <Button variant="outline" onClick={() => setGenerationOptions({ 
              cookingTime: 'quick', 
              difficulty: 'easy', 
              includeAllPreferences: true,
              randomize: false
            })}>
              Quick Setup
            </Button>
            <Button onClick={handleGenerateMealPlan}>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Now
            </Button>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
