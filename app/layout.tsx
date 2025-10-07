import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import "./globals.css"

export const metadata: Metadata = {
  title: "Audio Channel Separator & Effects - Split Stereo Audio",
  description:
    "Separate stereo audio files into individual left and right channel files. Apply audio effects like 3D audio, bass boost, equalizer, noise reduction, pitch shift, reverb, and reverse. All processing happens locally in your browser.",
  generator: "v0.app",
  keywords: [
    "audio",
    "channel",
    "separator",
    "stereo",
    "left",
    "right",
    "split",
    "wav",
    "effects",
    "3d audio",
    "bass boost",
    "equalizer",
    "noise reducer",
    "pitch shift",
    "reverb",
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <Suspense fallback={null}>{children}</Suspense>
        <Analytics />
      </body>
    </html>
  )
}
