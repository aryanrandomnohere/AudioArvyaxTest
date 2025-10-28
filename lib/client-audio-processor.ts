export class ClientAudioProcessor {
  private audioContext: AudioContext;

  constructor() {
    this.audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
  }

  async separateChannels(
    audioFile: File
  ): Promise<{ leftChannel: Blob; rightChannel: Blob }> {
    try {
      // Read the file
      const arrayBuffer = await audioFile.arrayBuffer();

      // Decode the audio
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

      if (audioBuffer.numberOfChannels < 2) {
        throw new Error("Audio file must be stereo (2 channels) to separate");
      }

      // Create buffers for each channel
      const leftBuffer = this.audioContext.createBuffer(
        1,
        audioBuffer.length,
        audioBuffer.sampleRate
      );
      const rightBuffer = this.audioContext.createBuffer(
        1,
        audioBuffer.length,
        audioBuffer.sampleRate
      );

      // Copy channel data
      leftBuffer.copyToChannel(audioBuffer.getChannelData(0), 0);
      rightBuffer.copyToChannel(audioBuffer.getChannelData(1), 0);

      // Convert to WAV blobs
      const leftBlob = await this.audioBufferToWav(leftBuffer);
      const rightBlob = await this.audioBufferToWav(rightBuffer);

      return {
        leftChannel: leftBlob,
        rightChannel: rightBlob,
      };
    } catch (error) {
      console.error("Error processing audio:", error);
      throw error;
    }
  }

  private async audioBufferToWav(buffer: AudioBuffer): Promise<Blob> {
    const length = buffer.length;
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const arrayBuffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(arrayBuffer);

    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    // Write WAV header
    writeString(0, "RIFF");
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, length * 2, true);

    // Write audio data
    const samples = buffer.getChannelData(0);
    let offset = 44;
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(
        offset,
        sample < 0 ? sample * 0x8000 : sample * 0x7fff,
        true
      );
      offset += 2;
    }

    return new Blob([arrayBuffer], { type: "audio/wav" });
  }
}
