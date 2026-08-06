/**
 * Video Player & Progress Tracker
 */
import { currentUser } from './auth.js';
import { renderAnonymousWarning } from './presentation-viewer.js';

let videoId = null;
let watchInterval = null;
let durationSeconds = 0;
let currentTime = 0;

export function initVideoPlayer(id, youtubeVideoId, durationSec, containerEl) {
  videoId = id;
  durationSeconds = durationSec || 0;
  currentTime = 0;

  // renderAnonymousWarning — hozircha o'chirilgan

  const embedUrl = `https://www.youtube-nocookie.com/embed/${youtubeVideoId}?enablejsapi=1`;

  containerEl.innerHTML += `
    <div class="video-player-container" id="video-player-box">
      <div class="video-aspect-ratio">
        <iframe id="yt-video-iframe" src="${embedUrl}" width="100%" height="480" frameborder="0" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>
      </div>
    </div>
  `;

  // Progress tracking hozircha o'chirilgan — keyingi versiyada Google OAuth bilan qaytariladi
}

function startWatchProgressTimer() {
  clearInterval(watchInterval);
  watchInterval = setInterval(async () => {
    currentTime += 10;
    const percent = durationSeconds > 0 ? (currentTime / durationSeconds) * 100 : 50;

    try {
      await fetch(`/api/progress/video/${videoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          progress_percent: Math.min(100, percent),
          position_value: currentTime
        })
      });
    } catch (err) {
      console.error('Video progress error:', err);
    }
  }, 15000);
}
