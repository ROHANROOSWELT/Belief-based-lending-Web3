document.addEventListener('DOMContentLoaded', () => {
    initThemeToggle();
    initTimeSlider();
});

/* Theme Toggle Logic */
function initThemeToggle() {
    const themeBtn = document.getElementById('theme-btn');
    const htmlElement = document.documentElement;

    // Check for saved theme preference or system preference
    const savedTheme = localStorage.getItem('bbl-theme');
    if (savedTheme) {
        htmlElement.setAttribute('data-theme', savedTheme);
    }

    themeBtn.addEventListener('click', () => {
        const currentTheme = htmlElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        htmlElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('bbl-theme', newTheme);
    });
}

/* Time Slider Logic */
function initTimeSlider() {
    const slider = document.getElementById('time-slider');
    const daysDisplay = document.getElementById('slider-days');
    const apyDisplay = document.getElementById('projected-apy');
    // Using a simpler selector or ID if I added one, but "cost" was just in a span. 
    // Let's inspect the HTML structure mentally:
    // <div class="projection-row"> ... <span>Cost</span> <span class="dynamic-value">$12.50 / day</span> ... </div>
    // I need to target that specific cost element. I'll use a more specific selector.
    const costDisplay = document.querySelector('.projection-box .projection-row:nth-child(2) .dynamic-value');

    const baseAPY = 4.5;
    const baseCost = 5.00;

    function updateValues() {
        const days = parseInt(slider.value);

        // Update Days Display
        daysDisplay.textContent = `+${days} Days`;

        // Calculate new APY: longer time = higher risk premium = higher APY
        // Simple formula: Base + (Days * 0.05)
        const newAPY = (baseAPY + (days * 0.05)).toFixed(1);
        apyDisplay.textContent = `${newAPY}%`;

        // Calculate Cost: cost increases slightly with time extension
        // Formula: Base + (Days * 0.15)
        const newCost = (baseCost + (days * 0.15)).toFixed(2);
        costDisplay.textContent = `$${newCost} / day`;

        // Visual feedback on the slider track (optional, for webkit)
        // const percent = (days - slider.min) / (slider.max - slider.min) * 100;
        // slider.style.background = `linear-gradient(to right, var(--accent-primary) 0%, var(--accent-primary) ${percent}%, var(--bg-tertiary) ${percent}%, var(--bg-tertiary) 100%)`;
    }

    slider.addEventListener('input', updateValues);

    // Initialize
    updateValues();
}
