// =======================
// Carousel (projects - home)
// =======================
const carouselTrack = document.querySelector('.carousel-track');
const slides = Array.from(document.querySelectorAll('.carousel-img'));
const prevBtn = document.querySelector('.carousel-btn.prev');
const nextBtn = document.querySelector('.carousel-btn.next');

let slidesToShow = 4;
let slideWidth = 300;
let currentIndex = 0;

function updateSlidesToShow() {
    const w = window.innerWidth;
    if (w <= 500) slidesToShow = 1;
    else if (w <= 650) slidesToShow = 2;
    else if (w <= 900) slidesToShow = 3;
    else slidesToShow = 4;
    }
    function updateSlideWidth() {
    const w = window.innerWidth;
    if (w <= 500) {
        slideWidth = document.querySelector('.carousel-viewport').offsetWidth;
    } else {
        slideWidth = slides[0].getBoundingClientRect().width + 20;
    }
}
    function updateCarousel() {
    carouselTrack.style.transform = `translateX(-${currentIndex * slideWidth}px)`;
    }
    function goToPrev() {
    if (currentIndex === 0) {
        currentIndex = Math.max(0, slides.length - slidesToShow);
    } else {
        currentIndex--;
    }
    updateCarousel();
    }
    function goToNext() {
    if (currentIndex >= slides.length - slidesToShow) {
        currentIndex = 0;
    } else {
        currentIndex++;
    }
    updateCarousel();
    }

    if (carouselTrack && slides.length > 0 && prevBtn && nextBtn) {
    prevBtn.addEventListener('click', goToPrev);
    nextBtn.addEventListener('click', goToNext);

    // Clavier
    carouselTrack.setAttribute("tabindex", "0");
    carouselTrack.addEventListener("keydown", function(e){
        if (e.key === "ArrowLeft") goToPrev();
        if (e.key === "ArrowRight") goToNext();
    });

    // Swipe mobile/tactile
    let startX = null;
    carouselTrack.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
    });
    carouselTrack.addEventListener('touchend', (e) => {
        if (startX === null) return;
        const dx = e.changedTouches[0].clientX - startX;
        if (dx > 30) goToPrev();
        if (dx < -30) goToNext();
        startX = null;
    });

    // Responsive : recalcule tout si on redimensionne
    function onResize() {
        updateSlidesToShow();
        updateSlideWidth();
        // Bloque l’index si on est hors plage (ex : resize d’un grand écran à mobile)
        if (currentIndex > slides.length - slidesToShow) {
        currentIndex = Math.max(0, slides.length - slidesToShow);
        }
        updateCarousel();
    }
    window.addEventListener('resize', onResize);
    onResize();
}


/**************************
*   BURGER MENU
**************************/
const burger = document.querySelector('.burger');
const nav = document.querySelector('.main-nav');

if (burger && nav) {
    burger.addEventListener('click', () => {
        nav.classList.toggle('open');
        burger.classList.toggle('active');
        const expanded = burger.getAttribute("aria-expanded") === "true";
        burger.setAttribute("aria-expanded", !expanded);
        if (!expanded) {
            const firstLink = nav.querySelector('a');
            if (firstLink) firstLink.focus();
        }
    });
    burger.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            burger.click();
        }
    });
    // Fermer avec Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && nav.classList.contains('open')) {
            nav.classList.remove('open');
            burger.classList.remove('active');
            burger.setAttribute("aria-expanded", "false");
            burger.focus();
        }
    });
}

/**************************
*  CONTACT FORM + POPUP
**************************/
const form = document.getElementById("contact-form");
const formMessage = document.getElementById("form-message");
const popup = document.getElementById('popup-confirm');
const popupClose = document.getElementById('popup-close');

if (form && formMessage && popup && popupClose) {
    form.addEventListener("submit", function (event) {
    event.preventDefault();
    formMessage.textContent = "";
    let valid = true;


    const name = form.elements["name"].value.trim();
    const email = form.elements["email"].value.trim();
    const message = form.elements["message"].value.trim();


    if (name === "") {
        valid = false;
        formMessage.textContent = "Veuillez entrer votre nom.";
        form.elements["name"].focus();
        return;
    }

    if (email === "" || !email.includes("@")) {
        valid = false;
        formMessage.textContent = "Veuillez entrer une adresse email valide (contenant un @).";
        form.elements["email"].focus();
        return;
    }
    if (message === "") {
        valid = false;
        formMessage.textContent = "Veuillez écrire un message.";
        form.elements["message"].focus();
        return;
    }

    if (valid) {
        form.reset();
        popup.removeAttribute('hidden');
        popup.focus();
    }
    });

    popupClose.addEventListener('click', () => {
    popup.setAttribute('hidden', '');
    form.querySelector('.btn').focus();
    });

    document.addEventListener('keydown', (e) => {
    if (!popup.hasAttribute('hidden') && (e.key === "Escape" || e.key === "Esc")) {
        popup.setAttribute('hidden', '');
        form.querySelector('.btn').focus();
    }
    });
}

/**************************
*  API OpenWeatherMap
**************************/
(function() {
    const meteoBox = document.getElementById('meteo-digoin');
        if (!meteoBox) return;

    fetch('https://api.openweathermap.org/data/2.5/weather?q=Digoin,fr&units=metric&appid=23c2d39ed110af9ef38dcf7d545ca781&lang=fr')
    .then(response => response.json())
    .then(data => {
        if (data && data.main && data.weather) {
        const temp = Math.round(data.main.temp);
        const desc = data.weather[0].description.replace(/^./, s => s.toUpperCase());
        meteoBox.innerHTML = `🌤️ Météo à Digoin : <strong>${temp}°C</strong>, ${desc}`;
        } else {
        meteoBox.textContent = "Météo indisponible.";
        }
    })
    .catch(() => {
        meteoBox.textContent = "Erreur lors de la récupération de la météo.";
    });
})();