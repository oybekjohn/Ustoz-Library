/**
 * YouTube video haqida ochiq ma'lumot olish (API kaliti talab qilinmaydi).
 *
 * oEmbed endpointi sarlavha, kanal nomi va thumbnail qaytaradi.
 * XAVFSIZLIK: faqat qat'iy tekshirilgan video ID bilan so'rov yuboriladi,
 * shu sababli bu yerda SSRF xavfi yo'q — URL foydalanuvchidan olinmaydi.
 */

const OEMBED_TIMEOUT_MS = 10_000;

export async function fetchYouTubeMeta(videoId) {
  if (!/^[A-Za-z0-9_-]{11}$/.test(String(videoId || ''))) {
    throw new Error("YouTube video ID noto'g'ri");
  }

  const target = `https://www.youtube.com/oembed?url=${encodeURIComponent(
    `https://www.youtube.com/watch?v=${videoId}`,
  )}&format=json`;

  const controller = new AbortController();
  setTimeout(() => controller.abort(), OEMBED_TIMEOUT_MS);

  try {
    const response = await fetch(target, { signal: controller.signal });
    if (!response.ok) return { title: null, author: null };
    const data = await response.json();
    return {
      title: typeof data?.title === 'string' ? data.title.slice(0, 300) : null,
      author: typeof data?.author_name === 'string' ? data.author_name.slice(0, 200) : null,
    };
  } catch {
    // Video yopiq yoki tarmoq xatosi — bot oqimi to'xtamasligi kerak
    return { title: null, author: null };
  }
}
