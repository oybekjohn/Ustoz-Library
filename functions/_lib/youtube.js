/**
 * YouTube URL Parser va Validatsiyasi
 */

export function extractYouTubeId(url) {
  if (typeof url !== 'string') return null;
  const trimmed = url.trim();

  // Patternlar: watch?v=ID, youtu.be/ID, embed/ID, v/ID, shorts/ID
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = trimmed.match(regExp);

  if (match && match[1] && match[1].length === 11) {
    return match[1];
  }
  return null;
}

export function isValidYouTubeUrl(url) {
  return extractYouTubeId(url) !== null;
}

export function getYouTubeEmbedUrl(videoId) {
  if (!videoId || videoId.length !== 11) return null;
  return `https://www.youtube-nocookie.com/embed/${videoId}`;
}
