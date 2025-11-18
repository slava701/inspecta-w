// Toast notification system
function showToast(message, duration = 2000) {
    // Use shadow root if available, else fallback to document.body
    const root = window.shadow || document.body;
    // Remove any existing toast
    const existing = root.querySelector('#inspecta-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'inspecta-toast';
    toast.className = 'inspecta-toast';
    toast.textContent = message;
    root.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Export for use in other scripts
window.showToast = showToast; 