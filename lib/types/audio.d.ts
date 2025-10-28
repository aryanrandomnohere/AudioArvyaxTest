export interface AudioProcessingResult {
  leftChannel: Blob;
  rightChannel: Blob;
}

export interface AudioContext {
  decodeAudioData(buffer: ArrayBuffer): Promise<AudioBuffer>;
  createBuffer(numberOfChannels: number, length: number, sampleRate: number): AudioBuffer;
}

export interface AudioBuffer {
  numberOfChannels: number;
  sampleRate: number;
  length: number;
  duration: number;
  getChannelData(channel: number): Float32Array;
  copyToChannel(source: Float32Array, channelNumber: number): void;
}