'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, X, Smartphone, Tablet } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Check if we're on iOS
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent) || 
                      (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1)
    setIsIOS(isIOSDevice)

    // Check if app is already installed as PWA
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
                           !!((window.navigator as Navigator & { standalone?: boolean }).standalone)
    setIsStandalone(isStandaloneMode)

    // Check if PWA installation is available
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on desktop
      e.preventDefault()
      // Stash the event so it can be triggered later
      setDeferredPrompt(e)
      // Show our custom install prompt
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // iOS specific: Check if we should show install prompt
    if (isIOSDevice && !isStandaloneMode) {
      // iOS doesn't fire beforeinstallprompt, so we show our own prompt
      const showIOSPrompt = localStorage.getItem('recipebook-ios-prompt-shown') !== 'true'
      if (showIOSPrompt) {
        setTimeout(() => {
          setShowPrompt(true)
        }, 3000) // Show after 3 seconds
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      // Show the install prompt for non-iOS devices
      (deferredPrompt as any).prompt()
      const { outcome } = await (deferredPrompt as any).userChoice
      if (outcome === 'accepted') {
        localStorage.setItem('recipebook-pwa-installed', 'true')
      }
      setDeferredPrompt(null)
    } else if (isIOS) {
      // iOS specific installation instructions
      localStorage.setItem('recipebook-ios-prompt-shown', 'true')
      showIOSSafariInstructions()
    }
    setShowPrompt(false)
  }

  const handleClose = () => {
    setShowPrompt(false)
    if (isIOS) {
      localStorage.setItem('recipebook-ios-prompt-shown', 'true')
    }
  }

  const showIOSSafariInstructions = () => {
    // Show iOS-specific instructions
    const instructions = `To install RecipeBook on your iPhone or iPad:

1. Tap the Share button (square with arrow) at the bottom of Safari
2. Scroll down and tap "Add to Home Screen"
3. Tap "Add" in the top right corner
4. The app will now appear on your home screen!`
    
    alert(instructions)
  }

  const handleDontShowAgain = () => {
    localStorage.setItem(isIOS ? 'recipebook-ios-prompt-shown' : 'recipebook-pwa-prompt-shown', 'true')
    setShowPrompt(false)
  }

  // Don't render on the server, or if already installed or on standalone mode
  if (!mounted) {
    return null
  }

  if (isStandalone || localStorage.getItem('recipebook-pwa-installed') === 'true') {
    return null
  }

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50"
        >
          <div className="bg-background border border-border rounded-lg shadow-lg p-4">
            <div className="flex items-start justify-between mb-3">
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
                      ? 'Get the full app experience on your iPhone or iPad' 
                      : 'Install this app for offline access and better performance'}
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 flex-shrink-0"
                onClick={handleClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <Button 
                className="w-full"
                onClick={handleInstall}
              >
                {isIOS ? 'Show Installation Steps' : 'Install App'}
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full text-xs"
                onClick={handleDontShowAgain}
              >
                Don't show again
              </Button>
            </div>

            {isIOS && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-3 pt-3 border-t text-xs text-muted-foreground"
              >
                <p className="flex items-center gap-2">
                  <Tablet className="h-3 w-3" />
                  Works offline and syncs when you're back online
                </p>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
