"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Wand2, Volume2, Sliders, ShieldOff, Music, Radio, RotateCcw, X } from "lucide-react"
import type { EffectConfig } from "@/lib/audio-effects"

interface EffectSelectorProps {
  onEffectChange: (effects: EffectConfig[]) => void
  disabled?: boolean
}

const effectIcons = {
  "3d-audio": Wand2,
  "bass-boost": Volume2,
  equalizer: Sliders,
  "noise-reducer": ShieldOff,
  "pitch-shift": Music,
  reverb: Radio,
  reverse: RotateCcw,
}

const effectNames = {
  "3d-audio": "3D Audio",
  "bass-boost": "Bass Booster",
  equalizer: "Equalizer",
  "noise-reducer": "Noise Reducer",
  "pitch-shift": "Pitch Shifter",
  reverb: "Reverb",
  reverse: "Reverse Audio",
}

const effectDescriptions = {
  "3d-audio": "Enhance stereo sound with spatial 3D effect",
  "bass-boost": "Boost low frequencies for more bass",
  equalizer: "Adjust frequency bands",
  "noise-reducer": "Reduce background noise",
  "pitch-shift": "Change pitch without affecting tempo",
  reverb: "Add room ambience and echo",
  reverse: "Play audio backwards",
}

export function EffectSelector({ onEffectChange, disabled }: EffectSelectorProps) {
  const [selectedEffects, setSelectedEffects] = useState<EffectConfig[]>([])
  const [currentEffect, setCurrentEffect] = useState<string>("")

  const addEffect = (effectType: string) => {
    if (!effectType) return

    const defaultParams: Record<string, Record<string, number>> = {
      "3d-audio": { intensity: 0.5 },
      "bass-boost": { gain: 6 },
      equalizer: { band1: 0, band2: 0, band3: 0, band4: 0, band5: 0 },
      "noise-reducer": { threshold: 0.02 },
      "pitch-shift": { semitones: 0 },
      reverb: { roomSize: 0.5, decay: 2 },
      reverse: {},
    }

    const newEffect: EffectConfig = {
      type: effectType as any,
      params: defaultParams[effectType] || {},
    }

    const updated = [...selectedEffects, newEffect]
    setSelectedEffects(updated)
    onEffectChange(updated)
    setCurrentEffect("")
  }

  const removeEffect = (index: number) => {
    const updated = selectedEffects.filter((_, i) => i !== index)
    setSelectedEffects(updated)
    onEffectChange(updated)
  }

  const updateEffectParam = (index: number, param: string, value: number) => {
    const updated = [...selectedEffects]
    updated[index].params[param] = value
    setSelectedEffects(updated)
    onEffectChange(updated)
  }

  const clearAllEffects = () => {
    setSelectedEffects([])
    onEffectChange([])
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sliders className="w-5 h-5" />
              Audio Effects
            </CardTitle>
            <CardDescription>Add and configure audio effects to enhance your audio</CardDescription>
          </div>
          {selectedEffects.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearAllEffects} disabled={disabled}>
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Effect Selector */}
        <div className="flex gap-2">
          <Select value={currentEffect} onValueChange={setCurrentEffect} disabled={disabled}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select an effect to add..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3d-audio">
                <div className="flex items-center gap-2">
                  <Wand2 className="w-4 h-4" />
                  3D Audio
                </div>
              </SelectItem>
              <SelectItem value="bass-boost">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4" />
                  Bass Booster
                </div>
              </SelectItem>
              <SelectItem value="equalizer">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4" />
                  Equalizer
                </div>
              </SelectItem>
              <SelectItem value="noise-reducer">
                <div className="flex items-center gap-2">
                  <ShieldOff className="w-4 h-4" />
                  Noise Reducer
                </div>
              </SelectItem>
              <SelectItem value="pitch-shift">
                <div className="flex items-center gap-2">
                  <Music className="w-4 h-4" />
                  Pitch Shifter
                </div>
              </SelectItem>
              <SelectItem value="reverb">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4" />
                  Reverb
                </div>
              </SelectItem>
              <SelectItem value="reverse">
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" />
                  Reverse Audio
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => addEffect(currentEffect)} disabled={!currentEffect || disabled}>
            Add Effect
          </Button>
        </div>

        {/* Selected Effects */}
        {selectedEffects.length > 0 && (
          <div className="space-y-3">
            <div className="text-sm font-medium">Active Effects ({selectedEffects.length})</div>
            <div className="space-y-3">
              {selectedEffects.map((effect, index) => {
                const Icon = effectIcons[effect.type]
                return (
                  <Card key={index} className="border-muted">
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-primary" />
                          <div>
                            <div className="font-medium text-sm">{effectNames[effect.type]}</div>
                            <div className="text-xs text-muted-foreground">{effectDescriptions[effect.type]}</div>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => removeEffect(index)} disabled={disabled}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Effect-specific controls */}
                      {effect.type === "3d-audio" && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Intensity</Label>
                            <span className="text-xs text-muted-foreground">
                              {Math.round(effect.params.intensity * 100)}%
                            </span>
                          </div>
                          <Slider
                            value={[effect.params.intensity * 100]}
                            onValueChange={([value]) => updateEffectParam(index, "intensity", value / 100)}
                            min={0}
                            max={100}
                            step={1}
                            disabled={disabled}
                          />
                        </div>
                      )}

                      {effect.type === "bass-boost" && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Gain</Label>
                            <span className="text-xs text-muted-foreground">{effect.params.gain} dB</span>
                          </div>
                          <Slider
                            value={[effect.params.gain]}
                            onValueChange={([value]) => updateEffectParam(index, "gain", value)}
                            min={0}
                            max={20}
                            step={1}
                            disabled={disabled}
                          />
                        </div>
                      )}

                      {effect.type === "equalizer" && (
                        <div className="space-y-3">
                          <div className="text-xs font-medium">Frequency Bands</div>
                          {[
                            { key: "band1", label: "60 Hz", freq: "60Hz" },
                            { key: "band2", label: "250 Hz", freq: "250Hz" },
                            { key: "band3", label: "1 kHz", freq: "1kHz" },
                            { key: "band4", label: "4 kHz", freq: "4kHz" },
                            { key: "band5", label: "12 kHz", freq: "12kHz" },
                          ].map((band) => (
                            <div key={band.key} className="space-y-1">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs">{band.label}</Label>
                                <span className="text-xs text-muted-foreground">
                                  {effect.params[band.key] > 0 ? "+" : ""}
                                  {effect.params[band.key]} dB
                                </span>
                              </div>
                              <Slider
                                value={[effect.params[band.key]]}
                                onValueChange={([value]) => updateEffectParam(index, band.key, value)}
                                min={-12}
                                max={12}
                                step={1}
                                disabled={disabled}
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {effect.type === "noise-reducer" && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Threshold</Label>
                            <span className="text-xs text-muted-foreground">
                              {(effect.params.threshold * 100).toFixed(1)}%
                            </span>
                          </div>
                          <Slider
                            value={[effect.params.threshold * 1000]}
                            onValueChange={([value]) => updateEffectParam(index, "threshold", value / 1000)}
                            min={5}
                            max={100}
                            step={1}
                            disabled={disabled}
                          />
                        </div>
                      )}

                      {effect.type === "pitch-shift" && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Semitones</Label>
                            <span className="text-xs text-muted-foreground">
                              {effect.params.semitones > 0 ? "+" : ""}
                              {effect.params.semitones}
                            </span>
                          </div>
                          <Slider
                            value={[effect.params.semitones]}
                            onValueChange={([value]) => updateEffectParam(index, "semitones", value)}
                            min={-12}
                            max={12}
                            step={1}
                            disabled={disabled}
                          />
                        </div>
                      )}

                      {effect.type === "reverb" && (
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs">Room Size</Label>
                              <span className="text-xs text-muted-foreground">
                                {Math.round(effect.params.roomSize * 100)}%
                              </span>
                            </div>
                            <Slider
                              value={[effect.params.roomSize * 100]}
                              onValueChange={([value]) => updateEffectParam(index, "roomSize", value / 100)}
                              min={0}
                              max={100}
                              step={1}
                              disabled={disabled}
                            />
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs">Decay</Label>
                              <span className="text-xs text-muted-foreground">{effect.params.decay.toFixed(1)}s</span>
                            </div>
                            <Slider
                              value={[effect.params.decay * 10]}
                              onValueChange={([value]) => updateEffectParam(index, "decay", value / 10)}
                              min={5}
                              max={50}
                              step={1}
                              disabled={disabled}
                            />
                          </div>
                        </div>
                      )}

                      {effect.type === "reverse" && (
                        <div className="text-xs text-muted-foreground">
                          This effect will reverse the audio playback. No additional parameters needed.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {selectedEffects.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No effects added yet. Select an effect from the dropdown above to get started.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
