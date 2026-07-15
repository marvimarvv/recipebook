"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  X,
  ChefHat,
  Heart,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/store/useStore";
import { CUISINE_OPTIONS, DIET_OPTIONS, ALLERGY_OPTIONS } from "@/types";

export default function FoodPreferences() {
  const preferences = useStore((state) => state.preferences);
  const setPreferences = useStore((state) => state.setPreferences);

  const [newCuisine, setNewCuisine] = useState("");
  const [newDiet, setNewDiet] = useState("");
  const [newAllergy, setNewAllergy] = useState("");
  const [newLike, setNewLike] = useState("");
  const [newDislike, setNewDislike] = useState("");

  type StringArrayKey =
    "cuisines" | "diets" | "allergies" | "dislikes" | "likes";

  const handleAddPreference = (category: StringArrayKey, value: string) => {
    if (value.trim() && !preferences[category].includes(value.trim())) {
      setPreferences((prev) => ({
        ...prev,
        [category]: [...prev[category], value.trim()],
      }));
    }
  };

  const handleRemovePreference = (category: StringArrayKey, value: string) => {
    setPreferences((prev) => ({
      ...prev,
      [category]: prev[category].filter((item: string) => item !== value),
    }));
  };

  const handleCookingLevelChange = (level: typeof preferences.cookingLevel) => {
    setPreferences((prev) => ({ ...prev, cookingLevel: level }));
  };

  const handleMealFrequencyChange = (frequency: number) => {
    setPreferences((prev) => ({ ...prev, mealFrequency: frequency }));
  };

  const preferenceCategories = [
    {
      key: "cuisines",
      title: "Preferred Cuisines",
      description: "Select the cuisines you enjoy most",
      icon: <ChefHat className="h-5 w-5" />,
      options: CUISINE_OPTIONS,
      color: "bg-primary/10 text-primary",
    },
    {
      key: "diets",
      title: "Dietary Preferences",
      description: "Your dietary lifestyle choices",
      icon: <Heart className="h-5 w-5" />,
      options: DIET_OPTIONS,
      color: "bg-secondary/10 text-secondary",
    },
    {
      key: "allergies",
      title: "Allergies & Restrictions",
      description: "Foods you must avoid",
      icon: <AlertCircle className="h-5 w-5" />,
      options: ALLERGY_OPTIONS,
      color: "bg-destructive/10 text-destructive",
    },
    {
      key: "likes",
      title: "Favorite Foods",
      description: "Ingredients and dishes you love",
      icon: <ThumbsUp className="h-5 w-5" />,
      options: [],
      color: "bg-green-500/10 text-green-500",
    },
    {
      key: "dislikes",
      title: "Disliked Foods",
      description: "Ingredients and dishes you dislike",
      icon: <ThumbsDown className="h-5 w-5" />,
      options: [],
      color: "bg-orange-500/10 text-orange-500",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Food Preferences</h2>
          <p className="text-muted-foreground">
            Tell us what you love and what to avoid
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPreferences({ ...preferences })}
        >
          Reset All
        </Button>
      </div>

      {/* Quick Select Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {preferenceCategories.map((category) => (
          <Card
            key={category.key}
            className="transition-shadow hover:shadow-md"
          >
            <CardHeader>
              <div className="flex items-center gap-2">
                {category.icon}
                <CardTitle className="text-lg">{category.title}</CardTitle>
              </div>
              <CardDescription>{category.description}</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Existing preferences */}
              <div className="mb-4 flex flex-wrap gap-2">
                {preferences[category.key as StringArrayKey].map((item) => (
                  <Badge
                    key={item}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {item}
                    <button
                      onClick={() =>
                        handleRemovePreference(
                          category.key as StringArrayKey,
                          item,
                        )
                      }
                      className="rounded-full p-0.5 transition-colors hover:bg-destructive/20"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>

              {/* Quick add from options */}
              {category.options.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {category.options.slice(0, 6).map(
                    (option) =>
                      !preferences[category.key as StringArrayKey].includes(
                        option,
                      ) && (
                        <Button
                          key={option}
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() =>
                            handleAddPreference(
                              category.key as StringArrayKey,
                              option,
                            )
                          }
                        >
                          + {option}
                        </Button>
                      ),
                  )}
                </div>
              )}

              {/* Custom input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={`Add ${category.key === "cuisines" ? "cuisine" : category.key === "diets" ? "diet" : category.key === "allergies" ? "allergy" : category.key === "likes" ? "favorite" : "dislike"}`}
                  value={
                    category.key === "cuisines"
                      ? newCuisine
                      : category.key === "diets"
                        ? newDiet
                        : category.key === "allergies"
                          ? newAllergy
                          : category.key === "likes"
                            ? newLike
                            : newDislike
                  }
                  onChange={(e) => {
                    if (category.key === "cuisines")
                      setNewCuisine(e.target.value);
                    else if (category.key === "diets")
                      setNewDiet(e.target.value);
                    else if (category.key === "allergies")
                      setNewAllergy(e.target.value);
                    else if (category.key === "likes")
                      setNewLike(e.target.value);
                    else setNewDislike(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddPreference(
                        category.key as StringArrayKey,
                        category.key === "cuisines"
                          ? newCuisine
                          : category.key === "diets"
                            ? newDiet
                            : category.key === "allergies"
                              ? newAllergy
                              : category.key === "likes"
                                ? newLike
                                : newDislike,
                      );
                      if (category.key === "cuisines") setNewCuisine("");
                      else if (category.key === "diets") setNewDiet("");
                      else if (category.key === "allergies") setNewAllergy("");
                      else if (category.key === "likes") setNewLike("");
                      else setNewDislike("");
                    }
                  }}
                  className="flex-1 rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    handleAddPreference(
                      category.key as StringArrayKey,
                      category.key === "cuisines"
                        ? newCuisine
                        : category.key === "diets"
                          ? newDiet
                          : category.key === "allergies"
                            ? newAllergy
                            : category.key === "likes"
                              ? newLike
                              : newDislike,
                    );
                    if (category.key === "cuisines") setNewCuisine("");
                    else if (category.key === "diets") setNewDiet("");
                    else if (category.key === "allergies") setNewAllergy("");
                    else if (category.key === "likes") setNewLike("");
                    else setNewDislike("");
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cooking Level and Meal Frequency */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Settings</CardTitle>
          <CardDescription>
            Fine-tune your recipe recommendations
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <h3 className="mb-2 font-medium">Cooking Level</h3>
            <div className="flex gap-2">
              {["beginner", "intermediate", "advanced"].map((level) => (
                <Button
                  key={level}
                  variant={
                    preferences.cookingLevel === level ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() =>
                    handleCookingLevelChange(
                      level as typeof preferences.cookingLevel,
                    )
                  }
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-2 font-medium">Meals Per Day</h3>
            <div className="flex gap-2">
              {[2, 3, 4, 5].map((freq) => (
                <Button
                  key={freq}
                  variant={
                    preferences.mealFrequency === freq ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => handleMealFrequencyChange(freq)}
                >
                  {freq}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {preferences.cuisines.length > 0 ||
      preferences.diets.length > 0 ||
      preferences.allergies.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <p className="text-sm text-muted-foreground">
            Your preferences will help AI generate personalized recipes just for
            you!
          </p>
        </motion.div>
      ) : null}
    </motion.div>
  );
}
