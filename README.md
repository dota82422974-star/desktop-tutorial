# Hisob-kitob

Spot savdo uchun foyda-zarar hisoblagichi. Bitta ekran, tepasida sozlamalar (⚙).
iPhone bosh ekraniga o'rnatiladi va oddiy ilovadek ishlaydi (PWA).
Pul talab qilmaydi: App Store ham, Apple Developer obunasi ($99/yil) ham kerak emas.

## Qanday ishlaydi

Ekranning yuqorisida hisoblagich:

| Maydon | Ma'nosi |
|---|---|
| **Coin** | SOL, BTC, ETH... |
| **Qancha kirdim (USDT)** | savdoga qo'ygan pulingiz, masalan 300 |
| **Kirish narxi** | qaysi narxda kirgansiz |
| **Chiqish narxi** | qaysi narxda chiqqansiz (bo'sh qoldirsangiz — ochiq savdo) |
| **Komissiya %** | ikki tomonlama komissiya, Binance spotda odatda 0.1 |

Yozayotganingizning o'zidayoq natija chiqadi: **foyda/zarar USDT'da, foizda, nechta dona
olganingiz va qo'lga tegadigan summa**. `Saqlash` bosilsa — pastdagi ro'yxatga tushadi.

Ochiq savdolar sariq ramka bilan turadi; chiqqaningizda ro'yxatdagi
`Chiqish narxi` katakchasiga narxni yozib `Yopish` ni bossangiz, foyda hisoblanadi.

Ro'yxat tepasida uchta ko'rsatkich: **jami foyda**, **yutuq foizi**, **savdolar soni**.

## Formula

```
miqdor    = summa ÷ kirish narxi
chiqish   = miqdor × chiqish narxi
komissiya = (summa + chiqish) × komissiya% ÷ 100
foyda     = chiqish − summa − komissiya
```

Misol: SOL, 300 USDT, 20 → 24, komissiya 0.1%
→ 15 dona · chiqish 360 · komissiya 0.66 · **foyda +59.34 USDT (+19.78%)** · qo'lga 359.34

## Sozlamalar (⚙)

- **Doimiy komissiya %** — har safar avtomatik qo'yiladi
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
