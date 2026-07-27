# AppShot Studio

App Store / Google Play ekran görüntüsü üretici. İki arayüz, **tek render motoru** —
editörde görünen şey export edilen şeyin aynısıdır (`src/core/render.js`).

## Claude için: toplu düzenleme nasıl yapılır

Kullanıcı "şu projedeki başlıkları değiştir", "hepsinin arkaplanını şu yap", "yeniden
export et" gibi bir şey istediğinde **CLI'ı kullan**, JSON'u elle düzenleme.

```bash
cd ~/appshot-studio

appshot ls                      # projeler
appshot info <proje>            # frame listesi, hangi template, hangi başlık
appshot templates               # 14 layout
appshot backgrounds             # hazır arkaplanlar
appshot devices                 # cihaz + tam piksel ölçüleri
appshot fonts
```

Tipik akış:

```bash
# 1) proje aç, simulator screenshot'larını ekle
appshot new fluenta --app "Fluenta" --bg indigo
appshot add fluenta ~/Desktop/shots/*.png

# 1.5) ÖNCE hazır set seç — tek tek şablon atamak yerine tüm sete tutarlı görünüm ver
appshot packs
appshot pack fluenta panorama-flow

# 2) metinleri topluca yaz ( | ile ayır, frame sırasına göre dağıtılır )
appshot set fluenta --frames all \
  --titles "Konuşarak öğren|Maya ile pratik yap|İlerlemeni gör" \
  --subtitles "Kart değil, gerçek sohbet|7/24 yapay zekâ öğretmen|Seri, dakika, seviye"

# 3) tek tek layout ver
appshot set fluenta --frames 2 --template tilt-right
appshot set fluenta --frames 3 --template duo

# 4) tüm projenin stilini değiştir (--frames YOKSA defaults'a yazar = hepsine uygulanır)
appshot style fluenta --font Poppins --title-size 6.4 --bg "linear:160:#6366f1,#ec4899" --pattern dots

# 5) export
appshot render fluenta                       # project.devices'daki tüm cihazlar
appshot render fluenta --devices iphone-6.9  # sadece biri
appshot render fluenta --frames 1-3 --open
```

Çıktı: `out/<proje>/<cihaz>/01-baslik.png` — App Store'un istediği tam piksel ölçüsünde.

### Style pack'ler (önce bunu seç)

Bir pack; arkaplanı, tipografiyi, cihaz ayarını **ve her karenin şablonunu** birlikte
tanımlar (`src/core/sets.js`). `appshot pack <proje> <id>` tüm sete uygular; kare
sayısı sequence'ten uzunsa sıra başa döner, yani **hiçbir kare yarım kalmaz**.
Pack uygulandığında kare bazlı görünüm override'ları (`background`/`text`/`device`)
temizlenir — metinlere dokunulmaz. Sonrasında tek tek kare değiştirilebilir.

`panorama-flow` ve `panorama-tilt` **sürekli** setlerdir: arkaplan ve cihazlar
kareden kareye devam eder, set tek bir geniş görsel gibi okunur.

Sürekli şablonlar (`pano-flow`, `pano-tilt`, `pano-hero`) `continuous` alanıyla
işaretlenir; render sırasında `count` kare genişliğinde bir şerit çizilip `index`
kadar sola kaydırılır. Bu yüzden `renderFrame`'e **index geçmek şart** — geçilmezse
`project.frames.indexOf(frame)` ile bulunur.

### Önemli kurallar

- `--frames` **verilmezse** `style` komutu proje varsayılanlarını değiştirir → her frame etkilenir.
  `--frames 2,4` veya `--frames 1-3` verilirse sadece o frame'lere override yazılır.
- Frame numaraları **1'den** başlar.
- Metin `**kalın**` ve satır sonu (`\n`) destekler.
- iPad'e ayrı screenshot koymak için: `appshot set <proje> --frames 1 --shot ~/x.png --for ipad-13`.
  Verilmezse aynı görsel tüm cihazlarda kullanılır (telefon görseli iPad'de kırpılır).
- Ölçü birimleri çözünürlükten bağımsız: font boyutu / cihaz genişliği **kanvas genişliğinin yüzdesi**.
  Bu yüzden aynı ayar iPhone'da ve iPad'de aynı görünür.

## Görsel editör

```bash
appshot editor          # http://localhost:4321
```

Sol: frame şeridi · Orta: canlı önizleme · Sağ: inspector.
Üstteki **This frame / All frames** anahtarı, yaptığın değişikliğin tek frame'e mi
yoksa tüm projeye mi yazılacağını belirler (CLI'daki `--frames` mantığının aynısı).
PNG'leri pencereye sürükle-bırak yeni frame açar.

- **Edit / Grid** anahtarı: Grid, tüm kareleri yan yana gösterir; başlık ve alt başlık
  kartın altından doğrudan yazılır, inspector seçili kareye uygulanır.
- **Browse all templates visually…** (Template bölümünde): 14 şablonu *o karenin kendi
  görseliyle* render edip gösterir, tıklayınca uygular.
- **✳ Claude Code** düğmesi: o projeye özel komut kopyası (bu dosyadaki akışın kısa hali).

## Dosya yapısı

```
projects/<proje>/project.json    # tek gerçek kaynak (frames, defaults, devices)
projects/<proje>/assets/         # yüklenen screenshot'lar
out/<proje>/<cihaz>/*.png        # export
src/core/                        # render motoru — tarayıcı ve CLI ortak kullanır
```

`project.json` şeması: `frames[]` içindeki her alan (`template`, `background`,
`text.*`, `device.*`) `defaults`'takini ezer. Boş bırakılan alan defaults'tan gelir.

## Teknik notlar

- Render Chromium ile yapılır (`playwright-core`, Playwright cache'indeki binary bulunur).
  Bulunamazsa: `npx playwright install chromium` ya da `APPSHOT_CHROME=/path/to/chrome`.
- Cihaz çerçeveleri saf CSS ile çizilir — dışarıdan görsel/asset gerekmez, her ölçekte net.
- Fontlar Google Fonts'tan çekilir; internet yoksa `--offline` ile sistem fontuna düşer.
- Stil değerleri `style="..."` attribute'una gömüldüğü için **çift tırnak kullanma**
  (font stack'leri, `url()` vb. tek tırnaklı olmalı).
