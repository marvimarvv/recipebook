"use client";

import { AlertCircle, SlidersHorizontal } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { GenerationOptions } from "@/lib/mistral";
import { COOKING_TIME_OPTIONS, DIFFICULTY_OPTIONS } from "@/types";

interface GenerationOptionsDialogProps {
  options: GenerationOptions;
  onOptionsChange: (options: GenerationOptions) => void;
  useMistralAPI: boolean;
  onUseMistralAPIChange: (checked: boolean) => void;
  apiAvailable: boolean | null;
}

export default function GenerationOptionsDialog({
  options,
  onOptionsChange,
  useMistralAPI,
  onUseMistralAPIChange,
  apiAvailable,
}: GenerationOptionsDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          Generation options
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Generation options</DialogTitle>
          <DialogDescription>
            Choose how AI should build your next weekly plan.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-6">
          <div className="flex items-center justify-between gap-4 rounded-md border p-4">
            <div className="flex flex-col gap-1">
              <span className="font-medium">Mistral AI</span>
              <span className="text-sm text-muted-foreground">
                {apiAvailable === null
                  ? "Checking connection..."
                  : apiAvailable
                    ? "Connected"
                    : "Unavailable - mock recipes will be used"}
              </span>
            </div>
            <Switch
              aria-label="Use Mistral AI"
              checked={useMistralAPI}
              onCheckedChange={onUseMistralAPIChange}
              disabled={apiAvailable === false}
            />
          </div>

          {apiAvailable === false && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                The Mistral connection failed. Generation will use local mock
                data instead.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Cooking time</span>
              <ToggleGroup
                type="single"
                variant="outline"
                value={options.cookingTime}
                onValueChange={(value) => {
                  if (value) {
                    onOptionsChange({
                      ...options,
                      cookingTime: value as GenerationOptions["cookingTime"],
                    });
                  }
                }}
              >
                {COOKING_TIME_OPTIONS.map((option) => (
                  <ToggleGroupItem key={option} value={option}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Difficulty</span>
              <ToggleGroup
                type="single"
                variant="outline"
                value={options.difficulty}
                onValueChange={(value) => {
                  if (value) {
                    onOptionsChange({
                      ...options,
                      difficulty: value as GenerationOptions["difficulty"],
                    });
                  }
                }}
              >
                {DIFFICULTY_OPTIONS.map((option) => (
                  <ToggleGroupItem key={option} value={option}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex items-center justify-between gap-4 rounded-md border p-4 text-sm font-medium">
              Include all preferences
              <Switch
                checked={options.includeAllPreferences}
                onCheckedChange={(checked) =>
                  onOptionsChange({
                    ...options,
                    includeAllPreferences: checked,
                  })
                }
              />
            </label>
            <label className="flex items-center justify-between gap-4 rounded-md border p-4 text-sm font-medium">
              Randomize selection
              <Switch
                checked={options.randomize}
                onCheckedChange={(checked) =>
                  onOptionsChange({ ...options, randomize: checked })
                }
              />
            </label>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
