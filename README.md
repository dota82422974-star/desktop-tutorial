# Hisob-kitob

Spot savdo uchun foyda-zarar hisoblagichi. Bitta ekran, tepasida sozlamalar (⚙).
iPhone bosh ekraniga o'rnatiladi va oddiy ilovadek ishlaydi (PWA).
Pul talab qilmaydi: App Store ham, Apple Developer obunasi ($99/yil) ham kerak emas.

## Qanday ishlaydi

Ekranning yuqorisida hisoblagich:

| Maydon | Ma'nosi |
|---|---|
| **Qaysi coin** | SOL, BTC, ETH... |
| **Necha pul qo'ydim** | savdoga qo'ygan pulingiz, masalan 300 USDT |
| **Olgan narxim** | qaysi narxda kirgansiz |
| **Sotgan narxim** | qaysi narxda chiqqansiz (bo'sh qoldirsangiz — ochiq savdo) |
| **Sana / Komissiya** | pastdagi ikki kichik qatorda; komissiya ⚙ dan o'zgartiriladi |

Yozayotganingizning o'zidayoq natija ko'rinadi: katta raqamda **foyda yoki zarar**,
ostida foiz, keyin qatorma-qator **miqdor, sotuvdan tushgan pul, komissiya va
qo'lga tegadigan summa**. `Savdoni saqlash` bosilsa — pastdagi ro'yxatga tushadi.

Ochiq savdolar sariq ramkada, "OCHIQ" belgisi bilan turadi; sotganingizda o'sha
yozuvdagi `Sotgan narxim` katagiga narxni yozib `Yopish` ni bossangiz, foyda hisoblanadi.

Eng tepada esa **jami foyda**, **savdolar soni** va **yutuq foizi** turadi.

## Formula

```
miqdor    = qo'ygan pul ÷ olgan narx
sotuv     = miqdor × sotgan narx
komissiya = (qo'ygan pul + sotuv) × komissiya% ÷ 100
foyda     = sotuv − qo'ygan pul − komissiya
```

Misol: SOL, 300 USDT, 20 → 24, komissiya 0.1%
→ 15 dona · sotuvdan 360 · komissiya 0.66 · **foyda +59.34 $ (+19.78%)** · qo'lga 359.34

## Sozlamalar (⚙)

- **Komissiya foizi** — har safar avtomatik qo'yiladi
- **Zaxira nusxa yuklab olish / tiklash** — JSON fayl
- **Hammasini o'chirish**

## Internetga qo'yish (bepul, GitHub Pages)

1. Repo → **Settings** → **Pages**
2. *Source*: **Deploy from a branch**
3. *Branch*: `main` (yoki `claude/iphone-app-distribution-8l05af`), papka `/ (root)` → **Save**
4. 1-2 daqiqadan keyin: `https://dota82422974-star.github.io/desktop-tutorial/`

## iPhone'ga o'rnatish

1. Havolani **Safari**'da oching (Chrome emas)
2. Pastdagi **Ulashish** tugmasi (⬆)
3. **"Add to Home Screen"** → **Add**

Ilova to'liq ekranda, brauzer panelisiz ochiladi va internetsiz ham ishlaydi.

## Muhim

Ma'lumot faqat **shu telefon xotirasida** saqlanadi, hech qayerga yuborilmaydi.
Safari xotirani tozalasa yoki ilova o'chirilsa — yozuvlar yo'qoladi.
Shuning uchun vaqti-vaqti bilan **⚙ → Zaxira nusxa yuklab olish** ni bosib turing.

## Fayllar

```
index.html              — ekran
css/style.css           — dizayn (qorong'i mavzu)
js/app.js               — hisob-kitob va mantiq
manifest.webmanifest    — ilova nomi, ikonka, rang
sw.js                   — offline ishlashi uchun
icons/                  — ikonkalar
```
