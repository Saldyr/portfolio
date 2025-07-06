// =======================
// Carousel (projects - home)
// =======================
const carouselTrack = document.querySelector('.carousel-track');
const slides = document.querySelectorAll('.carousel-img');
const prevBtn = document.querySelector('.carousel-btn.prev');
const nextBtn = document.querySelector('.carousel-btn.next');

if (carouselTrack && slides.length > 0 && prevBtn && nextBtn) {
    let currentIndex = 0;
    const totalSlides = slides.length;

    function updateCarousel() {
    carouselTrack.style.transform = `translateX(-${currentIndex * 100}%)`;
    }

    prevBtn.addEventListener('click', () => {
    currentIndex = (currentIndex === 0) ? totalSlides - 1 : currentIndex - 1;
    updateCarousel();
    });

    nextBtn.addEventListener('click', () => {
    currentIndex = (currentIndex === totalSlides - 1) ? 0 : currentIndex + 1;
    updateCarousel();
    });


    carouselTrack.setAttribute("tabindex", "0");
    carouselTrack.addEventListener("keydown", function(e){
    if (e.key === "ArrowLeft") prevBtn.click();
    if (e.key === "ArrowRight") nextBtn.click();
    });
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
        // Focus sur le 1er lien du menu si on ouvre
        if (!expanded) {
            const firstLink = nav.querySelector('a');
            if (firstLink) firstLink.focus();
        }
    });
    // Clavier (Entrée/Espace)
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