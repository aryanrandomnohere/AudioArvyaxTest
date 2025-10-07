"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Play, Pause, Volume2 } from "lucide-react"

interface AudioPreviewProps {
  blob: Blob
  label: string
  filename: string
}

export function AudioPreview({ blob, label, filename }: AudioPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)
  const audioUrlRef = useRef<string | null>(null)

  useEffect(() => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current)
    }
    audioUrlRef.current = URL.createObjectURL(blob)

    if (audioRef.current) {
      audioRef.current.src = audioUrlRef.current
    }

    return () => {
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current)
      }
    }
  }, [blob])

  const togglePlayPause = () => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }

  const handleEnded = () => {
    setIsPlaying(false)
    setCurrentTime(0)
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const isLeftChannel = label.toLowerCase().includes("left")
  const isRightChannel = label.toLowerCase().includes("right")

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={togglePlayPause} className="flex-shrink-0 bg-transparent">
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium truncate">{label}</span>
                {isLeftChannel && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">L</span>}
                {isRightChannel && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">R</span>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-100"
                style={{
                  width: duration > 0 ? `${(currentTime / duration) * 100}%` : "0%",
                }}
              />
            </div>
          </div>

          <Volume2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </div>

        <audio
          ref={audioRef}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          preload="metadata"
        />
      </CardContent>
    </Card>
  )
}
