function valueOrFallback(value, fallback) {
  const text = String(value || '').trim();
  return text || fallback;
}

export function buildCoverPrompt(metadata, categoryName) {
  const title = valueOrFallback(metadata?.title?.uz, 'Nomsiz kitob');
  const author = valueOrFallback(metadata?.author, "Noma'lum muallif");
  const year = valueOrFallback(metadata?.year, "Noma'lum");
  const category = valueOrFallback(categoryName, 'Boshqa');

  return `Kvadrat shaklli (1:1, masalan 1024x1024) kitob muqovasi dizaynini yarat.

MAVZU: "${title}" nomli kitob, janr/yo'nalishi: ${category}, muallif(lar)i: ${author}, nashr yili: ${year}.

FON RASMI:
- ${category} yo'nalishiga va "${title}" nomiga mazmunan mos keladigan, kitob mavzusini aks ettiruvchi tasviriy fon yarat.
- Fon professional nashriyot muqovasi darajasida sifatli, badiiy va janrga mos ranglar palitrasida bo'lsin.
- Fon matnni to'sib qo'ymasligi uchun markazda yumshoq qorong'ulashtirish yoki gradient overlay qo'llansin.

MATN JOYLASHUVI:
- Kitob nomi "${title}" muqova markazida eng yirik shrift bilan yozilsin.
- Yo'nalish "${category}" nom ustida yoki tagida kichikroq shrift bilan yozilsin.
- Muallif(lar) "${author}" nom ostida o'rta o'lchamda yozilsin.
- Nashr yili "${year}" muqovaning pastki qismida kichik shrift bilan yozilsin.
- Barcha matnlar markaziy o'q bo'ylab tekislansin va fon bilan yuqori kontrastda, aniq o'qilsin.

USLUB: zamonaviy, professional nashriyot muqovasi, yuqori sifatli, aniq va toza kompozitsiya, ortiqcha bezaklarsiz.

FORMAT: kvadrat, 1:1 nisbat, 1024x1024.`;
}
