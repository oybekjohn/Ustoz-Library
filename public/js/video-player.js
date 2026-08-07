/* ============================================
   DL-library.uz — Video pleyer sahifasi
   YouTube (nocookie) — zamonaviy, responsiv pleyer.
   ============================================ */

import { saveItemProgress } from './local-progress.js';

const TEXTS = {
  uz: { about: "Video haqida", source: "Manba: YouTube" },
  ru: { about: "О видео", source: "Источник: YouTube" },
  en: { about: "About this video", source: "Source: YouTube" },
};

export function initVideoPlayer(video, containerEl, { lang = 'uz' } = {}) {
  const tr = TEXTS[lang] || TEXTS.uz;
  const title = video[`title_${lang}`] || video.title_uz || '';
  const desc = video[`description_${lang}`] || video.description_uz || '';
  const embedUrl = `https://www.youtube-nocookie.com/embed/${video.youtube_video_id}?rel=0&modestbranding=1&color=white`;

  containerEl.innerHTML = `
    <section class="video-page">
      <div class="video-page__frame-wrap">
        <iframe
          class="video-page__frame"
          src="${embedUrl}"
          title=""
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
          loading="lazy"></iframe>
      </div>
      <div class="video-page__info">
        <h2 class="video-page__title"></h2>
        ${desc ? `
          <div class="video-page__about">
            <h3>${tr.about}</h3>
            <p class="video-page__desc"></p>
          </div>` : ''}
        <p class="video-page__source">${tr.source}</p>
      </div>
    </section>
  `;

  containerEl.querySelector('.video-page__title').textContent = title;
  containerEl.querySelector('.video-page__frame').title = title;
  const descNode = containerEl.querySelector('.video-page__desc');
  if (descNode) descNode.textContent = desc;

  saveItemProgress('videos', video.id, { opened: true });
}
