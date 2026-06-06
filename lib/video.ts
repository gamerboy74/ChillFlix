/**
 * Resolves a direct, playable video file URL for preview components (hover cards, billboards, modals).
 * Since scraped movies store either a Cinevo watch page URL or a stringified JSON server options map,
 * HTML5 <video> elements cannot play them directly.
 * 
 * If the URL is a direct video file, it returns it; otherwise, it returns a high-quality public domain trailer.
 */
export function getPreviewVideoSrc(videoUrl: string | null | undefined): string {
  const fallbackPreview = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4";
  
  if (!videoUrl) return fallbackPreview;
  
  const trimmed = videoUrl.trim();
  
  // If it is a stringified JSON cache, or a Cinevo watch link, it cannot be played in a <video> element.
  if (trimmed.startsWith("{") || trimmed.includes("cinevo.us") || trimmed.includes("watch")) {
    return fallbackPreview;
  }
  
  // Check if it looks like a direct video file extension or generic streaming manifest
  const isDirectVideo = trimmed.match(/\.(mp4|m3u8|webm|ogg)/i) || 
                        trimmed.includes("googleapis.com/gtv-videos-bucket");
  
  if (isDirectVideo) {
    return trimmed;
  }
  
  return fallbackPreview;
}
