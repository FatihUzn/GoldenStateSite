function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }
}

const translations = {}; 
let allGalleriesData = null; 
const pageCache = {}; 

async function openHouseDetail(letter) {
  
  if (!allGalleriesData) {
    try {
      
      const response = await fetch('data/galleries.json?v=1.1'); 
      
      if (!response.ok) {
        throw new Error('Galeri verisi data/galleries.json yüklenemedi');
      }
      allGalleriesData = await response.json(); 
    } catch (error) {
      console.error(error);
      return; 
    }
  }

  const detail = document.getElementById("house-detail");
  const content = document.getElementById("house-detail-content");
  
  const h = allGalleriesData[letter]; 

  let priceHTML = '';
  if (letter.startsWith('OTEL')) {
      priceHTML = `<p><strong>${"Fiyat"}:</strong> <a href="https://bwizmirhotel.com/" target="_blank" rel="noopener noreferrer" style="color: var(--gold-light); text-decoration: underline;">${h.price}</a></p>`;
  } else {
      priceHTML = `<p><strong>${"Fiyat"}:</strong> ${h.price}</p>`;
  }

  if (!h) {
      console.error(`'${letter}' için ev detayı bulunamadı.`);
      return;
  }
  
  const currentLang = localStorage.getItem('lang') || 'tr';
  const langData = translations[currentLang] || {}; 

  content.innerHTML = `
    <h2>${h.title}</h2>
    
    <div class="house-info">
      <p><strong>${langData.js_konum || 'Konum'}:</strong> ${h.location}</p>
      <p><strong>${langData.js_alan || 'Alan'}:</strong> ${h.area}</p>
      <p><strong>${langData.js_oda_sayisi || 'Oda Sayısı'}:</strong> ${h.rooms}</p>
      ${priceHTML.replace('Fiyat:', `<strong>${langData.js_fiyat || 'Fiyat'}:</strong>`)}
      <p>${h.desc}</p>
    </div>

    <div class="detail-gallery">
      ${h.images.map(img => `<img loading="lazy" src="${img}" alt="${h.title}" onerror="this.remove()">`).join("")}
    </div>
  `;
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

async function setLanguage(lang) {
    let langData;

    if (translations[lang]) {
        langData = translations[lang];
    } else {
        try {
            const response = await fetch(`${lang}.json`);
            if (!response.ok) {
                throw new Error(`Dil dosyası ${lang}.json yüklenemedi`);
            }
            langData = await response.json(); 
            translations[lang] = langData; 
        } catch (error) {
            console.warn(`Dil dosyası ${lang}.json yüklenemedi veya işlenemedi:`, error);
            if (lang !== 'en') {
                return await setLanguage('en'); 
            }
            return;
        }
    }
    
    const elements = document.querySelectorAll('[data-key]');
    
    document.querySelector('title').textContent = langData['title'];
    document.documentElement.lang = lang; 
    
    if (lang === 'ar') {
        document.documentElement.dir = 'rtl';
    } else {
        document.documentElement.dir = 'ltr';
    }

    document.querySelectorAll('[data-key]').forEach(el => {
        const key = el.getAttribute('data-key');
        if (langData[key]) {
            el.innerHTML = langData[key];
        }
    });

    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-lang') === lang) {
            btn.classList.add('active');
        }
    });
   
    localStorage.setItem('lang', lang);
}

async function showPage(pageId) {
    
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
    });

    let newPage = document.getElementById(pageId);
    
    if (!newPage) {
        if (pageCache[pageId]) {
            document.getElementById('page-container').insertAdjacentHTML('beforeend', pageCache[pageId]);
        } else {
            try {
                let fileName = pageId;
                if (pageId === 'page-about') fileName = 'about';
                if (pageId === 'page-services') fileName = 'services';
                if (pageId === 'page-projects') fileName = 'projects';
                if (pageId === 'page-contact') fileName = 'contact';
                if (pageId === 'page-otel') fileName = 'otel';
                if (pageId === 'page-insaat') fileName = 'insaat';
                if (pageId === 'page-restorasyon') fileName = "restorasyon";
                if (pageId === 'page-satilik_kiralik') fileName = "satilik_kiralik";

                if (fileName === pageId) { 
                   /* 'hero' zaten index.html'de, fetch edilmesine gerek yok */
                } else {
                      const response = await fetch(`${fileName}.html`);
                    
                    if (!response.ok) throw new Error(`Sayfa yüklenemedi: ${fileName}.html`);
                    
                    const html = await response.text();
                    pageCache[pageId] = html; 
                    document.getElementById('page-container').insertAdjacentHTML('beforeend', html);
                }
            } catch (error) {
                console.error(error);
                showPage('hero'); 
                return;
            }
        }
        newPage = document.getElementById(pageId);
    }

    if (newPage) {
        
        newPage.classList.add('active');
        window.scrollTo(0, 0); 

        if (pageId === 'hero') {
            const heroElement = document.getElementById('hero');
            if (heroElement) {
                heroElement.style.opacity = 1;
            }
        }
        
        const currentLang = localStorage.getItem('lang') || 'tr';
        if (translations[currentLang]) {
            newPage.querySelectorAll('[data-key]').forEach(el => {
                const key = el.getAttribute('data-key');
                if (translations[currentLang][key]) {
                    el.innerHTML = translations[currentLang][key];
                }
            });
        }

        newPage.classList.remove('visible');
        
        /* === DEĞİŞİKLİK BURADA (BAŞLANGIÇ) === */
        // Kart animasyonu artık CSS ile yapılıyor. JS sadece sınıfı ekliyor.
        setTimeout(() => {
            const cards = newPage.querySelectorAll('.project-card, .latest-card, .service-card, .house-card, .restoration-card');
            
            // Önceki animasyonlardan kalan stilleri temizle
            cards.forEach(card => {
                card.classList.remove('card-fade-in');
                card.style.animationDelay = '';
            });
            
            // Yeni animasyonu tetikle
            cards.forEach((card, index) => {
                card.style.animationDelay = `${index * 100}ms`;
                card.classList.add('card-fade-in');
            });
            newPage.classList.add('visible');
        }, 50);
        /* === DEĞİŞİKLİK BURADA (BİTİŞ) === */
        
    } else {
        console.error(`Sayfa bulunamadı: ${pageId}`);
    }
}

function setupMobileMenu() {
    const menuToggle = document.getElementById('menu-toggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            const navbar = document.getElementById('navbar');
            if (navbar) {
                navbar.classList.toggle('open');
                const mobileLangSelector = navbar.querySelector('.language-selector.mobile-only');
                if (mobileLangSelector) {
                    mobileLangSelector.style.display = 'flex';
                }
            }
        });
    }

    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            const navbar = document.getElementById('navbar');
            if (navbar) {
                navbar.classList.remove('open');
                const mobileLangSelector = navbar.querySelector('.language-selector.mobile-only');
                if (mobileLangSelector) mobileLangSelector.style.display = 'none';
            }
        });
    });
}

function setupScrollReveal() {
    const heroSection = document.getElementById('hero');
    if (heroSection) {
        heroSection.classList.add('visible');
    }
}

function setupCardAnimations() {
    const cardSelector = '.project-card, .latest-card, .service-card, .restoration-card';
    const cards = document.querySelectorAll(cardSelector);
    cards.forEach((card, index) => {
      setTimeout(() => {
        card.style.transition = 'all 1s cubic-bezier(0.25, 1, 0.5, 1)';
        card.style.opacity = '1';
        card.style.transform = 'scale(1)';
      }, index * 100 + 400);
    });
}

const projects = {
  otel: [
    { name: "Lüks Kral Dairesi", price: " gecelik ₺15.000", img: "assets/otel1.webp" },
    { name: "Deniz Manzaralı Suit", price: " gecelik ₺8.500", img: "assets/otel2.webp" },
    { name: "Standart Oda", price: " gecelik ₺4.200", img: "assets/otel3.webp" },
    { name: "Aile Odası", price: " gecelik ₺6.800", img: "assets/otel4.webp" },
    { name: "Ekonomik Oda", price: " gecelik ₺3.500", img: "assets/otel5.webp" }
  ],
  insaat: [
    { name: "Modern Gökdelen", img: "assets/insaat1.webp" },
    { name: "Alışveriş Merkezi", img: "assets/insaat2.webp" },
    { name: "Lüks Konut Sitesi", img: "assets/insaat3.webp" },
    { name: "Ofis Kuleleri", img: "assets/insaat4.webp" },
    { name: "Endüstriyel Tesis", img: "assets/insaat5.webp" }
  ],
  restorasyon: [
    { name: "Tarihi Yalı Restorasyonu", img: "assets/restorasyon1.webp" },
    { name: "Eski Kilise Canlandırma", img: "assets/restorasyon2.webp" },
    { name: "Kervansaray Yenileme", img: "assets/restorasyon3.webp" },
    { name: "Tarihi Saat Kulesi", img: "assets/restorasyon4.webp" },
    { name: "Şehir Surları", img: "assets/restorasyon5.webp" }
  ],
  satilik_kiralik: [
    { name: "Satılık Lüks Villa", price: "₺45.000.000", img: "https://placehold.co/320x220/f59e0b/0a0a0a?text=Satılık+Ev" },
    { name: "Kiralık Rezidans", price: "aylık ₺80.000", img: "https://placehold.co/320x220/f59e0b/0a0a0a?text=Kiralık+Ev" }
  ]
};

function preloadProjectImages() {
    const allImageUrls = [
        ...projects.otel.map(p => p.img),
        ...projects.insaat.map(p => p.img),
        ...projects.restorasyon.map(p => p.img),
        ...projects.satilik_kiralik.map(p => p.img)
    ]; 
    allImageUrls.forEach(url => {
        if (url.startsWith('http')) return; 
        const img = new Image();
        img.src = url; 
    });
    console.log("Proje görselleri arka planda yükleniyor.");
}

function loadCategory(category, checkin = null, checkout = null) {
  if (category === 'satilik_kiralik') {
      console.log("'satilik_kiralik' kendi sayfasına yönlendirildi, loadCategory atlanıyor.");
      return; 
  }
    
  const grid = document.getElementById("project-grid"); 
  if (!grid) {
      console.error("Proje grid'i bulunamadı (ID: project-grid)");
      return;
  }
  grid.style.opacity = "0";

  const titleEl = document.getElementById('projects-title'); 
  const currentLang = localStorage.getItem('lang') || 'tr';
  
  const langData = translations[currentLang] || {}; 
  
  const titles = {
        'otel': langData.page_otel_h1 || 'Otelimiz',
        'insaat': langData.page_insaat_h1 || 'İnşaat Projeleri',
        'restorasyon': langData.page_restorasyon_h1 || 'Restorasyon Projeleri',
        'satilik_kiralik': langData.page_satilik_h2 || 'Satılık/Kiralık Evler',
        'default_projects': langData.projects_title_featured || 'Öne Çıkan Projelerimiz'
  };
  
  if (titleEl) {
      if(category === 'otel' && checkin && checkout) {
          const dateTitle = (langData.no_rooms || 'Müsait Odalar').replace('Bu tarihlerde müsait oda bulunamadı.', '').trim();
          titleEl.textContent = `${titles['otel']} ${dateTitle} (${checkin} - ${checkout})`;
      } else {
          titleEl.textContent = titles[category] || titles['default_projects'];
      }
  }

  setTimeout(() => {
    grid.innerHTML = "";
   
    let itemsToDisplay = projects[category];
    
    if(category === 'otel' && checkin) {
        itemsToDisplay = projects.otel.filter(() => Math.random() > 0.3); 
        if (itemsToDisplay.length === 0) {
            grid.innerHTML = `<p data-key="no_rooms">${langData.no_rooms || 'Bu tarihlerde müsait oda bulunamadı.'}</p>`;
            grid.style.opacity = "1";
            return;
        }
    }

    if (!itemsToDisplay) {
        grid.innerHTML = `
            <div class="project-card">
              <img src="assets/for_konut.webp" alt="Konut Projesi" loading="lazy">
              <h3 data-key="project_h3_residence">${langData.project_h3_residence || 'Konut Projeleri'}</h3>
            </div>
            <div class="project-card">
              <img src="assets/for_ticari.webp" alt="Ticari Proje" loading="lazy">
              <h3 data-key="project_h3_commercial">${langData.project_h3_commercial || 'Ticari Projeler'}</h3>
            </div>
            <div class="project-card">
              <img src="assets/for_cok_amacli.webp" alt="Cok Amacli Proje" loading="lazy">
              <h3 data-key="project_h3_multipurpose">${langData.project_h3_multipurpose || 'Çok Amaçlı Alanlar'}</h3>
            </div>`;
        if (titleEl) titleEl.textContent = titles['default_projects'];
        grid.style.opacity = "1";
        setupCardAnimations(); 
        return;
    }

    itemsToDisplay.forEach(project => {
      const card = document.createElement("div");
      card.className = "project-card";
      card.style.opacity = '0';
      card.style.transform = 'scale(0.9)';
      
      const imgSrc = project.img.startsWith('http') ? project.img : `${project.img}`; 
      const priceHTML = project.price ? `<p class="project-price">${project.price}</p>` : '';
      
      card.innerHTML = `<img src="${imgSrc}" alt="${project.name}" loading="lazy" onerror="this.src='https://placehold.co/320x220/111/f59e0b?text=${project.name}'"><h3>${project.name}</h3>${priceHTML}`;
      grid.appendChild(card);
    });
    
    grid.style.opacity = "1";
    
  }, 300);
}

function handleScrollEffects() {
    const scrollY = window.scrollY;
    const header = document.querySelector('header');
    const hero = document.getElementById('hero');
    
    if (hero && hero.classList.contains('active')) {
        const heroHeight = hero.offsetHeight; 
        const fadeEnd = heroHeight * 0.7; 
        
        let opacity = 1 - (scrollY / fadeEnd);
        opacity = Math.max(0, Math.min(1, opacity)); 
        
        hero.style.opacity = opacity;
    } else if (hero) {
        hero.style.opacity = 1; 
    }

    if (header) {
        const scrollThreshold = 50;
        const solidBackground = "rgba(10, 10, 10, 0.9)";
        const gradientBackground = "linear-gradient(to bottom, rgba(10, 10, 10, 0.8) 0%, rgba(10, 10, 10, 0.0) 100%)";
        
        if (scrollY > scrollThreshold) {
            header.style.background = solidBackground;
        } else {
            header.style.background = gradientBackground;
        }
    }
}

function setupProjectReservation() {
    document.body.addEventListener('click', (e) => {
        if (e.target && e.target.id === 'project-search') {
            const checkin = document.getElementById('project-check-in').value;
            const checkout = document.getElementById('project-check-out').value;
            const currentLang = localStorage.getItem('lang') || 'tr';
            const langData = translations[currentLang] || {};
            
            if (!checkin || !checkout) {
                alert(langData.alert_dates || 'Lütfen giriş ve çıkış tarihlerini seçin.');
                return;
            }
            if (new Date(checkin) >= new Date(checkout)) {
                alert(langData.alert_invalid_date || 'Çıkış tarihi, giriş tarihinden sonra olmalıdır.');
                return;
            }
            
            loadCategory('otel', checkin, checkout);
        }
    });
}


document.body.addEventListener('click', (e) => {
    const reservationContainer = document.getElementById("otel-reservation-container");

    if (e.target && e.target.id === 'hero-reserve-btn') {
        if (reservationContainer) {
            reservationContainer.classList.add("show");
            reservationContainer.scrollIntoView({ behavior: "smooth" });
        }
    }
    
    if (e.target && e.target.id === 'otel-close') {
        if (reservationContainer) {
            reservationContainer.classList.remove("show");
            const heroOtel = document.getElementById('page-otel');
            if (heroOtel) {
                heroOtel.scrollIntoView({ behavior: "smooth" });
            }
        }
    }
});


document.body.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'otel-search') {
        const modal = document.getElementById("availability-modal");
        const message = document.getElementById("availability-message");
        if (!modal || !message) return;

        const currentLang = localStorage.getItem('lang') || 'tr';
        const langData = translations[currentLang] || {};

        const checkin = document.getElementById("otel-checkin").value;
        const checkout = document.getElementById("otel-checkout").value;

        if (!checkin || !checkout) {
            message.innerHTML = langData.modal_avail_alert_select || '⚠️ Lütfen giriş ve çıkış tarihlerini seçin.';
            modal.classList.add("show");
            return;
        }

        const oldMailBtn = message.parentElement.querySelector('.btn-mail');
        if (oldMailBtn) oldMailBtn.remove();

        const random = Math.random();
        if (random > 0.5) {
            message.innerHTML = langData.modal_avail_success || '✅ Müsait odalar bulundu!';
            
            const mailBtn = document.createElement("button");
            mailBtn.textContent = langData.btn_mail_reserve || 'E-posta ile Rezervasyon Yap';
            mailBtn.classList.add("btn", "btn-mail");
            mailBtn.style.marginTop = "15px";

            mailBtn.addEventListener("click", () => {
                const subject = encodeURIComponent("Rezervasyon Talebi - Golden Palace Otel");
                const body = encodeURIComponent(`Merhaba,%0A%0A${checkin} - ${checkout} tarihleri arasında rezervasyon yapmak istiyorum.%0A%0Aİyi günler.`);
                window.location.href = `mailto:info@goldenpalace.com?subject=${subject}&body=${body}`;
            });

            message.parentElement.appendChild(mailBtn);
        } else {
            message.innerHTML = langData.modal_avail_fail || '❌ Maalesef bu tarihlerde müsait oda bulunamadı.';
        }

        modal.classList.add("show");
    }

    if (e.target && e.target.id === 'close-modal-btn') {
        const modal = document.getElementById("availability-modal");
        if (modal) modal.classList.remove("show");
    }
});


document.addEventListener('DOMContentLoaded', async () => {
    window.scrollTo(0, 0); 
    
    const desktopLangSelector = document.querySelector('.language-selector.desktop-only');
    const mobileLangSelector = document.querySelector('.language-selector.mobile-only');

    if (window.innerWidth <= 768) {
        if (desktopLangSelector) desktopLangSelector.style.display = 'none';
    } else {
        if (mobileLangSelector) mobileLangSelector.style.display = 'none';
    }
    
    let finalLang = 'tr'; 
    const supportedLangs = ['tr', 'en', 'zh', 'ar'];
    
    const savedLang = localStorage.getItem('lang');
    
    if (savedLang && supportedLangs.includes(savedLang)) {
        finalLang = savedLang;
    } else {
        const browserLang = navigator.language.split('-')[0]; 
        if (supportedLangs.includes(browserLang)) {
            finalLang = browserLang;
        }
    }

    try {
        await setLanguage(finalLang);
    } catch (e) {
        console.error("Dil yüklenemedi:", e);
        await setLanguage('tr'); 
    }
    
    setTimeout(preloadProjectImages, 1000); 
    
    setupMobileMenu();
    setupProjectReservation(); 
    setupScrollReveal(); 

    const cta = document.getElementById("discover-cta");
    if (cta) {
        const button = cta.querySelector(".btn");
        const dropdown = cta.querySelector(".dropdown");

        button.addEventListener("click", e => {
            e.preventDefault();
            e.stopPropagation();
            cta.classList.toggle("open");
        });
        document.addEventListener("click", e => {
            if (cta && !cta.contains(e.target)) cta.classList.remove("open");
        });

        dropdown.querySelectorAll("a[data-page]").forEach(link => {
            link.addEventListener("click", e => {
                e.preventDefault();
                e.stopPropagation();
                const cat = link.getAttribute("data-category");
                
                if (cat === 'otel') {
                    showPage('page-otel');
                } else if (cat === 'insaat') {
                    showPage('page-insaat');
                } else if (cat === 'restorasyon') {
                    showPage('page-restorasyon');
                } else if (cat === 'satilik_kiralik') {
                    showPage('page-satilik_kiralik');
                } else {
                    const page = link.getAttribute("data-page");
                    showPage(page || 'projects');
                    if(page === 'projects') {
                        loadCategory(cat || 'default');
                    }
                }
                
                cta.classList.remove("open");
            });
        });
    } else {
         console.error("CTA Grubu 'discover-cta' bulunamadı!");
    }
    
    document.querySelectorAll('.nav-link[data-page]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = link.getAttribute('data-page');
            showPage(pageId);
            
            const projectForm = document.getElementById('project-reservation-form');
            if (projectForm) projectForm.style.display = 'none';
            
            if (pageId === 'projects') {
                loadCategory('default');
            }
        });
    });
    
    document.body.addEventListener('click', (e) => {
        if (e.target && e.target.classList.contains('btn-page-back')) {
            e.preventDefault();
            showPage('hero'); 
        }
    });

    /* === DEĞİŞİKLİK BURADA (Throttle süresi 30ms'ye düşürüldü) === */
    window.addEventListener('scroll', throttle(handleScrollEffects, 30));
});

window.addEventListener("load", () => {
});

let currentImages = [];
let currentIndex = 0;

document.addEventListener("click", function(e) {
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightbox-img");
  
  if (!lightbox || !lightboxImg) return; 

  const clickedImg = e.target.closest(".detail-gallery img, .house-gallery img");
  
  if (clickedImg && !e.target.closest('.house-card')) { 
  }
  
  const clickedDetailImg = e.target.closest(".detail-gallery img");
  if (clickedDetailImg) {
    const gallery = clickedDetailImg.closest(".detail-gallery");
    currentImages = Array.from(gallery.querySelectorAll("img"));
    currentIndex = currentImages.indexOf(clickedDetailImg);
    
    lightboxImg.src = clickedDetailImg.src;
    lightbox.style.display = "flex";

    updateLightboxNav(); // <-- BURAYA EKLENDİ
  }

  if (e.target.id === "lightbox") {
    lightbox.style.display = "none";
  }
});

// YENİ FONKSİYON: Butonları gizle/göster
function updateLightboxNav() {
  const prevBtn = document.getElementById('lightbox-prev');
  const nextBtn = document.getElementById('lightbox-next');
  if (!prevBtn || !nextBtn) return;

  // Baştaysak 'Geri' butonunu gizle
  prevBtn.style.display = (currentIndex === 0) ? 'none' : 'block';
  
  // Sondaysak 'İleri' butonunu gizle
  nextBtn.style.display = (currentIndex === currentImages.length - 1) ? 'none' : 'block';
}

function showNextImage() {
  if (!currentImages.length) return;
  
  // Eğer zaten sonda değilsek ilerle
  if (currentIndex < currentImages.length - 1) { 
    currentIndex++;
  }
  
  const lightboxImg = document.getElementById("lightbox-img");
  if (lightboxImg) {
    lightboxImg.src = currentImages[currentIndex].src;
    lightboxImg.style.transition = "transform 0s";
    lightboxImg.style.transform = "scale(1)";
    scale = 1;
  }
  updateLightboxNav(); // Butonların durumunu güncelle
}

function showPrevImage() {
  if (!currentImages.length) return;

  // Eğer zaten başta değilsek gerile
  if (currentIndex > 0) {
    currentIndex--;
  } 
  
  const lightboxImg = document.getElementById("lightbox-img");
  if (lightboxImg) {
    lightboxImg.src = currentImages[currentIndex].src;
    lightboxImg.style.transition = "transform 0s";
    lightboxImg.style.transform = "scale(1)";
    scale = 1;
  }
  updateLightboxNav(); // Butonların durumunu güncelle
}

document.addEventListener("keydown", function (e) {
  const lightbox = document.getElementById("lightbox");
  if (lightbox && lightbox.style.display === "flex") {
    if (e.key === "ArrowRight") {
      showNextImage();
    } else if (e.key === "ArrowLeft") {
      showPrevImage();
    } else if (e.key === "Escape") {
      lightbox.style.display = "none";
    }
  }
});

let touchStartX = 0;
let touchEndX = 0;
const swipeThreshold = 50;
const lightbox = document.getElementById("lightbox");

if (lightbox) {
    lightbox.addEventListener("touchstart", function(e) {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchEndX = 0;
      }
    }, { passive: true });

    lightbox.addEventListener("touchmove", function(e) {
      if (e.touches.length === 1) {
        touchEndX = e.touches[0].clientX;
      }
    }, { passive: true });

    lightbox.addEventListener("touchend", function(e) {
      const lightboxImg = document.getElementById("lightbox-img");
      if (!lightboxImg) return;
      const currentScale = lightboxImg.style.transform ? parseFloat(lightboxImg.style.transform.replace("scale(", "")) : 1;
      
      if (currentScale > 1 || e.touches.length > 0) return;
      if (touchStartX === 0 || touchEndX === 0) return; 
      
      const diff = touchStartX - touchEndX;
      if (Math.abs(diff) > swipeThreshold) { 
        if (diff > 0) { 
          showNextImage();
        } else { 
          showPrevImage();
        }
      }
      touchStartX = 0;
      touchEndX = 0;
    });
}

let scale = 1;
let startDistance = 0;
const lightboxImg = document.getElementById("lightbox-img");

if (lightboxImg) {
    lightboxImg.addEventListener("touchstart", function (e) {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dx = e.touches[0].pageX - e.touches[1].pageX;
        const dy = e.touches[0].pageY - e.touches[1].pageY;
        startDistance = Math.hypot(dx, dy);
      }
    }, { passive: false });

    lightboxImg.addEventListener("touchmove", function (e) {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dx = e.touches[0].pageX - e.touches[1].pageX;
        const dy = e.touches[0].pageY - e.touches[1].pageY;
        const newDistance = Math.hypot(dx, dy);
        let pinchScale = newDistance / startDistance;
        scale = Math.min(Math.max(1, pinchScale), 3);
        lightboxImg.style.transform = `scale(${scale})`;
      }
    }, { passive: false });

    lightboxImg.addEventListener("touchend", function () {
      if (scale !== 1) {
        lightboxImg.style.transition = "transform 0.3s ease";
        lightboxImg.style.transform = "scale(1)";
        scale = 1;
        setTimeout(() => lightboxImg.style.transition = "", 300);
      }
    });
}

document.body.addEventListener('click', (e) => {
    const modalOverlay = document.getElementById('restorationImageModal');
    if (!modalOverlay) return;

    if (e.target.closest('.image-modal-close-btn')) {
        closeImageModal();
    }
    if (e.target === modalOverlay) {
        closeImageModal();
    }

    const card = e.target.closest('.restoration-card');
    if (card && (e.target.closest('.img-wrapper') || e.target.closest('.img-comparison-container'))) {
        const modalBeforeImage = document.getElementById('modalBeforeImage');
        const modalAfterImage = document.getElementById('modalAfterImage');
        
        const beforeImg = card.querySelector('.img-wrapper:first-child img');
        const afterImg = card.querySelector('.img-wrapper:last-child img');

        if (beforeImg && afterImg && modalBeforeImage && modalAfterImage) {
            modalBeforeImage.src = beforeImg.src;
            modalAfterImage.src = afterImg.src;
            modalOverlay.classList.add('show');
        }
    }
});

function closeImageModal() {
    const modalOverlay = document.getElementById('restorationImageModal');
    const modalBeforeImage = document.getElementById('modalBeforeImage');
    const modalAfterImage = document.getElementById('modalAfterImage');
    
    if (modalOverlay) modalOverlay.classList.remove('show');
    if (modalBeforeImage) modalBeforeImage.src = '';
    if (modalAfterImage) modalAfterImage.src = '';
}

document.addEventListener('keydown', (event) => {
    const modalOverlay = document.getElementById('restorationImageModal');
    if (event.key === 'Escape' && modalOverlay && modalOverlay.classList.contains('show')) {
        closeImageModal();
    }
});