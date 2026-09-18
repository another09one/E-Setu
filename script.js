/* =========================================================
   E-SETU JAVASCRIPT
   ========================================================= */


/* ================= PAGE NAVIGATION ================= */

function showPage(pageId) {

    const pages = document.querySelectorAll(".page");

    pages.forEach(page => {
        page.classList.remove("active");
    });

    const selectedPage = document.getElementById(pageId);

    if (selectedPage) {
        selectedPage.classList.add("active");
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* ================= COLLECTION STEPS ================= */

let currentStep = 1;

function nextStep(step) {

    currentStep = step;

    document.querySelectorAll(".collection-step")
        .forEach(element => {
            element.classList.remove("active");
        });

    const next = document.getElementById("step" + step);

    if (next) {
        next.classList.add("active");
    }

    const counter = document.getElementById("stepCounter");

    if (counter) {
        counter.textContent = "Step " + step + " of 5";
    }

    if (step === 4) {
        updateTimestamp();
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* ================= VOICE SIMULATION ================= */

function simulateVoice() {

    const result = document.getElementById("voiceResult");

    result.textContent = "🎤 Listening...";

    setTimeout(() => {

        result.textContent =
            '✓ Voice captured: "2 laptops aur 3 mobiles hain"';

    }, 1500);

}


/* ================= IMAGE SELECTION ================= */

const wasteImage = document.getElementById("wasteImage");

if (wasteImage) {

    wasteImage.addEventListener("change", function () {

        if (this.files.length > 0) {

            const result =
                document.getElementById("voiceResult");

            result.textContent =
                "✓ Image selected: " + this.files[0].name;

        }

    });

}


/* ================= RECYCLER SELECTION ================= */

let selectedRecycler =
    "GreenCycle Recycling";


function selectRecycler(element, name) {

    document.querySelectorAll(".recycler-option")
        .forEach(option => {
            option.classList.remove("selected");
        });

    element.classList.add("selected");

    selectedRecycler = name;

    const selected =
        document.getElementById("selectedRecycler");

    if (selected) {
        selected.textContent = name;
    }

}


/* ================= TIMESTAMP ================= */

function updateTimestamp() {

    const timestamp =
        document.getElementById("timestamp");

    if (!timestamp) return;

    const now = new Date();

    timestamp.textContent =
        now.toLocaleString("en-IN");

}


/* ================= RECEIPT ================= */

function showReceipt() {

    const modal =
        document.getElementById("receiptModal");

    modal.classList.add("show");

}


function closeReceipt() {

    const modal =
        document.getElementById("receiptModal");

    modal.classList.remove("show");

}


/* Close modal when clicking outside */

document.addEventListener("click", function(event) {

    const modal =
        document.getElementById("receiptModal");

    if (event.target === modal) {
        closeReceipt();
    }

});


/* ================= RESET COLLECTION ================= */

function resetCollection() {

    currentStep = 1;

    document.querySelectorAll(".collection-step")
        .forEach(step => {
            step.classList.remove("active");
        });

    document.getElementById("step1")
        .classList.add("active");

    document.getElementById("stepCounter")
        .textContent = "Step 1 of 5";

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


/* ================= OFFLINE MODE ================= */

function simulateOffline() {

    const message =
        document.getElementById("offlineMessage");

    message.innerHTML = `
        🔴 Offline Mode Active<br><br>
        ✓ Collection saved locally<br>
        ✓ Weight recorded<br>
        ✓ GPS data stored<br><br>
        <strong>3 transactions waiting to sync.</strong>
    `;

}


/* ================= RECYCLER ACCEPT ================= */

function acceptLot(button) {

    button.textContent = "Accepted ✓";

    button.style.background = "#dcfce7";
    button.style.color = "#15803d";

    button.disabled = true;

}


/* ================= INITIALIZATION ================= */

document.addEventListener("DOMContentLoaded", function() {

    console.log("E-Setu loaded successfully.");

});