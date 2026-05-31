'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Heart, Clock, Users, Flame, Edit, Trash2, Eye, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useStore } from '@/store/useStore'
import { Recipe } from '@/types'

export default function KnownRecipes() {
  const recipes = useStore(state => state.recipes)
  const addRecipe = useStore(state => state.addRecipe)
  const deleteRecipe = useStore(state => state.deleteRecipe)
  const toggleFavorite = useStore(state => state.toggleFavorite)
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [newRecipe, setNewRecipe] = useState<Partial<Recipe>>({
    name: '',
    description: '',
    ingredients: [],
    instructions: [],
    prepTime: 0,
    cookTime: 0,
    servings: 1,
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    tags: []
  })

  const handleAddRecipe = () => {
    if (newRecipe.name) {
      const recipe: Recipe = {
        id: Date.now().toString(),
        name: newRecipe.name!,
        description: newRecipe.description || '',
        ingredients: newRecipe.ingredients || [],
        instructions: newRecipe.instructions || [],
        prepTime: newRecipe.prepTime || 0,
        cookTime: newRecipe.cookTime || 0,
        servings: newRecipe.servings || 1,
        calories: newRecipe.calories || 0,
        protein: newRecipe.protein || 0,
        carbs: newRecipe.carbs || 0,
        fat: newRecipe.fat || 0,
        tags: newRecipe.tags || [],
        createdAt: new Date(),
        isFavorite: false
      }
      addRecipe(recipe)
      setNewRecipe({
        name: '',
        description: '',
        ingredients: [],
        instructions: [],
        prepTime: 0,
        cookTime: 0,
        servings: 1,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        tags: []
      })
      setIsModalOpen(false)
    }
  }

  const handleViewRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe)
    setIsModalOpen(true)
  }

  const sampleRecipes: Recipe[] = [
    {
      id: '1',
      name: 'Avocado Toast with Poached Egg',
      description: 'A healthy and delicious breakfast option',
      ingredients: ['2 slices whole grain bread', '1 ripe avocado', '2 eggs', 'Salt and pepper', 'Red pepper flakes'],
      instructions: ['Toast the bread', 'Mash the avocado and spread on toast', 'Poach the eggs', 'Place eggs on toast', 'Season with salt, pepper, and red pepper flakes'],
      prepTime: 5,
      cookTime: 10,
      servings: 2,
      calories: 350,
      protein: 12,
      carbs: 30,
      fat: 20,
      tags: ['breakfast', 'healthy', 'vegetarian'],
      createdAt: new Date(),
      isFavorite: true
    },
    {
      id: '2',
      name: 'Grilled Chicken Salad',
      description: 'A protein-packed lunch option',
      ingredients: ['1 chicken breast', 'Mixed greens', 'Cherry tomatoes', 'Cucumber', 'Olive oil', 'Lemon juice'],
      instructions: ['Grill the chicken breast', 'Chop vegetables', 'Mix all ingredients', 'Drizzle with olive oil and lemon juice'],
      prepTime: 10,
      cookTime: 15,
      servings: 1,
      calories: 400,
      protein: 35,
      carbs: 15,
      fat: 20,
      tags: ['lunch', 'high-protein', 'healthy'],
      createdAt: new Date(),
      isFavorite: false
    },
    {
      id: '3',
      name: 'Spaghetti Carbonara',
      description: 'Classic Italian pasta dish',
      ingredients: ['200g spaghetti', '100g pancetta', '2 eggs', '50g parmesan', 'Black pepper', 'Salt'],
      instructions: ['Cook spaghetti', 'Fry pancetta', 'Mix eggs and parmesan', 'Combine all ingredients', 'Season with black pepper'],
      prepTime: 10,
      cookTime: 15,
      servings: 2,
      calories: 600,
      protein: 25,
      carbs: 70,
      fat: 25,
      tags: ['dinner', 'Italian', 'comfort-food'],
      createdAt: new Date(),
      isFavorite: true
    }
  ]

  // Add sample recipes if none exist
  if (recipes.length === 0) {
    sampleRecipes.forEach(recipe => addRecipe(recipe))
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Known Recipes</h2>
          <p className="text-muted-foreground">Save and manage your favorite recipes</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Recipe
        </Button>
      </div>

      {/* Recipe Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {recipes.map((recipe, index) => (
            <motion.div
              key={recipe.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full hover:shadow-lg transition-shadow group">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {recipe.name}
                        {recipe.isFavorite && (
                          <Heart className="h-4 w-4 text-destructive fill-destructive" />
                        )}
                      </CardTitle>
                      <CardDescription>{recipe.description}</CardDescription>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => toggleFavorite(recipe.id)}
                      >
                        <Heart className={`h-4 w-4 ${recipe.isFavorite ? 'text-destructive fill-destructive' : 'text-muted-foreground'}`} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => handleViewRecipe(recipe)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => deleteRecipe(recipe.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {recipe.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{recipe.prepTime + recipe.cookTime} min</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{recipe.servings} servings</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Flame className="h-4 w-4 text-muted-foreground" />
                      <span>{recipe.calories} cal</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between text-sm">
                  <div className="flex gap-4">
                    <span className="text-muted-foreground">P: {recipe.protein}g</span>
                    <span className="text-muted-foreground">C: {recipe.carbs}g</span>
                    <span className="text-muted-foreground">F: {recipe.fat}g</span>
                  </div>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {recipes.length === 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted mx-auto mb-4">
            <Flame className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No recipes yet</h3>
          <p className="text-muted-foreground mb-4">
            Start by adding your favorite recipes or let AI generate some for you!
          </p>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Recipe
          </Button>
        </motion.div>
      )}

      {/* Recipe Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-background rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">
                    {selectedRecipe ? 'Recipe Details' : 'Add New Recipe'}
                  </h2>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => {
                      setIsModalOpen(false)
                      setSelectedRecipe(null)
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                {selectedRecipe ? (
                  // View Recipe
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-medium mb-2">Ingredients</h3>
                      <ul className="list-disc list-inside space-y-1">
                        {selectedRecipe.ingredients.map((ingredient, index) => (
                          <li key={index}>{ingredient}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-medium mb-2">Instructions</h3>
                      <ol className="list-decimal list-inside space-y-1">
                        {selectedRecipe.instructions.map((instruction, index) => (
                          <li key={index}>{instruction}</li>
                        ))}
                      </ol>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      <div>
                        <p className="text-sm text-muted-foreground">Prep Time</p>
                        <p className="font-medium">{selectedRecipe.prepTime} min</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Cook Time</p>
                        <p className="font-medium">{selectedRecipe.cookTime} min</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Servings</p>
                        <p className="font-medium">{selectedRecipe.servings}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Calories</p>
                        <p className="font-medium">{selectedRecipe.calories}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Add Recipe Form
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Recipe Name *</label>
                      <input
                        type="text"
                        value={newRecipe.name || ''}
                        onChange={(e) => setNewRecipe({ ...newRecipe, name: e.target.value })}
                        placeholder="e.g., Spaghetti Carbonara"
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Description</label>
                      <textarea
                        value={newRecipe.description || ''}
                        onChange={(e) => setNewRecipe({ ...newRecipe, description: e.target.value })}
                        placeholder="A brief description of the recipe"
                        rows={3}
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Prep Time (min)</label>
                        <input
                          type="number"
                          value={newRecipe.prepTime || 0}
                          onChange={(e) => setNewRecipe({ ...newRecipe, prepTime: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Cook Time (min)</label>
                        <input
                          type="number"
                          value={newRecipe.cookTime || 0}
                          onChange={(e) => setNewRecipe({ ...newRecipe, cookTime: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Servings</label>
                        <input
                          type="number"
                          value={newRecipe.servings || 1}
                          onChange={(e) => setNewRecipe({ ...newRecipe, servings: parseInt(e.target.value) || 1 })}
                          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Calories</label>
                        <input
                          type="number"
                          value={newRecipe.calories || 0}
                          onChange={(e) => setNewRecipe({ ...newRecipe, calories: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4 border-t">
                      <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddRecipe}>
                        Add Recipe
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
