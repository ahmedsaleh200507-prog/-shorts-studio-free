# Teknoloji seçimi ve ücretsiz kullanım

Değerlendirme tarihi: 12 Kasım 2026. Karar, mevcut React/Remotion sahne
sözleşmesini koruyup kareleri sunucuda deterministik üretmektir. iPhone yalnızca
işi başlatır, durumu sorgular ve H.264/AAC MP4 oynatır. Her aracın Safari içinde
çalışması gerekmez. Yeni bir oyun motoru veya ikinci bir render hattı eklemek,
aynı sahnenin iki uygulamasını sürdürme maliyeti yaratır.

Bu tablo bir bağımlılığın kurulduğunu veya gerçek cihazda test edildiğini
göstermez. Lisans, servis kullanım koşulu ve model/varlık lisansı ayrı konulardır.
Ticari kullanım sütunu genel izin durumunu özetler; belirtilen koşullar geçerlidir.

| Araç | Gereklilik ve mimari kararı | Lisans, ticari kullanım ve ücret | Actions / Safari / performans | Bakım ve daha hafif seçenek |
|---|---|---|---|---|
| Remotion 4 | Mevcut kare tabanlı zaman çizelgesi ve MP4 hattı korunur. | Özel Remotion lisansı; bireyler, en fazla 3 çalışanlı kâr amaçlı kuruluşlar ve kâr amacı gütmeyen kuruluşlar ücretsiz koşullarına girebilir. Daha büyük ticari kuruluşlar için ücret gerekebilir. Genel MIT yazılımı değildir. | Chromium ile Linux Actions üzerinde CPU render; Safari yalnızca MP4 oynatır. Tek eşzamanlı render bellek yükünü sınırlar, 10 dakika üretim pahalı olabilir. | Sürüm sabitlenmeli. Daha hafif FFmpeg/Canvas hattı ancak mevcut React sahnelerini yeniden yazmayı gerektirir. |
| React | Mevcut kompozisyon ve bileşen yapısı için gerekli. | MIT; ticari kullanım mümkün, lisans bildirimi korunur. | Actions üzerinde Remotion ile; UI şu anda basit HTML olduğu için telefona React yüklenmez. | Yaygın ekosistem. UI için yerel DOM daha hafif. |
| FFmpeg / FFprobe | H.264/AAC, ses dönüşümü ve gerçek çıktı doğrulaması için gerekli. | Temel FFmpeg LGPL, etkin bileşenlere göre GPL olabilir; libx264 kullanan dağıtım GPL koşullarını etkiler. Ticari kullanım mümkün; patent ve dağıtım yükümlülükleri kullanım bölgesine göre ayrıca değerlendirilir. | Linux Actions üzerinde uygundur. Safari içine FFmpeg WASM yüklemekten kaçınılır; CPU kodlama süresi video uzunluğuyla artar. | Aktif proje. MP4 başlık kontrolü FFprobe yerine geçmez. |
| PixiJS | Depoda mevcut; yeni SVG iskelet motoru için zorunlu değil. Büyük sprite sahnelerinde ileride değerlendirilebilir. | MIT; ticari kullanım mümkün. | WebGL/WebGPU ve Canvas destekleri sürüme bağlı; Safari GPU/bellek farklılıkları test ister. Headless render mümkündür, Remotion ile ikinci saat döngüsü oluşturulmamalı. | Büyük ekosistem; mevcut küçük sahnelerde SVG/DOM daha basit. |
| Edge TTS | Mevcut çevrimiçi doğal DE/EN ses hattı korunur; sağlanan WordBoundary olayları altyazı zamanlamasının kaynağıdır. | İstemci kodu LGPLv3; yalnız `srt_composer.py` MIT. Microsoft servisinin erişimi, koşulları ve ses kullanım hakları istemci lisansından ayrıdır. Ücretsiz erişim garantili servis sözleşmesi değildir. | Actions üzerinde internet gerektirir; Safari ses üretmez ve mikrofon izni istemez. Servis kesintisi/engeli işi başarısız kılabilir. | Resmi Microsoft üretim API'si değildir. Yerel Piper ağ bağımlılığını azaltır. |
| Piper | Yerel model mevcut olduğunda isteğe bağlı offline TTS. Model indirme/kurulum olmadan çalıştığı iddia edilmez. | Güncel OHF `piper1-gpl` GPLv3; eski `rhasspy/piper` lisansı güncel sürüme uygulanmamalı. Her sesin model kartı, ticari hakları ve atıf koşulları ayrı kontrol edilir. | Actions CPU üzerinde çalışabilir; modeller yüzlerce MB olabilir. Safari'de kurmak gerekmez. Doğrudan kelime zamanlaması her sürümde yoktur; tahmini zamanlama açıkça işaretlenmelidir. | OHF deposu bakımcı aradığını bildiriyor. Mevcut Edge hattı daha az kurulum gerektirir. |
| GitHub Actions | Telefon arka plana geçse de devam eden mevcut sunucu render görevi. | Açık depolarda standart GitHub-hosted runner kullanımının ücretsiz kapsamı vardır; özel depo, büyük runner, depolama ve plan sınırları farklıdır. Sınırsız GPU hizmeti değildir. | Linux/Chromium/FFmpeg uyumlu. Kuyruk, eşzamanlılık, süre ve artifact saklama sınırları vardır. Safari yalnızca işi sorgular. | Yönetilen servis. Yerel render ücretsiz alternatif fakat bilgisayar açık kalmalıdır. |
| Cloudflare Workers | Mevcut doğrulanmış Actions geçidi; render motoru değil. | Ücretsiz plan kotaları geçerlidir; Workers kodu için lisans ile barındırma sözleşmesi ayrıdır. Ücretli plan zorunlu etkinleştirilmez. | Safari fetch/CORS ile uyumlu. CPU, bellek ve istek kotaları uzun video renderına uygun değildir; artifact gövdesini akışla iletmek avantajlıdır. | Yönetilen servis; kotalar hesap panelinden kontrol edilir. Ücretsiz sınır sayıları bu oturumda doğrulanamadı (resmi limit sayfası HTTP 403). |
| Pollinations | İsteğe bağlı 2D illüstrasyon. Kapasite/anahtar yoksa ücretsiz vektör motoru. Gerçek video üretim modeli değildir. | Kaynak kod lisansı, kullanılan model lisansı ve barındırılan API/hesap kredi koşulları ayrıdır. README klasik ücretsiz API ilan etse de her modelin/endpointin anahtarsız veya sınırsız olduğu çıkarılamaz. | Actions internet erişimiyle; gizli anahtar frontend'e gitmez. İstek sayısı sınırlanır; 429 sonrası anahtar/hesap rotasyonu yapılmaz. | Sağlayıcı/model listeleri değişkendir. SVG vektör motoru en güvenilir sıfır API maliyetli seçenek. |
| Rigby2D | Hazır rig ve editör varlıkları yokken yeni runtime kurulmadı. Elle çizilen SVG kemik dönüşümleri mevcut React hattına doğrudan uyar. | Resmi depoda MIT ve Apache-2.0 lisans dosyaları mevcut; kullanılacak paket/sürümün çift lisans bildirimi doğrulanmalı. Ticari kullanım bu koşullarla mümkün. | Pixi runtime ile Actions entegrasyonu mümkün fakat bu sürümde test edilmedi. Safari sonucu runtime'a bağlı. | Yeni/gelişen proje; varsayılan dal şu anda `develop`. CI'ı uzak README metnine bağımlı yapmak yerine sabit sürümlü gerçek runtime testi gerekir. |
| Rhubarb Lip Sync | İsteğe bağlı ses→ağız pozları. Gerçek fonem/cue verisi varsa kullanılır; yokken ritmik ağız hareketi fonem senkronizasyonu diye sunulmamalı. | MIT; ticari kullanım ve üretilen cue verisini kullanma mümkün. | Linux CLI Actions üzerinde çalışabilir, Safari gerekmez. İngilizce PocketSphinx tanıyıcı; Almanca için `phonetic` dil bağımsız yaklaşım sınırlı, kelime hizalayıcı değildir. | Olgun CLI; Almanca doğruluğu ayrı dinleme/görsel test ister. Hafif alternatif ses zarfı/kelime aralıklarıyla ağız açma (daha düşük doğruluk). |
| Lottie-web | Depoda var; genel senaryodan eylem üretmez. Yalnızca özel tasarlanmış ikon/motion varlıkları eklenirse değer sağlar. | MIT; JSON animasyon varlıklarının kendi lisansları ayrıca geçerli. | SVG/Canvas oynatımı Safari'de mümkün. Render kareleri Remotion zamanına seek edilmelidir; bağımsız oynatma saatleri kayma yaratabilir. | Olgun; basit ikonlar için yerel SVG daha hafif. |
| Rive | Etkileşimli state machine'ler için güçlü; mevcut export varlığı ve ayrı ihtiyaç olmadığı için eklenmedi. | Web runtime MIT; editör, varlık ihracı ve hosted özelliklerin ücretsiz/ücretli plan koşulları ayrıdır. Sıfır bütçe hedefi için editör erişimi varsayılmaz. | WASM/Canvas/WebGL runtime; Safari ve headless deterministik seek entegrasyonu test ister. | Aktif ürün. SVG rig ikinci runtime/varlık üretim hattını önler. |
| SVG | Karakter, nesne ve bilgi grafikleri için seçildi. Her karede eklem/nesne değerleri saf fonksiyonlarla hesaplanır. | Web standardı; kendi çizimlerimiz için üçüncü taraf varlık lisansı gerekmez. Aktarılan ikon/fontlar ayrıca lisanslanır. | Chromium render + Safari desteği güçlü. Az sayıda şekil için hafif; çok büyük DOM pahalılaşır. | Platform standardı; yoğun parçacık sahnelerinde Canvas düşünülebilir. |
| Web Animations API | UI hareketi için uygun; MP4 sahnelerinin bağımsız gerçek zamanlı saati olarak kullanılmadı. | Web standardı; API kullanım ücreti yok. | Modern Safari destekler, ancak iOS arka planda durdurabilir. Remotion kare saatiyle deterministik hesap daha güvenilir. | Platform standardı. CSS/React kare değerleri yeterli. |
| Canvas 2D | Eski önizleme özellikleri korunabilir; SVG sahnelerini ikinci kez uygulamak için eklenmez. | Web standardı; varlık lisansları ayrı. | Safari destekler, fakat telefon üzerinde 10 dakika encode bellek/arka plan sorunlarına açık. Server Canvas/Chromium render mümkün. | Platform standardı; sahne sayısı azsa SVG düzenlemesi daha kolay. |
| WhisperX | Edge WordBoundary varken ağır zorunlu bağımlılık olarak eklenmedi. Offline ses için ileride forced alignment seçeneği. | Proje BSD-2-Clause; Whisper, hizalama ve diarization model/dependency koşulları ayrıca kontrol edilir. Bazı modeller erişim onayı isteyebilir. | CPU üzerinde mümkün ancak model indirme/RAM/zaman maliyeti yüksek; GPU ücretsiz varsayılmaz. Safari'de çalıştırılmaz. | Gelişen ML bağımlılık ağacı. Ses motoru kelime olayları daha hafif ve doğrudan. |
| Godot 2D | Ayrı sahne/asset pipeline ve headless video yakalama gerektirdiği için bu sürüme eklenmedi. | MIT; ticari kullanım mümkün, bildirimi koru; varlıklar ayrı lisanslıdır. | Headless Actions mümkün; iOS web export threading/renderer ve bellek ayarları test ister. | Aktif büyük proje. Mevcut React+SVG daha az entegrasyon maliyeti. |

## Kaynaklar ve doğrulamanın sınırı

Bu oturumda resmi depolardan Remotion, Edge TTS, Rhubarb, Piper, Rigby2D,
WhisperX, Rive ve Godot lisans metinleri; Pollinations README ve GitHub Actions
faturalama sayfası okundu. Bu okuma belirli bir bulut hesabının kotasını veya
üretim modelinin canlı erişimini doğrulamaz. Pixi/React/Lottie lisans adları proje
lisanslarına dayanır; sürüm yükseltmelerinde dağıtılan paketlerin lisansları
yeniden kontrol edilmelidir.

- [Remotion lisansı](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md)
- [FFmpeg yasal bilgiler](https://ffmpeg.org/legal.html)
- [Edge TTS lisansı](https://github.com/rany2/edge-tts/blob/master/LICENSE)
- [Piper güncel proje ve ses lisanslama](https://github.com/OHF-Voice/piper1-gpl)
- [Rigby2D lisansları](https://github.com/jaisurya-dev-art/rigby2d/tree/develop)
- [Rhubarb lisansı ve tanıyıcılar](https://github.com/DanielSWolf/rhubarb-lip-sync)
- [Rive web runtime](https://github.com/rive-app/rive-wasm)
- [WhisperX lisansı](https://github.com/m-bain/whisperX/blob/main/LICENSE)
- [Godot lisansı](https://github.com/godotengine/godot/blob/master/LICENSE.txt)
- [Pollinations API bilgileri](https://github.com/pollinations/pollinations)
- [GitHub Actions faturalama](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
- [Cloudflare Workers sınırları](https://developers.cloudflare.com/workers/platform/limits/)

## Otomatik kalite kontrolünün kapsamı

`animation/verify-video.py` gerçek FFprobe akışlarını ve sürelerini kontrol eder,
FFmpeg ile ses tepe düzeyini ölçer ve en fazla 12 sahne içinden ikişer küçük gri
kare çıkarır. Böylece yalnızca sahne kesmesini hareket sayma hatası azaltılır.
Siyah/boş örnekler ve tüm örneklerde donma başarısızlıktır; kısmi hareketsizlik
uyarıdır. Bu kontrol bütün karelerin doğru olduğunu kanıtlamaz. Örneğin yanlış
nesneyi, beklenmedik 3D içeriği, karakter kesilmesini veya altyazının anlamını
bir görüntü anlama modeli olmadan güvenilir biçimde tespit ettiğini iddia etmez.
JSON raporunda manuel inceleme gereken alanlar ayrıca listelenir.
