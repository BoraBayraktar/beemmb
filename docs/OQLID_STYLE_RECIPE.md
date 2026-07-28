# Oqlid Tarzina Yakin Tasarim Recetesi

Bu dokuman, app.oqlid.com tasarim dilini BEEMMB icinde yeniden uretmek icin pratik bir yol haritasi sunar.

## 1. Tespit Edilen Tasarim/Stack Ozet

- Next.js App Router tabanli yapi
- Tailwind utility-first stil sistemi
- Tailwind v4 benzeri theme/tokens yaklasimi
- Semantik token adlari: background, foreground, primary, muted, border, ring, input, destructive
- Radix UI izleri (ozellikle Select/Checkbox davranislari)
- Lucide ikon kullanimi
- Roboto font ailesi
- Login ekraninda sade iki kolonlu kurgu + hafif animasyonlu gorsel panel

## 2. BEEMMB Icin Tasarim Hedefi

Mevcut sade ve kurumsal dil korunurken su uc hedef uygulanir:

1) Bilesen tutarliligi: buton/input/select/checkbox gorunumleri tek dilde toplanir.
2) Semantik tema: renkler dogrudan hex yerine tokenlarla yonetilir.
3) Motion disiplini: az ama anlamli animasyonlar (auth panel slider, fade, progress).

## 3. Dosya Bazli Uygulama Plani

### 3.1 Token tabani

- Kaynak dosya: src/styles/tokens.css
- Mevcut degiskenler korunur, asagidaki semantik set eklenir veya eslenir:

- --background
- --foreground
- --primary
- --primary-foreground
- --muted
- --muted-foreground
- --border
- --input
- --ring
- --destructive
- --destructive-foreground
- --radius

Not: Hali hazirda bulunan --color-* degiskenlerini silmeden, semantik degiskenleri onlara map etmek gecis riskini azaltir.

### 3.2 Global tema ve animasyon

- Kaynak dosya: src/app/globals.css
- @theme altinda auth paneline ozel iki animasyon tanimlanir:
  - auth-carousel-image
  - auth-carousel-dot
- Yumusak gecisler icin ortak easing ve duration tanimlari eklenir.

### 3.3 Auth layout kurgusu

- Potansiyel hedefler:
  - src/ui/admin/login-form.tsx
  - src/app/[locale]/admin altindaki login rotasi
- Masaustunde iki kolon:
  - Sol: form (max-width kontrollu)
  - Sag: gorsel panel (rounded, overflow hidden, hafif indicator dot)
- Mobilde tek kolon ve gorsel panelin yuksekligi sinirli tutulur.

## 4. Ornek Semantik Token Seti

Asagidaki set, oqlid diline yakin ama BEEMMB tonu ile dengeli bir baslangic profilidir.

~~~css
:root {
  --background: oklch(0.985 0 0);
  --foreground: oklch(0.19 0 0);

  --primary: oklch(0.6 0.21 262);
  --primary-foreground: oklch(0.985 0 0);

  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.45 0 0);

  --border: oklch(0.92 0.01 255);
  --input: oklch(0.95 0 0);
  --ring: oklch(0.7 0 0);

  --destructive: oklch(0.58 0.23 27);
  --destructive-foreground: oklch(0.98 0 0);

  --radius: 1rem;
}

.dark {
  --background: oklch(0.18 0 0);
  --foreground: oklch(0.985 0 0);

  --primary: oklch(0.53 0.25 273);
  --primary-foreground: oklch(0.2 0 0);

  --muted: oklch(0.28 0 0);
  --muted-foreground: oklch(0.72 0 0);

  --border: oklch(1 0 0 / 0.1);
  --input: oklch(1 0 0 / 0.15);
  --ring: oklch(0.56 0 0);
}
~~~

## 5. Auth Animasyon Yaklasimi

~~~css
@theme {
  --animate-auth-carousel: auth-carousel-image 12s infinite ease-in-out;

  @keyframes auth-carousel-image {
    0%, 30% {
      opacity: 1;
      transform: scale(1);
    }
    33%, 97% {
      opacity: 0;
      transform: scale(1.01);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes auth-carousel-dot {
    0%, 30% { opacity: 1; }
    33%, 100% { opacity: 0.35; }
  }
}
~~~

## 6. Bilesen Rehberi (UI Tutarlilik)

- Input:
  - rounded-md
  - border token uzerinden
  - focus ring token uzerinden
- Button primary:
  - background: primary
  - text: primary-foreground
  - hover: 90% opaklik veya hafif darken
- Link button:
  - underline-offset kontrollu
  - muted yerine primary tonlu
- Select/Checkbox:
  - Radix patterni veya benzeri erisilebilir yapi
  - data-state tabanli stil

## 7. Tipografi Rehberi

- Oqlid benzeri gorunum icin Roboto uygun.
- BEEMMB markasi Space Grotesk kullaniyorsa:
  - Govde metinleri Roboto
  - Basliklarda Space Grotesk (hibrit sistem)
- Baslikta tracking-tight, govdede rahat line-height korunur.

## 8. Uygulama Sirasi (Dusuk Risk)

1) Tokenlari ekle, mevcutleri bozma.
2) Login ekraninda pilot uygula.
3) Button/input/select/card bilesenlerini ortaklestir.
4) Sonra admin ve shop ekranlarina yay.

## 9. Kontrol Listesi

- Mobil/tablet/desktop layout stabil mi?
- Focus ring ve klavye erisilebilirligi tamam mi?
- Kontrastlar WCAG seviyesine yakin mi?
- Animasyonlar dikkat dagitmiyor mu?
- i18n metin uzunluklarinda layout kiriliyor mu?
