export function Footer() {
  return (
    <footer className="border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-4xl mx-auto px-8 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            <p>Audio Channel Separator - Process audio files locally in your browser</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>No data uploaded to servers</span>
            <span>•</span>
            <span>100% client-side processing</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
