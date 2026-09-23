"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Smartphone, Tablet } from "lucide-react";
import { Button } from "@/components/ui/button";

// Non-standard but widely supported install-prompt event; not part of the
// DOM lib types.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

// Avoids a client-only effect purely to flip a "mounted" flag: the snapshot
// differs between server (false) and client (true), so React re-renders once
// after hydration, same timing as the previous effect-based approach.
function subscribeNever() {
  return () => {};
}
function getMountedSnapshot() {
  return true;
}
function getMountedServerSnapshot() {
  return false;
}

// Computed once via a lazy useState initializer instead of an effect, since
// these are one-time feature checks (not a live subscription). Guarded for
// SSR where `window` doesn't exist.
function computeIsIOS(): boolean {
  if (typeof window === "undefined") return false;
  const userAgent = window.navigator.userAgent.toLowerCase();
  return (
    /iphone|ipad|ipod/.test(userAgent) ||
    (window.navigator.platform === "MacIntel" &&
      window.navigator.maxTouchPoints > 1)
  );
}

function computeIsStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    !!(window.navigator as Navigator & { standalone?: boolean }).standalone
  );
}

export default function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS] = useState(computeIsIOS);
  const [isStandalone] = useState(computeIsStandalone);
  const mounted = useSyncExternalStore(
    subscribeNever,
    getMountedSnapshot,
    getMountedServerSnapshot,
  );

  useEffect(() => {
    // Check if PWA installation is available
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on desktop
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show our custom install prompt
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // iOS specific: Check if we should show install prompt
    if (isIOS && !isStandalone) {
      // iOS doesn't fire beforeinstallprompt, so we show our own prompt
      const showIOSPrompt =
        localStorage.getItem("recipebook-ios-prompt-shown") !== "true";
      if (showIOSPrompt) {
        setTimeout(() => {
          setShowPrompt(true);
        }, 3000); // Show after 3 seconds
      }
    }

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, [isIOS, isStandalone]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      // Show the install prompt for non-iOS devices
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        localStorage.setItem("recipebook-pwa-installed", "true");
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      // iOS specific installation instructions
      localStorage.setItem("recipebook-ios-prompt-shown", "true");
      showIOSSafariInstructions();
    }
    setShowPrompt(false);
  };

  const handleClose = () => {
    setShowPrompt(false);
    if (isIOS) {
      localStorage.setItem("recipebook-ios-prompt-shown", "true");
    }
  };

  const showIOSSafariInstructions = () => {
    // Show iOS-specific instructions
    const instructions = `To install RecipeBook on your iPhone or iPad:

1. Tap the Share button (square with arrow) at the bottom of Safari
2. Scroll down and tap "Add to Home Screen"
3. Tap "Add" in the top right corner
4. The app will now appear on your home screen!`;

    alert(instructions);
  };

  const handleDontShowAgain = () => {
    localStorage.setItem(
      isIOS ? "recipebook-ios-prompt-shown" : "recipebook-pwa-prompt-shown",
      "true",
    );
    setShowPrompt(false);
  };

  // Don't render on the server, or if already installed or on standalone mode
  if (!mounted) {
    return null;
  }

  if (
    isStandalone ||
    localStorage.getItem("recipebook-pwa-installed") === "true"
  ) {
    return null;
  }

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed right-4 bottom-4 left-4 z-50 md:right-4 md:left-auto md:max-w-md"
        >
          <div className="rounded-lg border border-border bg-background p-4 shadow-lg">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex items-center gap-3">
                {isIOS ? (
                  <Smartphone className="h-6 w-6 text-primary" />
                ) : (
                  <Download className="h-6 w-6 text-primary" />
                )}
                <div>
                  <h3 className="font-semibold">Install RecipeBook</h3>
                  <p className="text-sm text-muted-foreground">
                    {isIOS
                      ? "Get the full app experience on your iPhone or iPad"
                      : "Install this app for offline access and better performance"}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={handleClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <Button className="w-full" onClick={handleInstall}>
                {isIOS ? "Show Installation Steps" : "Install App"}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={handleDontShowAgain}
              >
                Don&apos;t show again
              </Button>
            </div>

            {isIOS && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-3 border-t pt-3 text-xs text-muted-foreground"
              >
                <p className="flex items-center gap-2">
                  <Tablet className="h-3 w-3" />
                  Works offline and syncs when you&apos;re back online
                </p>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
