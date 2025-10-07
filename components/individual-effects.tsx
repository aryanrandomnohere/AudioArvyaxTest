"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Download, Loader2, Volume2, Music, Sliders, VolumeX, Music2, Radio, RotateCcw } from "lucide-react"
import { AudioEffects, type EffectConfig } from "@/lib/audio-effects"
import { AudioPreview } from "@/components/audio-preview"

interface IndividualEffectsProps {
  file: File
  onError: (error: string) => void
}

interface ProcessedEffect {
  type: string
  name: string
  blob: Blob | null
  processing: boolean
  params: Record<string, number>
}

export function IndividualEffects({ file, onError }: IndividualEffectsProps) {
  const [effects, setEffects] = useState<ProcessedEffect[]>([
    {
      type: "3d-audio",
      name: "3D Audio",
      blob: null,
      processing: false,
      params: { intensity: 0.5 },
    },
    {
      type: "bass-boost",
      name: "Bass Booster",
      blob: null,
      processing: false,
      params: { gain: 6 },
    },
    {
      type: "equalizer",
      name: "Equalizer",
      blob: null,
      processing: false,
      params: { band1: 0, band2: 0, band3: 0, band4: 0, band5: 0 },
    },
    {
      type: "noise-reducer",
      name: "Noise Reducer",
      blob: null,
      processing: false,
      params: { threshold: 0.02 },
    },
    {
      type: "pitch-shift",
      name: "Pitch Shifter",
      blob: null,
      processing: false,
      params: { semitones: 0 },
    },
    {
      type: "reverb",
      name: "Reverb",
      blob: null,
      processing: false,
      params: { roomSize: 0.5, decay: 2 },
    },
    {
      type: "reverse",
      name: "Reverse Audio",
      blob: null,
      processing: false,
      params: {},
    },
  ])

  const getEffectIcon = (type: string) => {
    switch (type) {
      case "3d-audio":
        return <Volume2 className="w-5 h-5" />
      case "bass-boost":
        return <Music className="w-5 h-5" />
      case "equalizer":
        return <Sliders className="w-5 h-5" />
      case "noise-reducer":
        return <VolumeX className="w-5 h-5" />
      case "pitch-shift":
        return <Music2 className="w-5 h-5" />
      case "reverb":
        return <Radio className="w-5 h-5" />
      case "reverse":
        return <RotateCcw className="w-5 h-5" />
      default:
        return <Music className="w-5 h-5" />
    }
  }

  const updateEffectParam = (index: number, paramName: string, value: number) => {
    setEffects((prev) =>
      prev.map((effect, i) =>
        i === index
          ? {
              ...effect,
              params: { ...effect.params, [paramName]: value },
            }
          : effect,
      ),
    )
  }

  const processEffect = async (index: number) => {
    const effect = effects[index]

    setEffects((prev) => prev.map((e, i) => (i === index ? { ...e, processing: true, blob: null } : e)))

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      let audioBuffer: ArrayBuffer

      // Convert MP3 to WAV if needed
      if (file.type === "audio/mpeg" || file.type === "audio/mp3" || file.name.toLowerCase().endsWith(".mp3")) {
        audioBuffer = await convertMp3ToWav(file)
      } else {
        audioBuffer = await file.arrayBuffer()
      }

      let decodedBuffer = await audioContext.decodeAudioData(audioBuffer.slice(0))

      // Apply the effect
      const audioEffects = new AudioEffects(audioContext)
      const effectConfig: EffectConfig = {
        type: effect.type as any,
        params: effect.params,
      }

      decodedBuffer = await audioEffects.applyEffect(decodedBuffer, effectConfig)

      // Convert to WAV blob
      const wavBuffer = audioBufferToWav(decodedBuffer)
      const blob = new Blob([wavBuffer], { type: "audio/wav" })

      setEffects((prev) => prev.map((e, i) => (i === index ? { ...e, blob, processing: false } : e)))

      await audioContext.close()
    } catch (error) {
      console.error("Error processing effect:", error)
      onError(error instanceof Error ? error.message : "Failed to process effect")
      setEffects((prev) => prev.map((e, i) => (i === index ? { ...e, processing: false } : e)))
    }
  }

  const convertMp3ToWav = async (file: File): Promise<ArrayBuffer> => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    try {
      const arrayBuffer = await file.arrayBuffer()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      const wavBuffer = audioBufferToWav(audioBuffer)
      return wavBuffer
    } finally {
      await audioContext.close()
    }
  }

  const audioBufferToWav = (buffer: AudioBuffer): ArrayBuffer => {
    const length = buffer.length
    const numberOfChannels = buffer.numberOfChannels
    const sampleRate = buffer.sampleRate
    const bytesPerSample = 2
    const blockAlign = numberOfChannels * bytesPerSample
    const byteRate = sampleRate * blockAlign
    const dataSize = length * blockAlign
    const bufferSize = 44 + dataSize

    const arrayBuffer = new ArrayBuffer(bufferSize)
    const view = new DataView(arrayBuffer)

    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }

    writeString(0, "RIFF")
    view.setUint32(4, bufferSize - 8, true)
    writeString(8, "WAVE")
    writeString(12, "fmt ")
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, numberOfChannels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, byteRate, true)
    view.setUint16(32, blockAlign, true)
    view.setUint16(34, 16, true)
    writeString(36, "data")
    view.setUint32(40, dataSize, true)

    let offset = 44
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]))
        view.setInt16(offset, sample * 0x7fff, true)
        offset += 2
      }
    }

    return arrayBuffer
  }

  const downloadEffect = (blob: Blob, effectName: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    const baseName = file.name.split(".")[0]
    a.download = `${baseName}_${effectName.toLowerCase().replace(/\s+/g, "-")}.wav`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const downloadAll = () => {
    effects.forEach((effect, index) => {
      if (effect.blob) {
        setTimeout(() => {
          downloadEffect(effect.blob!, effect.name)
        }, index * 200)
      }
    })
  }

  const hasAnyProcessed = effects.some((e) => e.blob !== null)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Audio Effects</CardTitle>
            <CardDescription>Apply individual effects and download each separately</CardDescription>
          </div>
          {hasAnyProcessed && (
            <Button onClick={downloadAll} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Download All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {effects.map((effect, index) => (
            <Card key={effect.type} className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  {getEffectIcon(effect.type)}
                  {effect.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Effect Parameters */}
                {effect.type === "3d-audio" && (
                  <div className="space-y-2">
                    <Label className="text-xs">Intensity: {effect.params.intensity.toFixed(2)}</Label>
                    <Slider
                      value={[effect.params.intensity]}
                      onValueChange={([value]) => updateEffectParam(index, "intensity", value)}
                      min={0}
                      max={1}
                      step={0.1}
                      disabled={effect.processing}
                    />
                  </div>
                )}

                {effect.type === "bass-boost" && (
                  <div className="space-y-2">
                    <Label className="text-xs">Gain: {effect.params.gain} dB</Label>
                    <Slider
                      value={[effect.params.gain]}
                      onValueChange={([value]) => updateEffectParam(index, "gain", value)}
                      min={0}
                      max={12}
                      step={1}
                      disabled={effect.processing}
                    />
                  </div>
                )}

                {effect.type === "equalizer" && (
                  <div className="space-y-2">
                    <Label className="text-xs">60Hz: {effect.params.band1} dB</Label>
                    <Slider
                      value={[effect.params.band1]}
                      onValueChange={([value]) => updateEffectParam(index, "band1", value)}
                      min={-12}
                      max={12}
                      step={1}
                      disabled={effect.processing}
                    />
                    <Label className="text-xs">250Hz: {effect.params.band2} dB</Label>
                    <Slider
                      value={[effect.params.band2]}
                      onValueChange={([value]) => updateEffectParam(index, "band2", value)}
                      min={-12}
                      max={12}
                      step={1}
                      disabled={effect.processing}
                    />
                    <Label className="text-xs">1kHz: {effect.params.band3} dB</Label>
                    <Slider
                      value={[effect.params.band3]}
                      onValueChange={([value]) => updateEffectParam(index, "band3", value)}
                      min={-12}
                      max={12}
                      step={1}
                      disabled={effect.processing}
                    />
                    <Label className="text-xs">4kHz: {effect.params.band4} dB</Label>
                    <Slider
                      value={[effect.params.band4]}
                      onValueChange={([value]) => updateEffectParam(index, "band4", value)}
                      min={-12}
                      max={12}
                      step={1}
                      disabled={effect.processing}
                    />
                    <Label className="text-xs">12kHz: {effect.params.band5} dB</Label>
                    <Slider
                      value={[effect.params.band5]}
                      onValueChange={([value]) => updateEffectParam(index, "band5", value)}
                      min={-12}
                      max={12}
                      step={1}
                      disabled={effect.processing}
                    />
                  </div>
                )}

                {effect.type === "noise-reducer" && (
                  <div className="space-y-2">
                    <Label className="text-xs">Threshold: {effect.params.threshold.toFixed(3)}</Label>
                    <Slider
                      value={[effect.params.threshold]}
                      onValueChange={([value]) => updateEffectParam(index, "threshold", value)}
                      min={0.001}
                      max={0.1}
                      step={0.001}
                      disabled={effect.processing}
                    />
                  </div>
                )}

                {effect.type === "pitch-shift" && (
                  <div className="space-y-2">
                    <Label className="text-xs">Semitones: {effect.params.semitones}</Label>
                    <Slider
                      value={[effect.params.semitones]}
                      onValueChange={([value]) => updateEffectParam(index, "semitones", value)}
                      min={-12}
                      max={12}
                      step={1}
                      disabled={effect.processing}
                    />
                  </div>
                )}

                {effect.type === "reverb" && (
                  <div className="space-y-2">
                    <Label className="text-xs">Room Size: {effect.params.roomSize.toFixed(2)}</Label>
                    <Slider
                      value={[effect.params.roomSize]}
                      onValueChange={([value]) => updateEffectParam(index, "roomSize", value)}
                      min={0}
                      max={1}
                      step={0.1}
                      disabled={effect.processing}
                    />
                    <Label className="text-xs">Decay: {effect.params.decay.toFixed(1)}s</Label>
                    <Slider
                      value={[effect.params.decay]}
                      onValueChange={([value]) => updateEffectParam(index, "decay", value)}
                      min={0.5}
                      max={5}
                      step={0.5}
                      disabled={effect.processing}
                    />
                  </div>
                )}

                {/* Process Button */}
                <Button onClick={() => processEffect(index)} disabled={effect.processing} className="w-full" size="sm">
                  {effect.processing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Apply ${effect.name}`
                  )}
                </Button>

                {/* Preview and Download */}
                {effect.blob && (
                  <div className="space-y-2 pt-2 border-t">
                    <AudioPreview
                      blob={effect.blob}
                      label={`${effect.name} Preview`}
                      filename={`${file.name.split(".")[0]}_${effect.name.toLowerCase().replace(/\s+/g, "-")}.wav`}
                    />
                    <Button
                      onClick={() => downloadEffect(effect.blob!, effect.name)}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
