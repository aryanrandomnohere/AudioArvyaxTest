export class DownloadManager {
  private static instance: DownloadManager
  private downloadUrls: Map<string, string> = new Map()

  private constructor() {}

  static getInstance(): DownloadManager {
    if (!DownloadManager.instance) {
      DownloadManager.instance = new DownloadManager()
    }
    return DownloadManager.instance
  }

  createDownloadUrl(blob: Blob, key: string): string {
    // Clean up existing URL if it exists
    this.revokeDownloadUrl(key)

    const url = URL.createObjectURL(blob)
    this.downloadUrls.set(key, url)
    return url
  }

  revokeDownloadUrl(key: string): void {
    const url = this.downloadUrls.get(key)
    if (url) {
      URL.revokeObjectURL(url)
      this.downloadUrls.delete(key)
    }
  }

  downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.style.display = "none"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  getFileSize(blob: Blob): string {
    const bytes = blob.size
    if (bytes === 0) return "0 Bytes"

    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  cleanup(): void {
    this.downloadUrls.forEach((url) => URL.revokeObjectURL(url))
    this.downloadUrls.clear()
  }
}
