# DL-library.uz domenini ulash qo'llanmasi

Joriy jonli sayt: **https://ustoz-library.pages.dev** (Cloudflare Pages, loyiha nomi `ustoz-library`).
Maqsad: **`dl-library.uz`** (va `www.dl-library.uz`) shu saytga ulanishi.

> Kodda `og:url` va `canonical` allaqachon `https://dl-library.uz/` ga sozlangan — domen ulangach avtomatik to'g'ri ishlaydi.

---

## 1-qadam. Domenni sotib olish (.uz registrar)

`.uz` domenlari **Cloudflare Registrar'da sotilmaydi**. Shuning uchun O'zbekistondagi akkreditatsiyalangan registratorlardan biridan oling:

- **ahost.uz**, **uzinfocom / cctld.uz**, va boshqa `.uz` registratorlar.

`dl-library.uz` ni qidirib, ro'yxatdan o'tkazing va to'lovni amalga oshiring.

## 2-qadam. Cloudflare'ga domen (zona) qo'shish

1. Cloudflare dashboard'ga kiring (akkaunt: **oybeksjob@gmail.com**).
2. **Add a site** → `dl-library.uz` → **Free** rejani tanlang.
3. Cloudflare sizga **2 ta nameserver** beradi, masalan:
   `xxxx.ns.cloudflare.com` va `yyyy.ns.cloudflare.com`.

## 3-qadam. Nameserverlarni almashtirish (registrator panelida)

Registrator (masalan ahost.uz) boshqaruv panelida `dl-library.uz` uchun **NS (nameserver)** yozuvlarini Cloudflare bergan 2 ta NS'ga almashtiring.

> ⏳ Tarqalish (propagation) bir necha soatdan **24–48 soatgacha** davom etishi mumkin.
> Cloudflare'da zona holati **"Active"** bo'lsa — tayyor.

## 4-qadam. Pages loyihasiga custom domen ulash

1. Cloudflare → **Workers & Pages** → **`ustoz-library`** loyihasi.
2. **Custom domains** → **Set up a domain**.
3. `dl-library.uz` ni kiriting → Cloudflare DNS yozuvini **avtomatik** qo'shadi (zona shu akkauntda bo'lgani uchun).
4. Xuddi shunday `www.dl-library.uz` ni ham qo'shing (tavsiya etiladi).
5. SSL sertifikat avtomatik beriladi (bir necha daqiqa ichida).

## 5-qadam. Tekshirish

- `https://dl-library.uz` → sayt ochilishi kerak.
- `https://www.dl-library.uz` → ham ishlashi kerak.

---

## Qo'shimcha

- **www → root** (yoki teskari) yo'naltirish kerak bo'lsa: Cloudflare → `dl-library.uz` zonasi → **Rules → Redirect Rules**.
- Domen ulangach ham eski `ustoz-library.pages.dev` manzili ishlayveradi.
- Custom domen Cloudflare orqali bo'lgani uchun CDN, SSL va himoya avtomatik yoqiladi.
