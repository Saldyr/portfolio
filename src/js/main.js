const track = document.querySelector(".carousel-track");
let images = Array.from(track.querySelectorAll(".carousel-img"));
const prevBtn = document.querySelector(".carousel-btn.prev");
const nextBtn = document.querySelector(".carousel-btn.next");

function getImagesToShow() {
    if (window.innerWidth <= 480) return 1;
    if (window.innerWidth <= 768) return 3;
    return 4;
}

let imagesToShow = getImagesToShow();
let currentIndex = imagesToShow;

function setupCarousel() {
    imagesToShow = getImagesToShow();
    track.querySelectorAll(".clone").forEach((clone) => clone.remove());
    images = Array.from(track.querySelectorAll(".carousel-img:not(.clone)"));
    for (let i = images.length - imagesToShow; i < images.length; i++) {
    const clone = images[i].cloneNode(true);
    clone.classList.add("clone");
    track.insertBefore(clone, images[0]);
    }
    for (let i = 0; i < imagesToShow; i++) {
    const clone = images[i].cloneNode(true);
    clone.classList.add("clone");
    track.appendChild(clone);
    }
    currentIndex = imagesToShow;
    moveToIndex(currentIndex, false);
}

function moveToIndex(idx, withTransition = true) {
    track.style.transition = withTransition
    ? "transform 0.5s cubic-bezier(.8, 0, .2, 1)"
    : "none";
    const img = track.querySelector(".carousel-img");
    if (!img) return;
    const imgWidth = img.offsetWidth;
    const gap = parseInt(getComputedStyle(track).gap) || 20;
    const offset = idx * (imgWidth + gap);
    track.style.transform = `translateX(-${offset}px)`;
}

function next() {
    currentIndex++;
    moveToIndex(currentIndex);
}
function prev() {
    currentIndex--;
    oveToIndex(currentIndex);
}

nextBtn.addEventListener("click", next);
prevBtn.addEventListener("click", prev);

track.addEventListener("transitionend", () => {
    if (currentIndex >= images.length + imagesToShow) {
    currentIndex = imagesToShow;
    moveToIndex(currentIndex, false);
    }
    if (currentIndex < imagesToShow) {
    currentIndex = images.length + imagesToShow - 1;
    moveToIndex(currentIndex, false);
    }
});


window.addEventListener("resize", () => {
    let newImagesToShow = getImagesToShow();
    if (newImagesToShow !== imagesToShow) {
        imagesToShow = newImagesToShow;
        setupCarousel();
        currentIndex = imagesToShow;
        moveToIndex(currentIndex, false);
    } else {
        moveToIndex(currentIndex, false);
    }
});

setupCarousel();
