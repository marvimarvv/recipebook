import { Utensils } from "lucide-react";

// Shown while the app boots (e.g. waiting for persisted store rehydration).
export default function SplashScreen() {
  return (
    <div className="flex min-h-screen animate-fade-in items-center justify-center bg-gradient-to-br from-primary to-secondary">
      <Utensils
        className="h-[55vmin] w-[55vmin] animate-pulse-soft text-white"
        strokeWidth={1}
      />
    </div>
  );
}
