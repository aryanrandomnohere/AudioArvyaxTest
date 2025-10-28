import { Readable } from "stream";

export class AudioProcessor {
  private audioContext: any;

  constructor() {
    if (typeof window !== "undefined") {
      this.audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    }
  }

  private async createServerContext() {
    try {
      // Only import on server side
      const { OfflineAudioContext } = await import('web-audio-engine');
      return new OfflineAudioContext(2, 44100 * 10, 44100);
    } catch (error) {
      console.error('Failed to create server audio context:', error);
      throw new Error('Failed to initialize audio processing');
    }
  }

  async separateChannels(audioFile: File): Promise<{
    leftChannel: Blob;
    rightChannel: Blob;
  }> {
    try {
      console.log("[v0] Starting audio separation process");

      // Read the audio file as array buffer
      const arrayBuffer = await audioFile.arrayBuffer();
      console.log("[v0] Audio file loaded, size:", arrayBuffer.byteLength);

      // Create or get audio context
      const ctx = this.audioContext || await this.createServerContext();
      if (!ctx) {
        throw new Error("Failed to initialize audio context");
      }

      // Decode the audio data
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      console.log(
        "[v0] Audio decoded - Channels:",
        audioBuffer.numberOfChannels,
        "Sample Rate:",
        audioBuffer.sampleRate,
        "Duration:",
        audioBuffer.duration
      );

      // Check if the audio is stereo
      if (audioBuffer.numberOfChannels < 2) {
        throw new Error("Audio file must be stereo (2 channels) to separate");
      }

      // Get the sample rate and length
      const sampleRate = audioBuffer.sampleRate;
      const length = audioBuffer.length;

      // Create new audio buffers for left and right channels (mono output)
      const leftBuffer = ctx.createBuffer(1, length, sampleRate);
      const rightBuffer = ctx.createBuffer(1, length, sampleRate);

      // Get the channel data
      const leftChannelData = audioBuffer.getChannelData(0); // Left channel
      const rightChannelData = audioBuffer.getChannelData(1); // Right channel

      console.log(
        "[v0] Left channel sample range:",
        Math.min(...leftChannelData),
        "to",
        Math.max(...leftChannelData)
      );
      console.log(
        "[v0] Right channel sample range:",
        Math.min(...rightChannelData),
        "to",
        Math.max(...rightChannelData)
      );

      // Copy the data to new buffers (each becomes a mono file)
      leftBuffer.copyToChannel(leftChannelData, 0);
      rightBuffer.copyToChannel(rightChannelData, 0);

      // Convert buffers to WAV blobs
      const leftBlob = this.audioBufferToWav(leftBuffer);
      const rightBlob = this.audioBufferToWav(rightBuffer);

      console.log(
        "[v0] Channel separation complete - Left blob size:",
        leftBlob.size,
        "Right blob size:",
        rightBlob.size
      );

      return {
        leftChannel: leftBlob,
        rightChannel: rightBlob,
      };
    } catch (error) {
      console.error('[v0] Error in separateChannels:', error);
      throw error;
    }
  }

  private audioBufferToWav(buffer: AudioBuffer): Blob {
    const length = buffer.length;
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
    const view = new DataView(arrayBuffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    let offset = 0;

    // RIFF chunk descriptor
    writeString(offset, "RIFF");
    offset += 4;
    view.setUint32(offset, 36 + length * numberOfChannels * 2, true);
    offset += 4;
    writeString(offset, "WAVE");
    offset += 4;

    // FMT sub-chunk
    writeString(offset, "fmt ");
    offset += 4;
    view.setUint32(offset, 16, true); // Sub-chunk size
    offset += 4;
    view.setUint16(offset, 1, true); // Audio format (PCM)
    offset += 2;
    view.setUint16(offset, numberOfChannels, true);
    offset += 2;
    view.setUint32(offset, sampleRate, true);
    offset += 4;
    view.setUint32(offset, sampleRate * numberOfChannels * 2, true); // Byte rate
    offset += 4;
    view.setUint16(offset, numberOfChannels * 2, true); // Block align
    offset += 2;
    view.setUint16(offset, 16, true); // Bits per sample
    offset += 2;

    // Data sub-chunk
    writeString(offset, "data");
    offset += 4;
    view.setUint32(offset, length * numberOfChannels * 2, true);
    offset += 4;

    // Write the PCM samples
    const channels = [];
    for (let i = 0; i < numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    let sampleOffset = offset;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, channels[channel][i]));
        view.setInt16(
          sampleOffset,
          sample < 0 ? sample * 0x8000 : sample * 0x7fff,
          true
        );
        sampleOffset += 2;
      }
    }

    return new Blob([arrayBuffer], { type: "audio/wav" });
  }

  dispose() {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
