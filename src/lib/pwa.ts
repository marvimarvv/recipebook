/**
 * PWA Utilities for iOS/Safari Compatibility
 * 
 * This file contains utilities to handle iOS-specific PWA quirks and requirements
 */

/**
 * Check if the app is running in standalone mode (installed as PWA)
 */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  
  // Check display mode
  const displayMode = window.matchMedia('(display-mode: standalone)').matches
  if (displayMode) return true
  
  // Check for iOS standalone
  if (window.navigator.standalone) return true
  
  // Check for Capacitor/Cordova
  if ((window as any).Capacitor) return true
  
  return false
}

/**
 * Check if running on iOS device
 */
export function isIOS(): boolean {
  if (typeof window === 'undefined') return false
  
  const userAgent = window.navigator.userAgent.toLowerCase()
  const platform = window.navigator.platform.toLowerCase()
  
  // Check for iPhone, iPad, iPod
  if (/iphone|ipad|ipod/.test(userAgent)) return true
  
  // Check for iPad on iOS 13+ (MacIntel with touch points)
  if (platform === 'macintel' && window.navigator.maxTouchPoints > 1) return true
  
  return false
}

/**
 * Check if running on Safari
 */
export function isSafari(): boolean {
  if (typeof window === 'undefined') return false
  
  const userAgent = window.navigator.userAgent.toLowerCase()
  const isSafari = /safari/.test(userAgent) && !/chrome|chromium|crios|opera|firefox|edg/.test(userAgent)
  
  // Special case for iOS Safari
  if (isIOS() && !/chrome|crios|firefox|edg|opera|samsungbrowser/.test(userAgent)) {
    return true
  }
  
  return isSafari
}

/**
 * Check if running on iOS Safari specifically
 */
export function isIOSSafari(): boolean {
  return isIOS() && isSafari()
}

/**
 * Get iOS version
 */
export function getIOSVersion(): number | null {
  if (!isIOS()) return null
  
  const userAgent = window.navigator.userAgent
  const match = userAgent.match(/OS (\d+_?\d*)/)
  
  if (match) {
    const version = parseFloat(match[1].replace('_', '.'))
    return version
  }
  
  return null
}

/**
 * Check if iOS version supports PWA features
 */
export function supportsIOSPWA(): boolean {
  const version = getIOSVersion()
  if (version === null) return false
  
  // iOS 12.2+ supports basic PWA features
  // iOS 13.4+ supports more PWA features
  // iOS 14.3+ supports better PWA features
  return version >= 12.2
}

/**
 * Check if service workers are supported
 */
export function supportsServiceWorkers(): boolean {
  if (typeof window === 'undefined') return false
  return 'serviceWorker' in window.navigator
}

/**
 * Check if Web App Manifest is supported
 */
export function supportsWebAppManifest(): boolean {
  if (typeof window === 'undefined') return false
  return 'getInstallRelatedApps' in window.navigator
}

/**
 * Check if beforeinstallprompt event is supported
 */
export function supportsBeforeInstallPrompt(): boolean {
  if (typeof window === 'undefined') return false
  return 'BeforeInstallPromptEvent' in window
}

/**
 * Get PWA compatibility information
 */
export function getPWASupportInfo() {
  return {
    isStandalone: isStandalone(),
    isIOS: isIOS(),
    isSafari: isSafari(),
    isIOSSafari: isIOSSafari(),
    iOSVersion: getIOSVersion(),
    supportsPWA: supportsIOSPWA(),
    supportsServiceWorkers: supportsServiceWorkers(),
    supportsWebAppManifest: supportsWebAppManifest(),
    supportsBeforeInstallPrompt: supportsBeforeInstallPrompt(),
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : '',
    platform: typeof window !== 'undefined' ? window.navigator.platform : ''
  }
}

/**
 * Register service worker with iOS compatibility
 */
export async function registerServiceWorker() {
  if (!supportsServiceWorkers()) {
    console.log('Service Workers not supported')
    return false
  }

  try {
    // iOS specific: Wait a bit before registering to avoid race conditions
    if (isIOSSafari()) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    const registration = await window.navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      type: 'module'
    })

    // iOS specific: Force update check
    if (isIOSSafari()) {
      registration.update()
    }

    console.log('Service Worker registered:', registration.scope)
    return true
  } catch (error) {
    console.error('Service Worker registration failed:', error)
    return false
  }
}

/**
 * Check if app needs to be updated
 */
export async function checkForUpdates() {
  if (!supportsServiceWorkers()) return false

  try {
    const registration = await window.navigator.serviceWorker.getRegistration()
    if (!registration) return false

    // Check if there's a waiting service worker
    if (registration.waiting) {
      return true
    }

    // Check for updates
    await registration.update()
    
    // Wait a bit for the update to be detected
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    return !!registration.waiting
  } catch (error) {
    console.error('Update check failed:', error)
    return false
  }
}

/**
 * Skip waiting and activate new service worker
 */
export async function skipWaiting() {
  if (!supportsServiceWorkers()) return false

  try {
    const registration = await window.navigator.serviceWorker.getRegistration()
    if (!registration || !registration.waiting) return false

    // Send message to service worker to skip waiting
    registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    
    // iOS specific: Force reload
    if (isIOSSafari()) {
      window.location.reload()
    }

    return true
  } catch (error) {
    console.error('Skip waiting failed:', error)
    return false
  }
}

/**
 * iOS specific: Show installation instructions
 */
export function showIOSInstallInstructions() {
  if (!isIOSSafari()) return
  
  const instructions = `To install RecipeBook on your iPhone or iPad:

1. Tap the Share button (square with arrow) at the bottom of Safari
2. Scroll down and tap "Add to Home Screen"
3. Tap "Add" in the top right corner
4. The app will now appear on your home screen!

Benefits:
• Works offline
• Faster loading
• App-like experience
• Push notifications (if enabled)`

  alert(instructions)
}

/**
 * iOS specific: Check if PWA is properly cached
 */
export async function checkPWACache() {
  if (!supportsServiceWorkers()) return false

  try {
    const registration = await window.navigator.serviceWorker.getRegistration()
    if (!registration) return false

    const caches = await window.caches.keys()
    return caches.length > 0
  } catch (error) {
    return false
  }
}
