# Çalışan ara sürüm ve devam noktası

Bu dal mevcut uygulamanın üzerine kurulmuştur. Genel amaçlı, profesyonel kalitede
her fiziksel eylemi anlayan bir model tamamlanmış değildir. Referans MP4 dosyaları
bu oturumda sağlanmadığından referanslara ait 12 maddelik görsel analiz yapılmadı.

## Ortak sözleşme

`script → scene-plan/story-analysis → registry + beats → vector veya AI illustration
→ ölçülmüş ses + kelime sınırları → altyazı/ağız → parça render → tek ses mux → QC`.

- DE/EN açıklanabilir yerel ayrıştırıcı, cümle başına bir sahne ve sıralı eylemler.
  Karakter/nesne kimlikleri, temel zamir/mekân devamlılığı vardır. Belirsizlik ve
  desteklenmeyen eylemler sahne planında görünür. Büyük dil modeli değildir.
- Her karakter/nesne pozu Remotion kare saatinden hesaplanır; telefonun arka plan
  JavaScript döngüsüne bağlı değildir. Karakter ve grafikler yalnızca 2D SVG/DOM.
- Edge TTS `WordBoundary` olayları gerçek kelime sınırlarının kaynağıdır. Piper
  yedeği tahmin olarak raporlanır. Otomatik yedek DE Thorsten (erkek), EN Lessac
  (kadın) kullanır; seçilen cinsiyet farklıysa gerçek ses ve uyarı gösterilir. Tam hedef süre için ses kırpılmaz/hızlandırılmaz;
  15/30/60/180/300/600 seçimleri metin uzunluğuyla sağlanacak bir süre hedefidir.
- Rhubarb varsa her iki dilde `phonetic` tanıyıcı çalışır. İngilizceye özel PocketSphinx
  Almancaya zorlanmaz. Üretilen şekiller ölçülür ama fonem doğruluğu garanti edilmez.
- AI motoru **hareketlendirilmiş illüstrasyon** üretir, gerçek AI hareketli video
  değildir. Ayrıştırılmış ön/arka plan veya diffusion video modeli eklenmedi.
  Karakter tutarlılığı prompt yönlendirmesidir; görsel kimlik eşitliği doğrulanmaz.
- AI bütçesi en çok 18 HTTP isteği; sahneler arasında ilgisiz resim tekrar edilmez.
  Kota/auth/ağ hatasında kalan sahneler vektördür. Anahtar frontend'e yazılmaz.
- Sunucu 45 saniyelik parçalar üretir, orijinal sesleri sahne sınırlarına pad/trim
  ederek tek AAC akışı oluşturur. Chromium eşzamanlılığı 1; dosyalar disktedir.
- FFprobe H.264/AAC/yuv420p/oran/süre; FFmpeg ses, siyah kare ve sahne içi hareket
  örneklemesi kontrol eder. Anlam/3D/altyazı kesilmesi otomatik doğrulanmaz.

## Dağıtım

Workflow ile Worker v2 birlikte güncellenmelidir. GitHub'a commit atmak Cloudflare
Worker'ı yayınlamaz. Mevcut canlı Worker eski sözleşmede ise yeni UI üretimi
bilgilendirici hatayla durdurur; ücretsiz vektör seçimini sessizce AI'a dönüştürmez.
`backend/README.md` kurulum ve secret adlarını açıklar. PR birleştirilmeden canlı
GitHub Pages uygulaması bu dalı çalıştırmaz. Bu çalışma ana dala otomatik birleştirme
ve Cloudflare dağıtımı yapmaz.

Mobil iş kimliği dispatch öncesinde saklanır. Yenileme/geri dönme mevcut işi sorgular;
ikinci render göndermez. APP_KEY yalnızca sekme oturumunda tutulur. ZIP arşivi hâlâ
istemcide açılır; 120 MiB ön kontrolü vardır. Büyük dosyalar için doğrudan, süreli
MP4 URL'si ve streaming obje depolama henüz yoktur. Artifact 3 gün sonra silinir.

## Devam eden eksikler

1. Kullanıcının referans MP4'leriyle stil/hareket analizi ve insan değerlendirmesi.
2. Daha geniş dil anlayışı, ilişkiler/çoklu karakter diyalogları, nesne temaslarının
   sahneler arasında eksiksiz fiziksel devamlılığı; bilinmeyen eylemler için yeni rig'ler.
3. Görsel katman ayrıştırma ve gerçek ücretsiz AI video kapasitesi araştırması.
4. Almanca fonem doğruluğu ve bağımsız ses/metin hizalama kalite değerlendirmesi.
5. Tam 3/5/10 dakikalık gerçek render stres matrisi, bellek/timeout ölçümleri.
6. Fiziksel iPhone 16 Pro Max Safari, ekran kilidi ve büyük dosya paylaşımı testleri.
7. ZIP yerine doğrudan MP4 streaming; kalıcı idempotency deposu ve hassas ilerleme.

`npm test --prefix animation`, `python -m unittest discover -s animation -p 'test_*.py' -v`,
`node backend/worker.test.mjs`, `node backend/ui.test.mjs` regresyonları çalıştırır.
`backend/browser_smoke.py` gerçek Chromium ile mobil UI ve yeniden bağlanmayı test eder;
WebKit veya fiziksel iPhone testi yerine geçmez. Teste ait çıktı dosyaları `output/`
altındadır, git'e eklenmez. Üretilmiş narration/AI manifestleri de kullanıcı metni
barındırabilir; commit öncesinde örnek başlangıç içeriklerine döndürülmelidir.
