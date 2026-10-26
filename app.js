const ribbon = document.getElementById("ribbonStrip");
const columns = document.querySelectorAll(".column");
const btnPrev = document.getElementById("btnPrev");
const btnNext = document.getElementById("btnNext");
const indicator = document.getElementById("colIndicator");

let currentIndex = 0;
const totalColumns = columns.length;
const columnWidth = 280;
const columnGap = 16;
const baseOffset = 20;

function updateRibbon() {
    columns.forEach((col, idx) => {
        if (idx === currentIndex) {
            col.classList.add("active");
            col.querySelector(".col-head").textContent = `Column ${idx + 1} (Active)`;
        } else {
            col.classList.remove("active");
            col.querySelector(".col-head").textContent = `Column ${idx + 1}`;
        }
    });

    const shiftX = -(currentIndex * (columnWidth + columnGap));
    ribbon.style.transform = `translateX(${shiftX}px)`;
    indicator.textContent = `Column ${currentIndex + 1} of ${totalColumns}`;
}

btnPrev.addEventListener("click", () => {
    if (currentIndex > 0) {
        currentIndex--;
        updateRibbon();
    }
});

btnNext.addEventListener("click", () => {
    if (currentIndex < totalColumns - 1) {
        currentIndex++;
        updateRibbon();
    }
});

columns.forEach((col) => {
    col.addEventListener("click", () => {
        currentIndex = parseInt(col.dataset.index, 10);
        updateRibbon();
    });
});

updateRibbon();
