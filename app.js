// === AYARLAR (CONFIGURATION) ===
const CONFIG = {
  IMAGES_PER_LOAD: 6,
  DEFAULT_LANGUAGE: 'tr',
  TOURS_DATA_PATH: 'data/tours.json',
  LANGUAGES_PATH: 'data/languages/'
};

// === DURUM YÖNETİMİ (STATE MANAGEMENT) ===
const AppState = {
  translations: {},
  pageCache: {},
  tourData: {},
  gallery: {
    images: [],
    index: 0
  },
  lightbox: {
    images: [],
    index: 0
  }
};

// === YARDIMCI FONKSİYONLAR ===
function generateImages(baseName, count) {
  const images = [];
  for (let i = 1; i <= count; i++) {
    images.push(`assets/${baseName}${i}.webp`);
  }
  return images;
}

// === VERİ YÜKLEME ===
async function loadTourData() {
  try {
    const response = await fetch(CONFIG.TOURS_DATA_PATH);
    if (!response.ok) {
      throw new Error(`Tur verileri yüklenemedi: ${response.status}`);
    }
    const data = await response.json();
    
    // Her tur için resim listesini oluştur
    Object.entries(data).forEach(([id, tour]) => {
      if (tour.imagePrefix && tour.imageCount) {
        tour.images = generateImages(tour.imagePrefix + '-', tour.imageCount);
      }
    });
    
    AppState.tourData = data;
    return data;
  } catch (error) {
    console.error('Tur verileri yüklenirken hata oluştu:', error);
    showError('Tur verileri yüklenemedi. Lütfen sayfayı yenileyin.');
  }
}

// === TUR DETAY PENCERESİ (MODAL) ===
function openHouseDetail(tourID) {
  const tour = AppState.tourData[tourID];

  if (!tour) {
    console.error(`Tur bulunamadı: ${tourID}`);
    alert("Bu turun detaylarına şu an ulaşılamıyor.");
    return;
  }

  const detail = document.getElementById("house-detail");
  const content = document.getElementById("house-detail-content");
  
  // İçerik HTML'ini oluştur
  content.innerHTML = `
    <h2 class="detail-title" style="color: #ffcc66; font-family: 'Playfair Display', serif; margin-bottom: 20px;">${tour.title}</h2>
    
    <div class="house-info" style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 10px; border: 1px solid #333;">
      <div style="margin-bottom: 10px;">
        <i class="fas fa-map-marker-alt" style="color: #ffcc66; width: 20px;"></i> 
        <strong style="color: #fff;">Lokasyon:</strong> <span style="color: #ccc;">${tour.location} (${tour.area})</span>
      </div>
      
      <div style="margin-bottom: 10px;">
        <i class="fas fa-clock" style="color: #ffcc66; width: 20px;"></i> 
        <strong style="color: #fff;">Süre & Fiyat:</strong> <span style="color: #ffcc66; font-weight: bold;">${tour.price}</span>
      </div>
      
      <div style="margin-bottom: 10px;">
        <i class="fas fa-bed" style="color: #ffcc66; width: 20px;"></i> 
        <strong style="color: #fff;">Konaklama:</strong> <span style="color: #ccc;">${tour.rooms}</span>
      </div>

      <hr style="border: 0; border-top: 1px solid #444; margin: 20px 0;">
      
      <p style="color: #ddd; line-height: 1.6;">${tour.desc}</p>

      <div style="margin-top: 25px; text-align: center;">
        <a href="mailto:info@walkaboutravel.com?subject=Rezervasyon Talebi: ${tour.title}" class="btn" style="display: inline-block;">
          <i class="fas fa-paper-plane"></i> Rezervasyon Yap
        </a>
      </div>
    </div>

    <div class="detail-gallery" id="detail-gallery-container" style="margin-top: 30px;"></div>
  `;

  // Galeri verilerini hazırla
  AppState.gallery.images = tour.images || [];
  AppState.gallery.index = 0;
  
  // İlk resimleri yükle
  loadMorePropertyImages();
  
  // Modalı göster
  detail.style.display = "block";
  document.body.style.overflow = "hidden";
}

function closeHouseDetail() {
  const detail = document.getElementById("house-detail");
  if (detail) {
    detail.style.display = "none";
  }
  document.body.style.overflow = "auto";
}

// === GALERİ RESİM YÜKLEME ===
function loadMorePropertyImages() {
  const galleryContainer = document.getElementById('detail-gallery-container');
  if (!galleryContainer) return;

  if (AppState.gallery.images.length === 0) {
    galleryContainer.innerHTML = "<p style='text-align:center; color:#666;'>Bu tur için henüz görsel eklenmemiş.</p>";
    return;
  }

  const imagesToLoad = AppState.gallery.images.slice(
    AppState.gallery.index, 
    AppState.gallery.index + CONFIG.IMAGES_PER_LOAD
  );

  const imagesHTML = imagesToLoad.map((img, i) => {
    const absoluteIndex = AppState.gallery.index + i;
    // DÜZELTME: Fallback görsel eklendi
    return `<img loading="lazy" src="${img}" alt="Tur Görseli" 
      onclick="openGlobalGallery(${absoluteIndex})" 
      onerror="this.src='assets/fallback.webp'; this.onerror=null;" 
      style="cursor:pointer; transition: transform 0.3s;">`;
  }).join("");

  galleryContainer.insertAdjacentHTML('beforeend', imagesHTML);
  AppState.gallery.index += CONFIG.IMAGES_PER_LOAD;
}

// === LIGHTBOX (BÜYÜK RESİM) SİSTEMİ ===
function openGlobalGallery(index) {
  openGallery(AppState.gallery.images, index);
}

function openGallery(images, startIndex = 0) {
  if (!images || images.length === 0) return;

  AppState.lightbox.images = images;
  AppState.lightbox.index = startIndex;
  
  const lightboxModal = document.getElementById('lightbox-modal');
  if (lightboxModal) {
    lightboxModal.style.display = 'flex';
    lightboxModal.classList.add('active');
    updateLightboxView();
  }
}

function updateLightboxView() {
  const lightboxImage = document.getElementById('lightbox-image');
  const lightboxCounter = document.getElementById('lightbox-counter');

  if (!lightboxImage) return;

  lightboxImage.style.opacity = '0.5';

  setTimeout(() => {
    const currentImgSrc = AppState.lightbox.images[AppState.lightbox.index];
    lightboxImage.src = currentImgSrc;
    // Lightbox içinde de fallback kontrolü
    lightboxImage.onerror = function() {
        this.src = 'assets/fallback.webp';
        this.onerror = null;
    };
    lightboxImage.style.opacity = '1';
  }, 150);

  if (lightboxCounter) {
    lightboxCounter.innerText = `${AppState.lightbox.index + 1} / ${AppState.lightbox.images.length}`;
  }
}

function showNextImage() {
  if (AppState.lightbox.images.length === 0) return;

  AppState.lightbox.index++;
  if (AppState.lightbox.index >= AppState.lightbox.images.length) {
    AppState.lightbox.index = 0;
  }
  updateLightboxView();
}

function showPrevImage() {
  if (AppState.lightbox.images.length === 0) return;

  AppState.lightbox.index--;
  if (AppState.lightbox.index < 0) {
    AppState.lightbox.index = AppState.lightbox.images.length - 1;
  }
  updateLightboxView();
}

function closeLightbox() {
  const lightboxModal = document.getElementById('lightbox-modal');
  if (lightboxModal) {
    lightboxModal.style.display = 'none';
    lightboxModal.classList.remove('active');
  }
}

// === DİL YÖNETİMİ ===
async function setLanguage(lang) {
  let langData;
  
  if (AppState.translations[lang]) {
    langData = AppState.translations[lang];
  } else {
    try {
      const response = await fetch(`${CONFIG.LANGUAGES_PATH}${lang}.json`);
      if (!response.ok) {
        throw new Error(`Dil dosyası bulunamadı: ${lang}`);
      }
      langData = await response.json();
      AppState.translations[lang] = langData;
    } catch (error) {
      console.warn("Dil yüklenemedi, varsayılan (TR) kullanılıyor:", error);
      if (lang !== 'tr' && !AppState.translations['tr']) {
        await setLanguage('tr');
      }
      return;
    }
  }
  
  document.documentElement.lang = lang;
  document.documentElement.dir = (lang === 'ar') ? 'rtl' : 'ltr';

  document.querySelectorAll('[data-key]').forEach(el => {
    const key = el.getAttribute('data-key');
    if (langData && langData[key]) {
      el.innerHTML = langData[key];
    }
  });
  
  localStorage.setItem('lang', lang);
}

// === SAYFA YÖNETİMİ ===
async function showPage(pageId) {
  try {
    if (!pageId || pageId === '#') pageId = 'hero';
    
    // Tüm bölümleri gizle
    document.querySelectorAll('.page-section').forEach(sec => {
      sec.classList.remove('active', 'visible');
    });

    let newPage = document.getElementById(pageId);
    
    // Sayfa DOM'da yoksa yükle
    if (!newPage) {
      if (AppState.pageCache[pageId]) {
        document.getElementById('page-container').insertAdjacentHTML('beforeend', AppState.pageCache[pageId]);
      } else {
        // Dosya ismini belirle
        let fileName = pageId;
        if (pageId.startsWith('page-')) {
          fileName = pageId.replace('page-', '');
        }
        // Özel dosya isimleri eşleşmesi
        if (pageId === 'page-satilik_kiralik') fileName = "satilik_kiralik";
        if (pageId === 'page-tours') fileName = "tours"; 
        
        const response = await fetch(`pages/${fileName}.html`).catch(() => fetch(`${fileName}.html`));
        
        if (!response || !response.ok) {
           // Eğer pages klasöründe bulamazsa ana dizine bakar, orada da yoksa hata verir
           const retryResponse = await fetch(`${fileName}.html`);
           if(!retryResponse.ok) throw new Error(`Sayfa bulunamadı: ${fileName}`);
           
           const html = await retryResponse.text();
           AppState.pageCache[pageId] = html;
           document.getElementById('page-container').insertAdjacentHTML('beforeend', html);
        } else {
           const html = await response.text();
           AppState.pageCache[pageId] = html;
           document.getElementById('page-container').insertAdjacentHTML('beforeend', html);
        }
      }
      
      newPage = document.getElementById(pageId);
    }

    if (newPage) {
      if (location.hash.replace('#', '') !== pageId) {
        location.hash = pageId;
      }
      
      newPage.classList.add('active');
      window.scrollTo(0, 0);

      // Dil çevirilerini uygula
      const currentLang = localStorage.getItem('lang') || CONFIG.DEFAULT_LANGUAGE;
      if (AppState.translations[currentLang]) {
        newPage.querySelectorAll('[data-key]').forEach(el => {
          const key = el.getAttribute('data-key');
          if (AppState.translations[currentLang][key]) {
            el.innerHTML = AppState.translations[currentLang][key];
          }
        });
      }
      
      setTimeout(() => newPage.classList.add('visible'), 50);
    }
  } catch (error) {
    console.error('Sayfa yükleme hatası:', error);
    showError('Sayfa yüklenemedi. Lütfen tekrar deneyin.');
  }
}

// === HATA GÖSTERİMİ ===
function showError(message) {
  const container = document.getElementById('page-container');
  if (container) {
    container.innerHTML = `
      <div style="text-align:center; padding:100px 20px;">
        <h2>Bir Hata Oluştu</h2>
        <p>${message}</p>
        <button onclick="location.reload()" class="btn">Sayfayı Yenile</button>
      </div>
    `;
  }
}

// === BAŞLATMA (INITIALIZATION) ===
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Verileri yükle
    await loadTourData();
    
    // Dili ayarla
    const savedLang = localStorage.getItem('lang') || CONFIG.DEFAULT_LANGUAGE;
    await setLanguage(savedLang);
    
    // İlk sayfayı göster
    const initialPage = location.hash.replace('#', '') || 'hero';
    showPage(initialPage);

    // Hash değişimi dinleyicisi
    window.addEventListener('hashchange', () => {
      showPage(location.hash.replace('#', '') || 'hero');
    });

    // Menü butonu
    const menuToggle = document.getElementById('menu-toggle');
    if (menuToggle) {
      menuToggle.addEventListener('click', () => {
        document.getElementById('navbar').classList.toggle('open');
      });
    }

    // Tıklama olayları (Event Delegation)
    document.body.addEventListener('click', (e) => {
      // Geri butonu
      if (e.target.classList.contains('btn-page-back')) {
        e.preventDefault();
        location.hash = 'hero';
      }
      
      // Sayfa geçiş butonları (data-page)
      if (e.target.matches('[data-page]')) {
        e.preventDefault();
        const page = e.target.getAttribute('data-page');
        location.hash = page;
        document.getElementById('navbar').classList.remove('open');
      }
      
      // Lightbox dışına tıklama
      if (e.target.id === 'lightbox-modal') {
        closeLightbox();
      }
    });

    // Klavye kontrolleri
    document.addEventListener('keydown', (e) => {
      if (e.key === "Escape") {
        const detail = document.getElementById("house-detail");
        const lightbox = document.getElementById("lightbox-modal");
        
        if (detail && detail.style.display !== "none" && (!lightbox || lightbox.style.display === "none")) {
          closeHouseDetail();
        } else if (lightbox && lightbox.style.display !== "none") {
          closeLightbox();
        }
      }
      
      if (document.getElementById('lightbox-modal')?.style.display !== 'none') {
        if (e.key === 'ArrowRight') showNextImage();
        if (e.key === 'ArrowLeft') showPrevImage();
      }
    });

    // Lightbox butonları
    const nextBtn = document.getElementById('next-btn');
    const prevBtn = document.getElementById('prev-btn');
    const closeBtn = document.getElementById('close-lightbox');

    if (nextBtn) nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showNextImage();
    });

    if (prevBtn) prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showPrevImage();
    });

    if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
    
  } catch (error) {
    console.error('Kritik başlatma hatası:', error);
    // Hata durumunda kullanıcıyı bilgilendir ama uygulamayı tamamen kilitleme
    // showError('Uygulama başlatılamadı.'); 
  }
});

// === FONKSİYONLARI DIŞARI AÇ (GLOBAL SCOPE) ===
window.openHouseDetail = openHouseDetail;
window.closeHouseDetail = closeHouseDetail;
window.openGlobalGallery = openGlobalGallery;
window.setLanguage = setLanguage;
window.showPage = showPage;
window.showNextImage = showNextImage;
window.showPrevImage = showPrevImage;
window.closeLightbox = closeLightbox;
