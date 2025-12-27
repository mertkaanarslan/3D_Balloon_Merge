# 🎈 Balloon Emerge - Sunum Slaytına Ekleme Rehberi

## Yöntem 1: PowerPoint / Google Slides (Önerilen)

### Adımlar:

1. **Oyunu Web'de Yayınlayın:**
   - GitHub Pages, Netlify, Vercel veya herhangi bir web hosting kullanın
   - Veya local sunucu çalıştırın: `python3 -m http.server 8000`

2. **Sunumda Ekleme:**
   
   **PowerPoint:**
   - Insert → Get Add-ins → Web Viewer
   - Veya: Insert → Online Video → From a Video Embed Code
   - URL'yi girin: `http://localhost:8000/embed.html` (local) veya web URL'niz

   **Google Slides:**
   - Insert → Image → By URL
   - Veya: Insert → Video → By URL
   - URL: `http://localhost:8000/embed.html`

   **Canva:**
   - Embed → HTML Embed
   - iframe kodu kullanın (aşağıda)

3. **iframe Kodu (Canva için):**
```html
<iframe 
    src="http://localhost:8000/embed.html" 
    width="100%" 
    height="600px" 
    frameborder="0"
    allowfullscreen>
</iframe>
```

## Yöntem 2: Local Dosya Olarak (PowerPoint)

1. **Oyunu Local Çalıştırın:**
   ```bash
   cd /Users/vethacagdas/Game_Ideas/3D_Balloon_Merge
   python3 -m http.server 8000
   ```

2. **PowerPoint'te:**
   - Insert → Object → Create from File
   - Veya: Insert → Web Page
   - URL: `file:///Users/vethacagdas/Game_Ideas/3D_Balloon_Merge/embed.html`

## Yöntem 3: Video Olarak Kaydetme

1. **Ekran Kaydı Alın:**
   - Oyunu oynarken ekran kaydı alın
   - QuickTime (Mac) veya OBS kullanın

2. **Sunuma Video Ekleyin:**
   - PowerPoint: Insert → Video → This Device
   - Video'yu ekleyin ve "Play in Click" seçeneğini işaretleyin

## Yöntem 4: Online Hosting (En Kolay)

1. **GitHub Pages:**
   ```bash
   # GitHub'a push edin
   git init
   git add .
   git commit -m "Balloon Emerge game"
   git remote add origin YOUR_REPO_URL
   git push -u origin main
   
   # GitHub Settings > Pages > Enable
   # URL: https://YOUR_USERNAME.github.io/3D_Balloon_Merge/embed.html
   ```

2. **Netlify Drop:**
   - https://app.netlify.com/drop
   - Klasörü sürükleyip bırakın
   - URL alın ve sunumda kullanın

## Önerilen Sunum Boyutları

- **Genişlik:** 1920px
- **Yükseklik:** 1080px (16:9)
- **iframe boyutu:** 100% x 600px

## Notlar

- `embed.html` dosyası sunum için optimize edilmiştir
- Oyun responsive'dir, farklı boyutlara uyum sağlar
- Touch ve mouse desteği vardır
- Sunum modunda otomatik başlatma için `app.js`'de `autoStart` eklenebilir

## Hızlı Test

1. Terminal'de:
   ```bash
   cd /Users/vethacagdas/Game_Ideas/3D_Balloon_Merge
   python3 -m http.server 8000
   ```

2. Tarayıcıda açın:
   - `http://localhost:8000/embed.html`

3. Sunum aracınızda bu URL'yi kullanın


