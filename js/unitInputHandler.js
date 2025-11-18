export function setupUnitInput(inputElement, unitHintElement, generateCssCallback) {
    let lastValidValue = '';

    // Live update as you type
    inputElement.addEventListener('input', function (e) {
        const val = this.value.trim();

        // Handle typing 'auto'
        if (val.toLowerCase() === 'auto') {
            unitHintElement.textContent = '-';
            lastValidValue = 'auto';
            generateCssCallback('auto');
            return;
        }

        // Check for unit in the input value
        const unitMatch = val.match(/^([\d.]+)(px|em|rem|%|vw|vh)$/i);
        if (unitMatch) {
            const number = unitMatch[1];
            const unit = unitMatch[2].toLowerCase();
            if (this.value !== number) {
                this.value = number;
                this.setSelectionRange(this.value.length, this.value.length);
            }
            unitHintElement.textContent = unit;
            lastValidValue = number;
            generateCssCallback(number + unit);
            return;
        }

        // Prevent negative values
        if (!isNaN(parseFloat(val)) && parseFloat(val) < 0) {
            this.value = '0';
            return;
        }

        // If number and unit is auto, switch to px
        if (!isNaN(parseFloat(val)) && unitHintElement.textContent === '-') {
            unitHintElement.textContent = 'px';
        }

        if (!isNaN(parseFloat(val))) {
            lastValidValue = parseFloat(val);
            generateCssCallback(val + unitHintElement.textContent);
        }
    });

    // Restore last valid value on blur if input is invalid
    inputElement.addEventListener('blur', function () {
        const val = this.value.trim();

        // Handle auto value
        if (val.toLowerCase() === 'auto') {
            this.value = 'auto';
            unitHintElement.textContent = '-';
            lastValidValue = 'auto';
            generateCssCallback('auto');
            return;
        }

        // Handle value with unit (e.g., 10em, 50vw)
        const match = val.match(/^([\d.]+)(px|em|rem|%|vw|vh)$/i);
        if (match) {
            this.value = match[1];
            unitHintElement.textContent = match[2];
            lastValidValue = match[1];
            generateCssCallback(match[1] + match[2]);
            return;
        }

        // Handle numeric values
        if (!isNaN(parseFloat(val))) {
            if (lastValidValue === 'auto' || unitHintElement.textContent === '-') {
                unitHintElement.textContent = 'px';
            }
            this.value = parseFloat(val);
            lastValidValue = this.value;
            generateCssCallback(this.value + unitHintElement.textContent);
            return;
        }

        // If input is invalid, restore last valid value
        this.value = lastValidValue;
        if (lastValidValue === 'auto') {
            unitHintElement.textContent = '-';
            generateCssCallback('auto');
        } else {
            if (unitHintElement.textContent === '-' || !unitHintElement.textContent) unitHintElement.textContent = 'px';
            generateCssCallback(lastValidValue + unitHintElement.textContent);
        }
    });
}

// Generic unit hint creator
export function createUnitHint(id = '', defaultUnit = 'px') {
    const unitHint = document.createElement('span');
    if (id) unitHint.id = id;
    unitHint.className = 'unit-hint';
    unitHint.textContent = defaultUnit;
    return unitHint;
} 