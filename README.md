# Spot Jurnal

Spot savdo uchun hisob-kitob daftari. iPhone'da xuddi oddiy ilovadek ishlaydi (PWA).
Pul talab qilmaydi: App Store ham, Apple Developer ($99/yil) ham kerak emas.

## Nima qila oladi

- **Sotib olish / sotish** yozuvlari: coin, narx, miqdor, komissiya, sana, izoh
- **Ochiq pozitsiyalar**: o'rtacha tannarx, qo'yilgan pul, joriy qiymat, foyda %
- **Yopilgan savdolar bo'yicha real foyda** — har bir sotishda alohida hisoblanadi
- **Joriy narxlar**: Binance'dan bir tugma bilan yangilash yoki qo'lda kiritish
- **Statistika**: yutuq foizi, eng yaxshi/yomon savdo, profit factor, komissiya, oylar va coinlar kesimi
- **Zaxira nusxa**: JSON faylga yuklab olish va tiklash
- Internetsiz ham ochiladi, ma'lumot telefonning o'zida saqlanadi

## Foyda qanday hisoblanadi

**O'rtacha tannarx (average cost)** usuli:

- Sotib olganda: `tannarx += narx × miqdor + komissiya`
- Sotganda: `foyda = (sotuv summasi − komissiya) − o'rtacha tannarx × sotilgan miqdor`

Misol: 0.1 BTC 60 000 da, yana 0.1 BTC 70 000 da olindi (komissiya 6 va 7 USDT)
→ o'rtacha tannarx 65 065. 0.1 BTC 80 000 ga sotildi (komissiya 8)
→ real foyda `(8000 − 8) − 6506.5 = +1485.50 USDT`.

## Internetga qo'yish (bepul, GitHub Pages)

1. GitHub'da shu repo → **Settings** → chapdan **Pages**
2. *Source*: **Deploy from a branch**
3. *Branch*: `main` (yoki `claude/iphone-app-distribution-8l05af`), papka `/ (root)` → **Save**
4. 1-2 daqiqadan keyin havola tayyor bo'ladi:
   `https://dota82422974-star.github.io/desktop-tutorial/`

## iPhone'ga o'rnatish

1. Havolani **Safari**'da oching (Chrome emas — Safari bo'lishi shart)
2. Pastdagi **Ulashish** tugmasi (⬆ kvadrat ichida strelka)
3. **"Add to Home Screen" / "Bosh ekranga qo'shish"**
4. **Add** → ekranda ikonka paydo bo'ladi

Shundan keyin ilova to'liq ekranda, brauzer paneli ko'rinmagan holda ochiladi.

## Muhim

Ma'lumot faqat **shu telefon xotirasida** (localStorage) saqlanadi — serverga hech narsa
yuborilmaydi. Safari xotirani tozalasa yoki ilova o'chirilsa, yozuvlar yo'qoladi.
Shuning uchun vaqti-vaqti bilan **⚙ → Zaxira nusxa yuklab olish** ni bosib turing.

## Fayllar

```
index.html              — barcha ekranlar
css/style.css           — dizayn (qorong'i mavzu)
js/app.js               — hisob-kitob va mantiq
manifest.webmanifest    — ilova nomi, ikonka, rang
sw.js                   — offline ishlashi uchun
icons/                  — ikonkalar
```
