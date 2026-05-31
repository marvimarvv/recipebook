# RecipeBook - Your AI Meal Planner

A Progressive Web App (PWA) that lets you enter your nutrition preferences and leverages AI to generate personalized recipes and meal plans based on your data.

## Features

### 🍽️ Food Preferences
- Set your preferred cuisines (Italian, Mexican, Chinese, etc.)
- Specify dietary preferences (Vegetarian, Vegan, Keto, etc.)
- Add allergies and food restrictions
- Track foods you like and dislike
- Set your cooking level (beginner, intermediate, advanced)

### ❤️ Known Recipes
- Add and manage your favorite recipes
- Track ingredients, instructions, and nutrition info
- Mark recipes as favorites
- View recipe details in a clean, organized format

### ⚙️ Nutrition Settings
- Set daily calorie goals (1000-4000 kcal)
- Configure macronutrient distribution (protein, carbs, fat)
- Choose which meals to include (breakfast, lunch, dinner, snacks)
- Set number of snacks per day
- Visual macro distribution tracking

### 🤖 AI Recipe Generation
- Generate complete meal plans with one click
- AI considers your preferences and nutrition goals
- Customize generation options:
  - Cooking time (quick, medium, long)
  - Difficulty level (easy, medium, hard)
  - Include all preferences
  - Randomize selection
- Generate breakfast, lunch, dinner, and snacks
- View detailed nutrition breakdown for each meal
- Save generated meal plans

### 🎨 UI Features
- Modern, clean design with card-based layout
- Responsive design for mobile and desktop
- Smooth animations and transitions
- Playful floating illustrations
- Interactive elements with micro-animations
- Professional color scheme with gradients

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **PWA**: next-pwa

## Getting Started

### Prerequisites

- Node.js 18.17 or later
- npm, yarn, or pnpm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/marvimarvv/recipebook.git
cd recipebook
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Building for Production

```bash
npm run build
npm run start
```

## PWA Features

The app includes full PWA support:
- Offline functionality
- Installable on mobile and desktop
- Service worker for caching
- Manifest for app icons and splash screens

## Project Structure

```
recipebook/
├── src/
│   ├── app/
│   │   ├── globals.css    # Global styles and Tailwind config
│   │   ├── layout.tsx     # Root layout
│   │   └── page.tsx       # Main page
│   ├── components/
│   │   ├── ui/            # shadcn/ui components
│   │   ├── FoodPreferences.tsx
│   │   ├── KnownRecipes.tsx
│   │   ├── NutritionSettings.tsx
│   │   └── AIRecipeGenerator.tsx
│   ├── hooks/
│   │   └── useLocalStorage.ts
│   ├── lib/
│   │   └── utils.ts       # Utility functions
│   ├── store/
│   │   └── useStore.ts    # Zustand state management
│   └── types/
│       └── index.ts       # TypeScript types
├── public/
│   ├── icons/             # PWA icons
│   ├── screenshots/       # App screenshots
│   ├── manifest.json      # PWA manifest
│   └── sw.js             # Service worker
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## Customization

### Adding AI Integration

To connect to a real AI service, replace the `generateMockRecipes` function in `AIRecipeGenerator.tsx` with your actual API call:

```typescript
const generateRecipes = async (): Promise<GeneratedRecipe[]> => {
  const response = await fetch('YOUR_AI_API_ENDPOINT', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_API_KEY'
    },
    body: JSON.stringify({
      preferences: preferences,
      nutrition: nutritionSettings,
      options: generationOptions
    })
  });
  
  return response.json();
}
```

### Theming

Edit the CSS variables in `src/app/globals.css` to change the color scheme:

```css
:root {
  --primary: 0 72% 51%;        /* Red */
  --secondary: 175 54% 58%;    /* Teal */
  --accent: 45 93% 58%;       /* Yellow */
  /* ... */
}
```

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge
- Mobile browsers (iOS Safari, Chrome for Android)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
