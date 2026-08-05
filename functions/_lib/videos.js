/**
 * Videos DB and Validation Helper
 */
import { extractYouTubeId } from './youtube.js';

export function validateVideoInput(data) {
  const errors = [];
  if (!data.title_uz || typeof data.title_uz !== 'string' || !data.title_uz.trim()) {
    errors.push("title_uz bo'sh bo'lmasligi kerak");
  }
  if (!data.category || typeof data.category !== 'string') {
    errors.push("category ko'rsatilishi shart");
  }

  const youtubeVideoId = extractYouTubeId(data.youtube_url);
  if (!youtubeVideoId) {
    errors.push("YouTube URL yaroqli emas");
  }

  return {
    valid: errors.length === 0,
    errors,
    youtubeVideoId
  };
}
