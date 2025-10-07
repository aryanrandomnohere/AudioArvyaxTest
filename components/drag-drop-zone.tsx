"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Upload, FileAudio } from "lucide-react"
import { cn } from "@/lib/utils"

interface DragDropZoneProps {
  onFileSelect: (file: File) => void
  currentFile: File | null
  disabled?: boolean
}

export function DragDropZone({ onFileSelect, currentFile, disabled }: DragDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (!disabled) {
        setIsDragOver(true)
      }
    },
    [disabled],
  )

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)

      if (disabled) return

      const files = Array.from(e.dataTransfer.files)
      const audioFile = files.find((file) => file.type.startsWith("audio/"))

      if (audioFile) {
        onFileSelect(audioFile)
      }
    },
    [onFileSelect, disabled],
  )

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith("audio/")) {
      onFileSelect(file)
    }
  }

  return (
    <div className="flex items-center justify-center w-full">
      <label
        htmlFor="audio-upload"
        className={cn(
          "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200",
          isDragOver && !disabled ? "border-primary bg-primary/5 scale-[1.02]" : "border-border hover:bg-accent/50",
          disabled && "opacity-50 cursor-not-allowed",
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          {isDragOver ? (
            <FileAudio className="w-8 h-8 mb-2 text-primary animate-bounce" />
          ) : (
            <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
          )}
          <p className="text-sm text-muted-foreground text-center px-2">
            {currentFile ? (
              <span className="font-medium">{currentFile.name}</span>
            ) : isDragOver ? (
              "Drop your audio file here"
            ) : (
              "Click to upload or drag and drop your stereo audio file"
            )}
          </p>
          {!currentFile && (
            <p className="text-xs text-muted-foreground mt-1">Supports MP3, WAV, M4A, FLAC, and other audio formats</p>
          )}
        </div>
        <input
          id="audio-upload"
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleFileInput}
          disabled={disabled}
        />
      </label>
    </div>
  )
}
