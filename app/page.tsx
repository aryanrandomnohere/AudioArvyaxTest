"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Download,
  Loader2,
  AlertCircle,
  FileAudio,
  Info,
  Headphones,
} from "lucide-react";
import { ClientAudioProcessor } from "@/lib/client-audio-processor";
import { DownloadManager } from "@/lib/download-manager";
import { AudioPreview } from "@/components/audio-preview";
import { DragDropZone } from "@/components/drag-drop-zone";
import { Footer } from "@/components/footer";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { IndividualEffects } from "@/components/individual-effects";

export default function AudioSeparator() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processedFiles, setProcessedFiles] = useState<{
    left: Blob | null;
    right: Blob | null;
  }>({ left: null, right: null });

  const audioProcessorRef = useRef<ClientAudioProcessor | null>(null);
  const downloadManagerRef = useRef<DownloadManager>(
    DownloadManager.getInstance()
  );

  useEffect(() => {
    // Check for browser compatibility
    if (typeof window !== "undefined") {
      const AudioContext =
        window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) {
        setError(
          "Your browser does not support the Web Audio API. Please try using a modern browser like Chrome, Firefox, or Safari."
        );
        return;
      }

      // Initialize the audio processor
      if (!audioProcessorRef.current) {
        audioProcessorRef.current = new ClientAudioProcessor();
      }
    }

    return () => {
      // Cleanup on unmount
      downloadManagerRef.current.cleanup();
    };
  }, []);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setProcessedFiles({ left: null, right: null });
    setError(null);

    // Clean up previous download URLs
    downloadManagerRef.current.revokeDownloadUrl("left");
    downloadManagerRef.current.revokeDownloadUrl("right");
  };

  const processAudio = async () => {
    if (!file) return;

    setProcessing(true);
    setError(null);

    try {
      if (!audioProcessorRef.current) {
        audioProcessorRef.current = new ClientAudioProcessor();
      }

      const { leftChannel, rightChannel } =
        await audioProcessorRef.current.separateChannels(file);

      setProcessedFiles({
        left: leftChannel,
        right: rightChannel,
      });
    } catch (error) {
      console.error("Error processing audio:", error);
      setError(
        error instanceof Error ? error.message : "Failed to process audio file"
      );
    } finally {
      setProcessing(false);
    }
  };

  const convertMp3ToWav = async (file: File): Promise<ArrayBuffer> => {
    const audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();

    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      const wavBuffer = audioBufferToWav(audioBuffer);
      return wavBuffer;
    } finally {
      await audioContext.close();
    }
  };

  const audioBufferToWav = (buffer: AudioBuffer): ArrayBuffer => {
    const length = buffer.length;
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const bytesPerSample = 2; // 16-bit
    const blockAlign = numberOfChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = length * blockAlign;
    const bufferSize = 44 + dataSize;

    const arrayBuffer = new ArrayBuffer(bufferSize);
    const view = new DataView(arrayBuffer);

    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, "RIFF");
    view.setUint32(4, bufferSize - 8, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true); // PCM format
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true); // 16-bit
    writeString(36, "data");
    view.setUint32(40, dataSize, true);

    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(
          -1,
          Math.min(1, buffer.getChannelData(channel)[i])
        );
        view.setInt16(offset, sample * 0x7fff, true);
        offset += 2;
      }
    }

    return arrayBuffer;
  };

  const downloadFile = (blob: Blob, filename: string) => {
    downloadManagerRef.current.downloadFile(blob, filename);
  };

  const downloadBoth = () => {
    if (processedFiles.left && processedFiles.right) {
      downloadFile(processedFiles.left, getFileName("left"));
      setTimeout(() => {
        downloadFile(processedFiles.right!, getFileName("right"));
      }, 100);
    }
  };

  const getFileName = (suffix: string) => {
    if (!file) return `audio_${suffix}.wav`;
    const baseName = file.name.split(".")[0];
    return `${baseName}_${suffix}.wav`;
  };

  const resetApp = () => {
    setFile(null);
    setProcessedFiles({ left: null, right: null });
    setError(null);
    downloadManagerRef.current.cleanup();
  };

  return (
    <div className="min-h-screen bg-background gradient-bg flex flex-col">
      <main className="flex-1 p-4 sm:p-8">
        <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Headphones className="w-8 h-8 text-primary" />
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                Audio Processing Studio
              </h1>
            </div>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Separate stereo channels and apply professional audio effects -
              all in your browser
            </p>
          </div>

          <div className="space-y-6">
            {/* Info Alert */}
            <Alert className="max-w-2xl mx-auto">
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Privacy-focused:</strong> All processing happens locally
                in your browser. No audio files are uploaded to any server.
              </AlertDescription>
            </Alert>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Upload Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileAudio className="w-5 h-5" />
                  Upload Audio File
                </CardTitle>
                <CardDescription>
                  Select or drag and drop an audio file (MP3, WAV, M4A, FLAC) to
                  get started
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <DragDropZone
                  onFileSelect={handleFileSelect}
                  currentFile={file}
                  disabled={processing}
                />

                {file && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FileAudio className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm font-medium truncate">
                          {file.name}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </span>
                    </div>

                    <Button
                      variant="outline"
                      onClick={resetApp}
                      disabled={processing}
                      className="w-full bg-transparent"
                    >
                      Upload Different File
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {file && <IndividualEffects file={file} onError={setError} />}

            {file && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Headphones className="w-5 h-5" />
                    Stereo Channel Separator
                  </CardTitle>
                  <CardDescription>
                    Separate your audio into left and right channels
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    onClick={processAudio}
                    disabled={processing}
                    className="w-full"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Separating Channels...
                      </>
                    ) : (
                      "Separate Channels"
                    )}
                  </Button>

                  {/* Results Section */}
                  {(processedFiles.left || processedFiles.right) && (
                    <div className="space-y-4 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">Separated Channels</h3>
                        {processedFiles.left && processedFiles.right && (
                          <Button
                            onClick={downloadBoth}
                            variant="outline"
                            size="sm"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download Both
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {processedFiles.left && (
                          <div className="space-y-3">
                            <h4 className="font-medium text-sm flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                              Left Channel
                            </h4>
                            <AudioPreview
                              blob={processedFiles.left}
                              label="Left Channel Audio"
                              filename={getFileName("left")}
                            />
                            <Button
                              variant="outline"
                              onClick={() =>
                                downloadFile(
                                  processedFiles.left!,
                                  getFileName("left")
                                )
                              }
                              className="w-full"
                              size="sm"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download Left
                            </Button>
                          </div>
                        )}

                        {processedFiles.right && (
                          <div className="space-y-3">
                            <h4 className="font-medium text-sm flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-red-500"></div>
                              Right Channel
                            </h4>
                            <AudioPreview
                              blob={processedFiles.right}
                              label="Right Channel Audio"
                              filename={getFileName("right")}
                            />
                            <Button
                              variant="outline"
                              onClick={() =>
                                downloadFile(
                                  processedFiles.right!,
                                  getFileName("right")
                                )
                              }
                              className="w-full"
                              size="sm"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download Right
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
