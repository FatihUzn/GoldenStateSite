/* === GLOBAL DEĞİŞKENLER === */
const translations = {}; 
const pageCache = {}; 
let allGalleriesData = null; 
let globalPropertyImages = [];
let globalImageIndex = 0;
const IMAGES_PER_LOAD = 6; 

const restorationBeforePaths = Array.from({length: 13}, (_, i) => `assets/restorasyon-${i+1}-before.webp`);
const restorationAfterPaths = Array.from({length: 13}, (_, i) => `assets/restorasyon-${i+1}-after.webp`);
let globalRestorationBeforeIndex = 0;
let globalRestorationAfterIndex = 0;
const RESTORATION_IMAGES_PER_LOAD = 4;

/* === SAYFA YÜKLEME VE DİL YÖNETİMİ === */
document.addEventListener('DOMContentLoaded', async () => {
    // Dil ayarı
    let lang = localStorage.getItem('lang') || 'tr';
    const browserLang = navigator.language.split('-')[0];
    if (!localStorage.getItem('lang') && ['tr','en','zh','ar'].includes(browserLang)) {
        lang = browserLang;
    }
    await setLanguage(lang);

    // Mobil menü
    setupMobileMenu();
    
    // Hash kontrolü (Sayfa yönlendirme)
    window.addEventListener('hashchange', () => showPage(location.hash.replace('#', '') || 'hero'));
    showPage(location.hash.replace('#', '') || 'hero');

    // Navigasyon tıklamaları
    document.body.addEventListener('click', (e) => {
        // Geri butonu
        if (e.target.closest('.btn-page-back')) {
            e.preventDefault();
            const href = e.target.closest('.btn-page-back').getAttribute('href');
            location.hash = href || 'hero';
        }
        // Linkler
        if (e.target.closest('[data-page]')) {
            const link = e.target.closest('[data-page]');
            // Eğer dropdown veya nav içindeyse varsayılanı engelle
            if(!link.classList.contains('no-prevent')) { 
                e.preventDefault();
                location.hash = link.getAttribute('data-page');
                // Menüyü kapat (Mobilde)
                document.getElementById('navbar').classList.remove('open');
            }
        }
    });
});

async function setLanguage(lang) {
    if (!translations[lang]) {
        try {
            const res = await fetch(`${lang}.json`);
            translations[lang] = await res.json();
        } catch (e) {
            console.error(e);
            return;
        }
    }
    const data = translations[lang];
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    localStorage.setItem('lang', lang);

    document.querySelectorAll('[data-key]').forEach(el => {
        const key = el.getAttribute('data-key');
        if (data[key]) el.innerHTML = data[key];
    });

    // Dil butonlarını güncelle
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
    });
}

async function showPage(pageId) {
    // Sayfaları gizle
    document.querySelectorAll('.page-section').forEach(el => el.classList.remove('active'));
    
    let pageEl = document.getElementById(pageId);
    
    // Sayfa yoksa yükle
    if (!pageEl && pageId !== 'hero') {
        try {
            const res = await fetch(`${pageId.replace('page-', '')}.html`);
            if (!res.ok) throw new Error('Sayfa yok');
            const html = await res.text();
            document.querySelector('main').insertAdjacentHTML('beforeend', html);
            pageEl = document.getElementById(pageId);
        } catch (e) {
            console.error(e);
            location.hash = 'hero';
            return;
        }
    }

    if (pageEl) {
        pageEl.classList.add('active');
        window.scrollTo(0, 0);
        // Yeni yüklenen içerik için dili güncelle
        const lang = localStorage.getItem('lang') || 'tr';
        if(translations[lang]) {
            pageEl.querySelectorAll('[data-key]').forEach(el => {
                const key = el.getAttribute('data-key');
                if (translations[lang][key]) el.innerHTML = translations[lang][key];
            });
        }
        
        // Özel sayfa mantıkları
        if (pageId === 'page-pruva-otel') setupRestorationGalleries();
    } else {
        document.getElementById('hero').classList.add('active');
    }
}

function setupMobileMenu() {
    const toggle = document.getElementById('menu-toggle');
    const nav = document.getElementById('navbar');
    if(toggle && nav) {
        toggle.addEventListener('click', () => nav.classList.toggle('open'));
    }
}

/* === GALERİ & DETAY SİSTEMİ === */
async function openHouseDetail(id) {
    if (!allGalleriesData) {
        try {
            const res = await fetch('data/galleries.json?v=1.1');
            allGalleriesData = await res.json();
        } catch { return; }
    }

    const data = allGalleriesData[id];
    if (!data) return;

    const lang = localStorage.getItem('lang') || 'tr';
    const t = translations[lang] || {};

    const detailBox = document.getElementById('house-detail');
    const content = document.getElementById('house-detail-content');
    
    // İçeriği oluştur
    content.innerHTML = `
        <h2>${t[`prop_${id}_title`] || data.title}</h2>
        <div class="house-info">
            <p><strong>${t.js_konum}:</strong> ${t[`prop_${id}_location`] || data.location}</p>
            <p><strong>${t.js_alan}:</strong> ${t[`prop_${id}_area`] || data.area}</p>
            <p><strong>${t.js_fiyat}:</strong> ${t[`prop_${id}_price`] || data.price}</p>
            <p>${t[`prop_${id}_desc`] || data.desc}</p>
        </div>
        <div class="detail-gallery" id="detail-gallery-container"></div>
        <div id="gallery-loader" style="text-align:center; padding:20px;"></div>
    `;

    globalPropertyImages = data.images || [];
    globalImageIndex = 0;
    loadMoreImages();

    detailBox.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeHouseDetail() {
    document.getElementById('house-detail').style.display = 'none';
    document.body.style.overflow = 'auto';
}

function loadMoreImages() {
    const container = document.getElementById('detail-gallery-container');
    const loader = document.getElementById('gallery-loader');
    
    const slice = globalPropertyImages.slice(globalImageIndex, globalImageIndex + IMAGES_PER_LOAD);
    
    slice.forEach(src => {
        const img = document.createElement('img');
        img.src = src;
        img.loading = 'lazy';
        img.onclick = () => openLightbox(src);
        container.appendChild(img);
    });

    globalImageIndex += slice.length;

    if (globalImageIndex < globalPropertyImages.length) {
        loader.innerHTML = `<button class="btn" onclick="loadMoreImages()">Daha Fazla</button>`;
    } else {
        loader.innerHTML = '';
    }
}

/* === RESTORASYON GALERİSİ === */
function setupRestorationGalleries() {
    globalRestorationBeforeIndex = 0;
    globalRestorationAfterIndex = 0;
    document.getElementById('restoration-gallery-before').innerHTML = '';
    document.getElementById('restoration-gallery-after').innerHTML = '';
    loadRestorationImages('before');
    loadRestorationImages('after');
}

function loadRestorationImages(type) {
    const container = document.getElementById(`restoration-gallery-${type}`);
    const loader = document.getElementById(`restoration-loader-${type}`);
    const list = type === 'before' ? restorationBeforePaths : restorationAfterPaths;
    let index = type === 'before' ? globalRestorationBeforeIndex : globalRestorationAfterIndex;

    const slice = list.slice(index, index + RESTORATION_IMAGES_PER_LOAD);
    
    slice.forEach(src => {
        const img = document.createElement('img');
        img.src = src;
        img.loading = 'lazy';
        img.onclick = () => openLightbox(src);
        img.onerror = function() { this.style.display = 'none'; }; // Hata varsa gizle
        container.appendChild(img);
    });

    if (type === 'before') globalRestorationBeforeIndex += slice.length;
    else globalRestorationAfterIndex += slice.length;

    const newIndex = type === 'before' ? globalRestorationBeforeIndex : globalRestorationAfterIndex;

    if (newIndex < list.length) {
        loader.innerHTML = `<button class="btn" onclick="loadRestorationImages('${type}')">Daha Fazla</button>`;
    } else {
        loader.innerHTML = '';
    }
}

/* === LIGHTBOX === */
function openLightbox(src) {
    const lb = document.getElementById('lightbox');
    const img = document.getElementById('lightbox-img');
    img.src = src;
    lb.style.display = 'flex';
}
document.getElementById('lightbox').onclick = (e) => {
    if(e.target.id === 'lightbox') document.getElementById('lightbox').style.display = 'none';
};

/* === ANA SAYFA METİN DÖNGÜSÜ === */
const heroTexts = [
    { title: "Mimarlık", desc: "Sürdürülebilir ve estetik çözümler." },
    { title: "İnşaat", desc: "Güvenli ve modern yapılar." },
    { title: "Restorasyon", desc: "Tarihi geleceğe taşıyoruz." },
    { title: "Gayrimenkul", desc: "Doğru yatırımın adresi." }
];
let heroTextIndex = 0;
setInterval(() => {
    const el = document.getElementById('changing-text');
    if(!el) return;
    el.style.opacity = 0;
    setTimeout(() => {
        const item = heroTexts[heroTextIndex];
        // Dil kontrolü yapılabilir burada, şimdilik statik
        el.innerHTML = `<strong>${item.title}</strong><br><span style="font-size:0.7em">${item.desc}</span>`;
        el.style.opacity = 1;
        heroTextIndex = (heroTextIndex + 1) % heroTexts.length;
    }, 500);
}, 4000);
