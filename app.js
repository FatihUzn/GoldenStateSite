// === GLOBAL DEĞİŞKENLER ===
const translations = {}; 
const pageCache = {}; 
let allGalleriesData = null; 

// Mülk Galerisi Değişkenleri
let globalPropertyImages = [];
let globalImageIndex = 0;
const IMAGES_PER_LOAD = 6; 

// Restorasyon Galerisi Değişkenleri
const restorationBeforePaths = Array.from({length: 13}, (_, i) => `assets/restorasyon-${i+1}-before.webp`);
const restorationAfterPaths = Array.from({length: 13}, (_, i) => `assets/restorasyon-${i+1}-after.webp`);
let globalRestorationBeforeIndex = 0;
let globalRestorationAfterIndex = 0;
const RESTORATION_IMAGES_PER_LOAD = 4;

// Lightbox Değişkenleri
let currentImages = [];
let currentIndex = 0;

// === SAYFA YÜKLENDİĞİNDE ÇALIŞACAKLAR ===
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Dil Ayarları
    let lang = localStorage.getItem('lang') || 'tr';
    const browserLang = navigator.language.split('-')[0];
    if (!localStorage.getItem('lang') && ['tr','en','zh','ar'].includes(browserLang)) {
        lang = browserLang;
    }
    await setLanguage(lang);
    
    // 2. Proje Görsellerini Önceden Yükle (Hız için)
    setTimeout(preloadProjectImages, 1000);

    // 3. Mobil Menü Kurulumu
    setupMobileMenu();
    
    // 4. Rezervasyon ve Modal İşlemleri
    setupProjectReservation();

    // 5. Sayfa Yönlendirme (Hash Kontrolü)
    window.addEventListener('hashchange', () => {
        const pageId = location.hash.replace('#', '') || 'hero';
        showPage(pageId);
    });
    
    // İlk açılışta hangi sayfadaysak onu yükle
    const initialPage = location.hash.replace('#', '') || 'hero';
    showPage(initialPage);

    // 6. Hero Metin Animasyonunu Başlat
    startHeroTextAnimation();

    // 7. Genel Tıklama Dinleyicisi (Delegation)
    document.body.addEventListener('click', (e) => {
        // Geri Butonu
        if (e.target.closest('.btn-page-back')) {
            e.preventDefault();
            const href = e.target.closest('.btn-page-back').getAttribute('href');
            location.hash = href || 'hero';
        }
        
        // Link Yönlendirmeleri
        if (e.target.closest('[data-page]')) {
            const link = e.target.closest('[data-page]');
            // Eğer dropdown içindeyse varsayılanı engelleme (bazı durumlarda gerekli olabilir)
            if(!link.classList.contains('no-prevent')) { 
                e.preventDefault();
                const targetPage = link.getAttribute('data-page');
                location.hash = targetPage;
                
                // Mobilde linke tıklayınca menüyü kapat
                const navbar = document.getElementById('navbar');
                if (navbar && navbar.classList.contains('open')) {
                    navbar.classList.remove('open');
                }
            }
        }

        // Lightbox Açma (Dinamik Yüklenen Resimler İçin)
        if (e.target.closest('.detail-gallery img') || e.target.closest('.house-gallery img')) {
            // Sadece detay galerisi veya restorasyon galerisindeyse aç
            const img = e.target;
            const gallery = img.closest('.detail-gallery') || img.closest('.house-gallery');
            if (gallery && !img.closest('.house-card')) { // Kart resimlerine tıklayınca açılmasın
                currentImages = Array.from(gallery.querySelectorAll("img"));
                currentIndex = currentImages.indexOf(img);
                openLightbox(img.src);
            }
        }
    });
});

/* === DİL FONKSİYONLARI === */
async function setLanguage(lang) {
    // Veri zaten varsa tekrar çekme
    if (!translations[lang]) {
        try {
            const response = await fetch(`${lang}.json`);
            if (!response.ok) throw new Error(`Dil dosyası ${lang}.json yüklenemedi`);
            translations[lang] = await response.json();
        } catch (error) {
            console.error(error);
            // Hata olursa varsayılan olarak Türkçe yükle veya hiçbir şey yapma
            if (lang !== 'tr') return setLanguage('tr');
            return;
        }
    }

    const data = translations[lang];
    document.documentElement.lang = lang;
    
    // RTL (Arapça) Desteği
    if (lang === 'ar') {
        document.documentElement.dir = 'rtl';
    } else {
        document.documentElement.dir = 'ltr';
    }

    // Metinleri Güncelle
    document.querySelectorAll('[data-key]').forEach(el => {
        const key = el.getAttribute('data-key');
        if (data[key]) {
            el.innerHTML = data[key];
        }
    });

    // Buton Aktiflik Durumu
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
    });

    localStorage.setItem('lang', lang);
}

/* === SAYFA YÖNETİMİ (ROUTING) === */
async function showPage(pageId) {
    // Tüm sayfaları gizle
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
    });

    let newPage = document.getElementById(pageId);
    
    // Sayfa DOM'da yoksa yükle (AJAX)
    if (!newPage && pageId !== 'hero') {
        try {
            // Dosya adını belirle (page-about -> about.html)
            let fileName = pageId.replace('page-', '');
            // Bazı özel durumlar
            if (pageId === 'page-satilik_kiralik') fileName = "satilik_kiralik";
            if (pageId === 'page-pruva-otel') fileName = "pruva-otel";

            const response = await fetch(`${fileName}.html`);
            if (!response.ok) throw new Error('Sayfa yüklenemedi');
            
            const html = await response.text();
            // Sayfayı main container'a ekle
            document.querySelector('main').insertAdjacentHTML('beforeend', html);
            newPage = document.getElementById(pageId);
            
        } catch (error) {
            console.error(error);
            location.hash = 'hero'; // Hata olursa anasayfaya dön
            return;
        }
    }

    if (newPage) {
        newPage.classList.add('active');
        window.scrollTo(0, 0); // Sayfa başına dön
        
        // Yeni yüklenen sayfa için dil verilerini uygula
        const currentLang = localStorage.getItem('lang') || 'tr';
        if (translations[currentLang]) {
            newPage.querySelectorAll('[data-key]').forEach(el => {
                const key = el.getAttribute('data-key');
                if (translations[currentLang][key]) {
                    el.innerHTML = translations[currentLang][key];
                }
            });
        }

        // Özel Sayfa Mantıkları
        if (pageId === 'page-pruva-otel') {
            setupRestorationGalleries();
        }
    } else {
        // Eğer hero ise veya sayfa bulunamazsa hero'yu göster
        document.getElementById('hero').classList.add('active');
    }
}

/* === MOBİL MENÜ === */
function setupMobileMenu() {
    const menuToggle = document.getElementById('menu-toggle');
    const navbar = document.getElementById('navbar');

    if (menuToggle && navbar) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation(); // Tıklamayı yayma
            navbar.classList.toggle('open');
        });

        // Sayfa herhangi bir yerine tıklanınca menüyü kapat
        document.addEventListener('click', (e) => {
            if (navbar.classList.contains('open') && !navbar.contains(e.target) && e.target !== menuToggle) {
                navbar.classList.remove('open');
            }
        });
    }
}

/* === MÜLK DETAY & GALERİ === */
async function openHouseDetail(letter) {
    // Galeri verisini çek
    if (!allGalleriesData) {
        try {
            const response = await fetch('data/galleries.json?v=1.1');
            allGalleriesData = await response.json();
        } catch (error) { console.error(error); return; }
    }

    const data = allGalleriesData[letter];
    if (!data) return;

    const currentLang = localStorage.getItem('lang') || 'tr';
    const langData = translations[currentLang] || {}; 

    const detail = document.getElementById("house-detail");
    const content = document.getElementById("house-detail-content");

    // Fiyat Gösterimi (Otelse linkli, değilse düz)
    let priceHTML = '';
    if (letter.startsWith('OTEL')) {
        const priceText = langData[`prop_${letter}_price`] || data.price;
        priceHTML = `<p><strong>${langData.js_fiyat || 'Fiyat'}:</strong> <a href="https://bwizmirhotel.com/" target="_blank" style="color: var(--gold-light); text-decoration: underline;">${priceText}</a></p>`;
    } else {
        const priceText = langData[`prop_${letter}_price`] || data.price;
        priceHTML = `<p><strong>${langData.js_fiyat || 'Fiyat'}:</strong> ${priceText}</p>`;
    }

    // İçeriği Doldur
    content.innerHTML = `
        <h2>${langData[`prop_${letter}_title`] || data.title}</h2>
        <div class="house-info">
            <p><strong>${langData.js_konum || 'Konum'}:</strong> ${langData[`prop_${letter}_location`] || data.location}</p>
            <p><strong>${langData.js_alan || 'Alan'}:</strong> ${langData[`prop_${letter}_area`] || data.area}</p>
            <p><strong>${langData.js_oda_sayisi || 'Oda Sayısı'}:</strong> ${langData[`prop_${letter}_rooms`] || data.rooms}</p>
            ${priceHTML}
            <p>${langData[`prop_${letter}_desc`] || data.desc}</p>
        </div>
        <div class="detail-gallery" id="detail-gallery-container"></div>
        <div id="gallery-loader-container" style="text-align: center; margin: 20px 0;"></div>
    `;

    // Resimleri Yüklemeye Başla
    globalPropertyImages = data.images || [];
    globalImageIndex = 0;
    loadMorePropertyImages();

    // Modalı Aç
    detail.style.display = "block";
    document.body.style.overflow = "hidden"; // Arka plan kaymasını engelle
}

function closeHouseDetail() {
    const detail = document.getElementById("house-detail");
    if (detail) detail.style.display = "none";
    document.body.style.overflow = "auto"; 
}

function loadMorePropertyImages() {
    const container = document.getElementById('detail-gallery-container');
    const loader = document.getElementById('gallery-loader-container');
    
    const slice = globalPropertyImages.slice(globalImageIndex, globalImageIndex + IMAGES_PER_LOAD);
    
    if (slice.length === 0 && globalImageIndex === 0) {
        container.innerHTML = "<p>Resim bulunamadı.</p>";
        return;
    }

    slice.forEach(src => {
        const img = document.createElement('img');
        img.src = src;
        img.loading = 'lazy';
        img.alt = 'Galeri';
        container.appendChild(img);
    });

    globalImageIndex += slice.length;

    // Daha fazla butonunu yönet
    if (globalImageIndex < globalPropertyImages.length) {
        loader.innerHTML = `<button class="btn" onclick="loadMorePropertyImages()">Daha Fazla Göster</button>`;
    } else {
        loader.innerHTML = '';
    }
}

/* === RESTORASYON GALERİSİ === */
function setupRestorationGalleries() {
    globalRestorationBeforeIndex = 0;
    globalRestorationAfterIndex = 0;

    const beforeContainer = document.getElementById('restoration-gallery-before');
    const afterContainer = document.getElementById('restoration-gallery-after');
    
    if(beforeContainer) beforeContainer.innerHTML = '';
    if(afterContainer) afterContainer.innerHTML = '';

    loadRestorationImages('before');
    loadRestorationImages('after');
}

function loadRestorationImages(type) {
    const container = document.getElementById(`restoration-gallery-${type}`);
    const loader = document.getElementById(`restoration-loader-${type}`);
    const list = type === 'before' ? restorationBeforePaths : restorationAfterPaths;
    let currentIndex = type === 'before' ? globalRestorationBeforeIndex : globalRestorationAfterIndex;

    const slice = list.slice(currentIndex, currentIndex + RESTORATION_IMAGES_PER_LOAD);

    slice.forEach(src => {
        const img = document.createElement('img');
        img.src = src;
        img.loading = 'lazy';
        img.alt = `Restorasyon ${type}`;
        img.onerror = function() { this.style.display = 'none'; }; 
        container.appendChild(img);
    });

    // İndeksi güncelle
    if (type === 'before') globalRestorationBeforeIndex += slice.length;
    else globalRestorationAfterIndex += slice.length;

    const newIndex = type === 'before' ? globalRestorationBeforeIndex : globalRestorationAfterIndex;

    // Buton yönetimi
    if (newIndex < list.length) {
        loader.innerHTML = `<button class="btn" onclick="loadRestorationImages('${type}')">Daha Fazla Göster</button>`;
    } else {
        loader.innerHTML = '';
    }
}

/* === LIGHTBOX & DOKUNMATİK KAYDIRMA (SWIPE) === */
function openLightbox(src) {
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    
    lightboxImg.src = src;
    lightbox.style.display = 'flex';
    updateLightboxNav();
}

// Lightbox Navigasyon
function showNextImage() {
    if (currentIndex < currentImages.length - 1) {
        currentIndex++;
        updateLightboxImage();
    }
}

function showPrevImage() {
    if (currentIndex > 0) {
        currentIndex--;
        updateLightboxImage();
    }
}

function updateLightboxImage() {
    const img = document.getElementById('lightbox-img');
    img.style.opacity = '0.5';
    setTimeout(() => {
        img.src = currentImages[currentIndex].src;
        img.style.opacity = '1';
        updateLightboxNav();
    }, 200);
}

function updateLightboxNav() {
    const prevBtn = document.getElementById('lightbox-prev');
    const nextBtn = document.getElementById('lightbox-next');
    
    if(prevBtn) prevBtn.style.display = currentIndex === 0 ? 'none' : 'block';
    if(nextBtn) nextBtn.style.display = currentIndex === currentImages.length - 1 ? 'none' : 'block';
}

// Lightbox Event Listeners
const lightbox = document.getElementById('lightbox');
if (lightbox) {
    // Kapatma
    lightbox.addEventListener('click', (e) => {
        if (e.target.id === 'lightbox') {
            lightbox.style.display = 'none';
        }
    });

    // Klavye Kontrolü
    document.addEventListener('keydown', (e) => {
        if (lightbox.style.display === 'flex') {
            if (e.key === 'Escape') lightbox.style.display = 'none';
            if (e.key === 'ArrowRight') showNextImage();
            if (e.key === 'ArrowLeft') showPrevImage();
        }
    });

    // Dokunmatik Kaydırma (Swipe)
    let touchStartX = 0;
    let touchEndX = 0;
    
    lightbox.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
    }, {passive: true});

    lightbox.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, {passive: true});

    function handleSwipe() {
        if (touchEndX < touchStartX - 50) showNextImage();
        if (touchEndX > touchStartX + 50) showPrevImage();
    }
}

/* === REZERVASYON SİSTEMİ === */
function setupProjectReservation() {
    // Otel arama butonu
    document.body.addEventListener('click', (e) => {
        if (e.target.id === 'otel-search') {
            const checkin = document.getElementById('otel-checkin').value;
            const checkout = document.getElementById('otel-checkout').value;
            const modal = document.getElementById('availability-modal');
            const msg = document.getElementById('availability-message');
            
            if (!checkin || !checkout) {
                alert("Lütfen tarih seçiniz.");
                return;
            }

            // Rastgele müsaitlik simülasyonu
            const isAvailable = Math.random() > 0.3;
            if (isAvailable) {
                msg.innerHTML = `✅ ${checkin} - ${checkout} tarihleri için odalarımız müsait!<br><br>Rezervasyon için lütfen iletişime geçin.`;
            } else {
                msg.innerHTML = `❌ Üzgünüz, seçilen tarihlerde doluyuz.`;
            }
            modal.classList.add('show');
        }
        
        // Modal Kapatma
        if (e.target.id === 'close-modal-btn') {
            document.getElementById('availability-modal').classList.remove('show');
        }
        
        // Hero Rezervasyon Butonu (Modalı aç)
        if (e.target.id === 'hero-reserve-btn') {
            // Yeni sekmede açılıyor (HTML'de href var), ama eğer popup istenirse burası kullanılır.
            // document.getElementById('otel-reservation-container').classList.add('show');
        }
    });
}

/* === HERO METİN ANİMASYONU === */
function startHeroTextAnimation() {
    const textElement = document.getElementById('changing-text');
    if (!textElement) return;

    const data = [
        { title: "Mimarlık", description: "Teknik standartlara göre şekillendirilmiş, verimli ve sürdürülebilir mimari çözümler." },
        { title: "Kat Karşılığı", description: "Proje teslimi ve inşaat standartlarını hukuki normlara uygun yapılandırıyoruz." },
        { title: "Ticari ve Konut", description: "Doğru fiyatlama ile satış ve kiralama süreçlerini yönetiyoruz." },
        { title: "Restorasyon", description: "Tarihi yapıları özgün değerleriyle ustalıkla yeniliyoruz." }
    ];

    let index = 0;
    
    // İlk metni hemen göster
    textElement.innerHTML = `<strong>${data[0].title}</strong><br>${data[0].description}`;

    setInterval(() => {
        textElement.style.opacity = '0';
        setTimeout(() => {
            index = (index + 1) % data.length;
            textElement.innerHTML = `<strong>${data[index].title}</strong><br>${data[index].description}`;
            textElement.style.opacity = '1';
        }, 500);
    }, 4000);
}

/* === YARDIMCI FONKSİYON: Ön Yükleme === */
function preloadProjectImages() {
    // Arka planda kritik olmayan resimleri yükle
    const images = ['assets/otel_hero.webp', 'assets/for_konut.webp', 'assets/for_ticari.webp'];
    images.forEach(src => {
        const img = new Image();
        img.src = src;
    });
}
