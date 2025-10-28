import { type NextRequest, NextResponse } from "next/server";
import { AudioProcessor } from "@/lib/audio-processor";

// Ensure this route runs in the Node.js runtime (not the Edge runtime).
// The handler uses Node Buffer and other Node-only APIs which are not
// available in the Edge (Web) runtime. For production deployments that
// default to the Edge runtime, explicitly set the runtime to 'nodejs'.
export const runtime = "nodejs";
export const maxDuration = 300; // Set max duration to 5 minutes

// Helper function to convert Blob to base64
async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  return `data:${blob.type};base64,${Buffer.from(buffer).toString("base64")}`;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    // Check file size (limit to 10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (audioFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size too large. Maximum size is 10MB" },
        { status: 400 }
      );
    }

    // Verify file type
    if (!audioFile.type.startsWith('audio/')) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload an audio file" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await audioFile.arrayBuffer());

    console.log(
      `[v0] Processing file: ${audioFile.name}, size: ${buffer.length} bytes`
    );

    // Create a new audio processor instance
    const audioProcessor = new AudioProcessor();

    // Create a File object from the buffer
    const file = new File([buffer], audioFile.name, { type: audioFile.type });

    // Process the audio file
    const { leftChannel, rightChannel } = await audioProcessor.separateChannels(
      file
    );

    // Convert blobs to base64
    const leftBase64 = await blobToBase64(leftChannel);
    const rightBase64 = await blobToBase64(rightChannel);

    return NextResponse.json({
      leftChannel: leftBase64,
      rightChannel: rightBase64,
    });
  } catch (error) {
    console.error("Error processing audio:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to process audio",
      },
      { status: 500 }
    );
  }
}

async function separateAudioChannels(buffer: Buffer): Promise<{
  leftChannel: Buffer;
  rightChannel: Buffer;
}> {
  try {
    // Parse WAV header
    const dataOffset = findDataChunk(buffer);
    if (dataOffset === -1) {
      throw new Error("Invalid WAV file: data chunk not found");
    }

    // Read WAV header info
    const numChannels = buffer.readUInt16LE(22);
    const sampleRate = buffer.readUInt32LE(24);
    const bitsPerSample = buffer.readUInt16LE(34);
    const bytesPerSample = bitsPerSample / 8;

    console.log(
      `[v0] Audio info: ${numChannels} channels, ${sampleRate}Hz, ${bitsPerSample} bits`
    );

    // Extract audio data
    const dataSize = buffer.readUInt32LE(dataOffset + 4);
    const audioData = buffer.subarray(
      dataOffset + 8,
      dataOffset + 8 + dataSize
    );

    if (numChannels === 1) {
      // Handle mono files - duplicate the mono channel to both left and right
      return handleMonoFile(audioData, sampleRate, bitsPerSample);
    } else if (numChannels === 2) {
      // Handle stereo files - separate left and right channels
      return handleStereoFile(
        audioData,
        sampleRate,
        bitsPerSample,
        bytesPerSample
      );
    } else {
      throw new Error(
        `Unsupported number of channels: ${numChannels}. Only mono and stereo files are supported.`
      );
    }
  } catch (error) {
    console.error("[v0] Error in separateAudioChannels:", error);
    throw error;
  }
}

function handleMonoFile(
  audioData: Buffer,
  sampleRate: number,
  bitsPerSample: number
): {
  leftChannel: Buffer;
  rightChannel: Buffer;
} {
  // For mono files, create stereo versions where:
  // - Left channel file: mono audio in left ear, silence in right ear
  // - Right channel file: silence in left ear, mono audio in right ear

  const bytesPerSample = bitsPerSample / 8;
  const numSamples = audioData.length / bytesPerSample;
  const stereoDataSize = audioData.length * 2; // Double the size for stereo

  const leftOnlyData = Buffer.alloc(stereoDataSize);
  const rightOnlyData = Buffer.alloc(stereoDataSize);

  for (let i = 0; i < numSamples; i++) {
    const monoSampleOffset = i * bytesPerSample;
    const stereoSampleOffset = i * bytesPerSample * 2;

    // Copy mono sample to left channel of left-only file
    for (let b = 0; b < bytesPerSample; b++) {
      leftOnlyData[stereoSampleOffset + b] = audioData[monoSampleOffset + b];
      leftOnlyData[stereoSampleOffset + bytesPerSample + b] = 0; // right channel silence
    }

    // Copy mono sample to right channel of right-only file
    for (let b = 0; b < bytesPerSample; b++) {
      rightOnlyData[stereoSampleOffset + b] = 0; // left channel silence
      rightOnlyData[stereoSampleOffset + bytesPerSample + b] =
        audioData[monoSampleOffset + b];
    }
  }

  const leftChannel = createStereoWavFile(
    leftOnlyData,
    sampleRate,
    bitsPerSample
  );
  const rightChannel = createStereoWavFile(
    rightOnlyData,
    sampleRate,
    bitsPerSample
  );

  return { leftChannel, rightChannel };
}

function handleStereoFile(
  audioData: Buffer,
  sampleRate: number,
  bitsPerSample: number,
  bytesPerSample: number
): {
  leftChannel: Buffer;
  rightChannel: Buffer;
} {
  const samplesPerChannel = audioData.length / (2 * bytesPerSample);

  // Create stereo data for left-only file (left channel + silence in right)
  const leftOnlyData = Buffer.alloc(audioData.length);
  // Create stereo data for right-only file (silence in left + right channel)
  const rightOnlyData = Buffer.alloc(audioData.length);

  // Process each stereo sample pair
  for (let i = 0; i < samplesPerChannel; i++) {
    const sampleOffset = i * 2 * bytesPerSample;

    // For left-only file: copy left channel, zero right channel
    for (let b = 0; b < bytesPerSample; b++) {
      leftOnlyData[sampleOffset + b] = audioData[sampleOffset + b]; // left channel
      leftOnlyData[sampleOffset + bytesPerSample + b] = 0; // right channel = silence
    }

    // For right-only file: zero left channel, copy right channel
    for (let b = 0; b < bytesPerSample; b++) {
      rightOnlyData[sampleOffset + b] = 0; // left channel = silence
      rightOnlyData[sampleOffset + bytesPerSample + b] =
        audioData[sampleOffset + bytesPerSample + b]; // right channel
    }
  }

  // Create stereo WAV files
  const leftChannel = createStereoWavFile(
    leftOnlyData,
    sampleRate,
    bitsPerSample
  );
  const rightChannel = createStereoWavFile(
    rightOnlyData,
    sampleRate,
    bitsPerSample
  );

  return { leftChannel, rightChannel };
}

function findDataChunk(buffer: Buffer): number {
  if (buffer.length < 12) {
    throw new Error("Invalid WAV file: file too small");
  }

  // WAV files start with RIFF header
  const riffHeader = buffer.toString("ascii", 0, 4);
  if (riffHeader !== "RIFF") {
    throw new Error(
      `Invalid WAV file: missing RIFF header (found: ${riffHeader})`
    );
  }

  const waveHeader = buffer.toString("ascii", 8, 12);
  if (waveHeader !== "WAVE") {
    throw new Error(`Invalid WAV file: not a WAVE file (found: ${waveHeader})`);
  }

  // Start parsing chunks after the WAVE identifier
  let offset = 12;

  while (offset < buffer.length - 8) {
    if (offset + 8 > buffer.length) {
      break;
    }

    const chunkId = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);

    console.log(`[v0] Found chunk: ${chunkId}, size: ${chunkSize}`);

    if (chunkId === "data") {
      console.log(`[v0] Found data chunk at offset: ${offset}`);
      return offset;
    }

    // Move to next chunk (chunk header is 8 bytes + chunk data)
    offset += 8 + chunkSize;

    // Ensure word alignment (chunks are padded to even byte boundaries)
    if (chunkSize % 2 === 1) {
      offset += 1;
    }

    // Safety check to prevent infinite loops
    if (offset >= buffer.length) {
      break;
    }
  }

  throw new Error("Invalid WAV file: data chunk not found");
}

function createStereoWavFile(
  audioData: Buffer,
  sampleRate: number,
  bitsPerSample: number
): Buffer {
  const header = Buffer.alloc(44);
  const dataLength = audioData.length;

  // RIFF header
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataLength, 4);
  header.write("WAVE", 8);

  // fmt chunk
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // chunk size
  header.writeUInt16LE(1, 20); // audio format (PCM)
  header.writeUInt16LE(2, 22); // number of channels (stereo)
  header.writeUInt32LE(sampleRate, 24); // sample rate
  header.writeUInt32LE(sampleRate * 2 * (bitsPerSample / 8), 28); // byte rate (stereo)
  header.writeUInt16LE(2 * (bitsPerSample / 8), 32); // block align (stereo)
  header.writeUInt16LE(bitsPerSample, 34); // bits per sample

  // data chunk
  header.write("data", 36);
  header.writeUInt32LE(dataLength, 40);

  return Buffer.concat([header, audioData]);
}
