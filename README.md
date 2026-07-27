# AppShot Studio

App Store ve Google Play ekran görüntüsü üretici. Figma şablonlarının yerini alır:
screenshot'ı at, şablon seç, metni yaz, tüm cihaz ölçülerinde PNG al.

AppLaunchpad tarzı görsel bir editör **artı** Claude Code'dan sürebileceğin bir CLI.
İkisi de aynı render motorunu kullanır (`src/core/render.js`) — editörde gördüğün
şey export edilenin birebir aynısı.

## Kurulum

Zaten kurulu (`npm link` yapıldı, `appshot` her yerden çalışır).
Sıfırdan: `npm install && npm link`.

## Kullanım

```bash
appshot editor                  # görsel editör → http://localhost:4321
appshot --help                  # tüm komutlar
```

```bash
appshot new fluenta --app "Fluenta" --bg indigo
appshot add fluenta ~/Desktop/shots/*.png
appshot set fluenta --frames all --titles "Konuşarak öğren|Pratik yap|İlerlemeni gör"
appshot style fluenta --font Poppins --title-size 6.3 --pattern dots
appshot render fluenta --open
```

Çıktı: `out/<proje>/<cihaz>/01-baslik.png`, App Store'un istediği tam piksel ölçüsünde
(iPhone 6.9" 1290×2796, iPad 13" 2064×2752, Play 1080×1920 …).

## Neler var

- **14 şablon** — text-top, hero, tilt, duo, trio, full-bleed, split, corner, peek…
- **18 arkaplan preset'i** + solid / linear / radial / mesh / görsel / screenshot-blur,
  üstüne dots / grid / diagonal / noise deseni
- **Cihaz çerçeveleri saf CSS** — Dynamic Island, notch, iPad, Android punch-hole.
  Dış görsel yok, her ölçekte net.
- **14 font** (Google Fonts) + sistem fontu
- **Cihaz başına ayrı screenshot** — iPad'e iPad görseli koyulabilir
- Ölçüler çözünürlükten bağımsız (kanvas genişliğinin yüzdesi) → aynı ayar her cihazda aynı görünür

Detaylı kullanım ve Claude Code entegrasyonu için `CLAUDE.md`.
