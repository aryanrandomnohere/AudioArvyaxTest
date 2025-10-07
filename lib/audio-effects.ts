export interface EffectConfig {
  type: "3d-audio" | "bass-boost" | "equalizer" | "noise-reducer" | "pitch-shift" | "reverb" | "reverse"
  params: Record<string, number>
}

export class AudioEffects {
  private audioContext: AudioContext

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext
  }

  /**
   * Apply 3D audio effect - enhances stereo width and spatial positioning
   */
  async apply3DAudio(audioBuffer: AudioBuffer, intensity = 0.5): Promise<AudioBuffer> {
    const sampleRate = audioBuffer.sampleRate
    const length = audioBuffer.length
    const numberOfChannels = Math.max(2, audioBuffer.numberOfChannels)

    const outputBuffer = this.audioContext.createBuffer(numberOfChannels, length, sampleRate)

    if (audioBuffer.numberOfChannels === 1) {
      // Convert mono to stereo with 3D effect
      const monoData = audioBuffer.getChannelData(0)
      const leftData = outputBuffer.getChannelData(0)
      const rightData = outputBuffer.getChannelData(1)

      for (let i = 0; i < length; i++) {
        const sample = monoData[i]
        // Create stereo width by phase shifting
        const delay = Math.floor(intensity * 10)
        leftData[i] = sample
        rightData[i] = i >= delay ? monoData[i - delay] : sample
      }
    } else {
      // Enhance existing stereo with wider soundstage
      const leftData = audioBuffer.getChannelData(0)
      const rightData = audioBuffer.getChannelData(1)
      const outputLeft = outputBuffer.getChannelData(0)
      const outputRight = outputBuffer.getChannelData(1)

      for (let i = 0; i < length; i++) {
        // Haas effect - slight delay and cross-feed for 3D effect
        const delay = Math.floor(intensity * 20)
        const crossfeed = 0.3 * intensity

        outputLeft[i] = leftData[i] + (i >= delay ? rightData[i - delay] * crossfeed : 0)
        outputRight[i] = rightData[i] + (i >= delay ? leftData[i - delay] * crossfeed : 0)

        // Normalize to prevent clipping
        outputLeft[i] = Math.max(-1, Math.min(1, outputLeft[i]))
        outputRight[i] = Math.max(-1, Math.min(1, outputRight[i]))
      }
    }

    return outputBuffer
  }

  /**
   * Apply bass boost - enhances low frequencies
   */
  async applyBassBoost(audioBuffer: AudioBuffer, gain = 6): Promise<AudioBuffer> {
    const offlineContext = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate,
    )

    const source = offlineContext.createBufferSource()
    source.buffer = audioBuffer

    // Create low-shelf filter for bass boost
    const bassFilter = offlineContext.createBiquadFilter()
    bassFilter.type = "lowshelf"
    bassFilter.frequency.value = 200 // Boost frequencies below 200Hz
    bassFilter.gain.value = gain // Boost amount in dB

    source.connect(bassFilter)
    bassFilter.connect(offlineContext.destination)

    source.start(0)
    return await offlineContext.startRendering()
  }

  /**
   * Apply equalizer - adjust multiple frequency bands
   */
  async applyEqualizer(
    audioBuffer: AudioBuffer,
    bands: { frequency: number; gain: number; q?: number }[],
  ): Promise<AudioBuffer> {
    const offlineContext = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate,
    )

    const source = offlineContext.createBufferSource()
    source.buffer = audioBuffer

    let currentNode: AudioNode = source

    // Create a filter for each band
    bands.forEach((band) => {
      const filter = offlineContext.createBiquadFilter()
      filter.type = "peaking"
      filter.frequency.value = band.frequency
      filter.gain.value = band.gain
      filter.Q.value = band.q || 1

      currentNode.connect(filter)
      currentNode = filter
    })

    currentNode.connect(offlineContext.destination)

    source.start(0)
    return await offlineContext.startRendering()
  }

  /**
   * Apply noise reduction - reduces background noise
   */
  async applyNoiseReduction(audioBuffer: AudioBuffer, threshold = 0.02): Promise<AudioBuffer> {
    const sampleRate = audioBuffer.sampleRate
    const length = audioBuffer.length
    const numberOfChannels = audioBuffer.numberOfChannels

    const outputBuffer = this.audioContext.createBuffer(numberOfChannels, length, sampleRate)

    for (let channel = 0; channel < numberOfChannels; channel++) {
      const inputData = audioBuffer.getChannelData(channel)
      const outputData = outputBuffer.getChannelData(channel)

      // Simple noise gate - attenuate signals below threshold
      for (let i = 0; i < length; i++) {
        const sample = inputData[i]
        const amplitude = Math.abs(sample)

        if (amplitude < threshold) {
          // Reduce noise by 80%
          outputData[i] = sample * 0.2
        } else {
          // Keep signal above threshold
          outputData[i] = sample
        }
      }
    }

    return outputBuffer
  }

  /**
   * Apply pitch shift - changes the pitch without affecting tempo
   */
  async applyPitchShift(audioBuffer: AudioBuffer, semitones: number): Promise<AudioBuffer> {
    const pitchRatio = Math.pow(2, semitones / 12)
    const newLength = Math.floor(audioBuffer.length / pitchRatio)

    const outputBuffer = this.audioContext.createBuffer(audioBuffer.numberOfChannels, newLength, audioBuffer.sampleRate)

    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const inputData = audioBuffer.getChannelData(channel)
      const outputData = outputBuffer.getChannelData(channel)

      // Simple resampling for pitch shift
      for (let i = 0; i < newLength; i++) {
        const sourceIndex = i * pitchRatio
        const index1 = Math.floor(sourceIndex)
        const index2 = Math.min(index1 + 1, inputData.length - 1)
        const fraction = sourceIndex - index1

        // Linear interpolation
        outputData[i] = inputData[index1] * (1 - fraction) + inputData[index2] * fraction
      }
    }

    return outputBuffer
  }

  /**
   * Apply reverb - adds room ambience
   */
  async applyReverb(audioBuffer: AudioBuffer, roomSize = 0.5, decay = 2): Promise<AudioBuffer> {
    const sampleRate = audioBuffer.sampleRate
    const length = audioBuffer.length
    const numberOfChannels = audioBuffer.numberOfChannels

    // Calculate reverb parameters
    const delayTime = Math.floor(roomSize * sampleRate * 0.05) // Up to 50ms delay
    const numReflections = 8
    const outputLength = length + Math.floor(decay * sampleRate)

    const outputBuffer = this.audioContext.createBuffer(numberOfChannels, outputLength, sampleRate)

    for (let channel = 0; channel < numberOfChannels; channel++) {
      const inputData = audioBuffer.getChannelData(channel)
      const outputData = outputBuffer.getChannelData(channel)

      // Copy original signal
      for (let i = 0; i < length; i++) {
        outputData[i] = inputData[i]
      }

      // Add multiple delayed reflections with decay
      for (let reflection = 1; reflection <= numReflections; reflection++) {
        const delay = delayTime * reflection
        const amplitude = Math.pow(0.5, reflection / 2) // Exponential decay

        for (let i = 0; i < length; i++) {
          const outputIndex = i + delay
          if (outputIndex < outputLength) {
            outputData[outputIndex] += inputData[i] * amplitude
          }
        }
      }

      // Normalize to prevent clipping
      let maxAmplitude = 0
      for (let i = 0; i < outputLength; i++) {
        maxAmplitude = Math.max(maxAmplitude, Math.abs(outputData[i]))
      }
      if (maxAmplitude > 1) {
        for (let i = 0; i < outputLength; i++) {
          outputData[i] /= maxAmplitude
        }
      }
    }

    return outputBuffer
  }

  /**
   * Reverse audio - plays audio backwards
   */
  async applyReverse(audioBuffer: AudioBuffer): Promise<AudioBuffer> {
    const sampleRate = audioBuffer.sampleRate
    const length = audioBuffer.length
    const numberOfChannels = audioBuffer.numberOfChannels

    const outputBuffer = this.audioContext.createBuffer(numberOfChannels, length, sampleRate)

    for (let channel = 0; channel < numberOfChannels; channel++) {
      const inputData = audioBuffer.getChannelData(channel)
      const outputData = outputBuffer.getChannelData(channel)

      // Reverse the samples
      for (let i = 0; i < length; i++) {
        outputData[i] = inputData[length - 1 - i]
      }
    }

    return outputBuffer
  }

  /**
   * Apply effect based on configuration
   */
  async applyEffect(audioBuffer: AudioBuffer, config: EffectConfig): Promise<AudioBuffer> {
    switch (config.type) {
      case "3d-audio":
        return this.apply3DAudio(audioBuffer, config.params.intensity || 0.5)

      case "bass-boost":
        return this.applyBassBoost(audioBuffer, config.params.gain || 6)

      case "equalizer":
        // Default 5-band EQ
        const bands = [
          { frequency: 60, gain: config.params.band1 || 0 },
          { frequency: 250, gain: config.params.band2 || 0 },
          { frequency: 1000, gain: config.params.band3 || 0 },
          { frequency: 4000, gain: config.params.band4 || 0 },
          { frequency: 12000, gain: config.params.band5 || 0 },
        ]
        return this.applyEqualizer(audioBuffer, bands)

      case "noise-reducer":
        return this.applyNoiseReduction(audioBuffer, config.params.threshold || 0.02)

      case "pitch-shift":
        return this.applyPitchShift(audioBuffer, config.params.semitones || 0)

      case "reverb":
        return this.applyReverb(audioBuffer, config.params.roomSize || 0.5, config.params.decay || 2)

      case "reverse":
        return this.applyReverse(audioBuffer)

      default:
        return audioBuffer
    }
  }
}
