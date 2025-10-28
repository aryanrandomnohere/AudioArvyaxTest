declare module "web-audio-engine" {
  export class OfflineAudioContext {
    constructor(numberOfChannels: number, length: number, sampleRate: number);
    decodeAudioData(audioData: ArrayBuffer): Promise<AudioBuffer>;
    createBuffer(
      numberOfChannels: number,
      length: number,
      sampleRate: number
    ): AudioBuffer;
  }
}
=