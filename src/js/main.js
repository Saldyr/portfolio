// =======================
// Carousel (projets - accueil)
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

  // (Optionnel) Navigation clavier
    carouselTrack.setAttribute("tabindex", "0");
    carouselTrack.addEventListener("keydown", function(e){
    if (e.key === "ArrowLeft") prevBtn.click();
    if (e.key === "ArrowRight") nextBtn.click();
    });
}

// =======================
// Menu Burger (toutes pages)
// =======================
const burger = document.querySelector('.burger');
const nav = document.querySelector('.main-nav');

if (burger && nav) {
    burger.addEventListener('click', () => {
    nav.classList.toggle('open');
    burger.classList.toggle('active');
    // Accessibilité : aria-expanded
    const expanded = burger.getAttribute("aria-expanded") === "true";
    burger.setAttribute("aria-expanded", !expanded);
    });
  // (Accessibilité) Fermer le menu avec la touche Echap
    document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('open')) {
        nav.classList.remove('open');
        burger.classList.remove('active');
        burger.setAttribute("aria-expanded", "false");
    }
    });
}

// =======================
// Validation du formulaire de contact (page Contact)
// =======================
const form = document.getElementById("contact-form");
const formMessage = document.getElementById("form-message");

if (form && formMessage) {
    form.addEventListener("submit", function (event) {
    event.preventDefault();
    formMessage.textContent = ""; // Réinitialiser le message
    let valid = true;

    // Récupération des champs
    const name = form.elements["name"].value.trim();
    const email = form.elements["email"].value.trim();
    const message = form.elements["message"].value.trim();

    // Validation du nom
    if (name === "") {
        valid = false;
        formMessage.textContent = "Veuillez entrer votre nom.";
        form.elements["name"].focus();
        return;
    }

    // Validation de l'email (présence du @)
    if (email === "" || !email.includes("@")) {
        valid = false;
        formMessage.textContent = "Veuillez entrer une adresse email valide (contenant un @).";
        form.elements["email"].focus();
        return;
    }

    // Validation du message
    if (message === "") {
        valid = false;
        formMessage.textContent = "Veuillez écrire un message.";
        form.elements["message"].focus();
        return;
    }

    // Si tout est bon
    if (valid) {
        formMessage.textContent = "Votre message a bien été envoyé (simulation) !";
        form.reset();
    }
    });
}
