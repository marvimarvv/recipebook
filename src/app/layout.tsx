import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'RecipeBook - Your AI Meal Planner',
  description: 'A PWA that lets you enter your nutrition preferences and leverages AI to generate personalized recipes and meal plans',
  manifest: '/manifest.json',
  themeColor: '#ff6b6b',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'RecipeBook',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        {children}
      </body>
    </html>
  )
}
