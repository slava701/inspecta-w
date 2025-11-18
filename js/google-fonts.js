// Google Fonts Integration Module
class GoogleFontsManager {
    constructor() {
        this.fonts = [];
        this.loadedFonts = new Set();
        this.fontCache = new Map();
        this.apiKey = 'AIzaSyBm8xC7vrZDB1in3miijcolVpqGp-fb6uI'; // Your Google Fonts API key
        this.baseUrl = 'https://www.googleapis.com/webfonts/v1/webfonts';
        this.init();
    }

    async init() {
        await this.loadFontList();
        this.setupFontObserver();
    }

    async loadFontList() {
        // If no API key is provided, use fallback fonts
        if (!this.apiKey) {
            console.warn('No Google Fonts API key provided. Using fallback fonts.');
            this.fonts = this.getFallbackFonts();
            return;
        }

        try {
            // Request fonts from service worker
            const response = await chrome.runtime.sendMessage({ type: 'loadGoogleFonts' });

            if (response.success) {
                this.fonts = response.fonts;

                // Cache popular fonts for faster access
                this.fonts.slice(0, 50).forEach(font => {
                    this.fontCache.set(font.family, font);
                });
            } else {
                throw new Error(response.error || 'Failed to load fonts from service worker');
            }
        } catch (error) {
            console.error('Failed to load Google Fonts:', error);
            // Fallback to common fonts
            this.fonts = this.getFallbackFonts();
        }
    }

    getFallbackFonts() {
        return [
            { family: 'Inter', variants: ['100', '200', '300', '400', '500', '600', '700', '800', '900'] },
            { family: 'Roboto', variants: ['100', '300', '400', '500', '700', '900'] },
            { family: 'Open Sans', variants: ['300', '400', '600', '700', '800'] },
            { family: 'Lato', variants: ['100', '300', '400', '700', '900'] },
            { family: 'Poppins', variants: ['100', '200', '300', '400', '500', '600', '700', '800', '900'] },
            { family: 'Montserrat', variants: ['100', '200', '300', '400', '500', '600', '700', '800', '900'] },
            { family: 'Source Sans Pro', variants: ['200', '300', '400', '600', '700', '900'] },
            { family: 'Ubuntu', variants: ['300', '400', '500', '700'] },
            { family: 'Nunito', variants: ['200', '300', '400', '600', '700', '800', '900'] },
            { family: 'Work Sans', variants: ['100', '200', '300', '400', '500', '600', '700', '800', '900'] },
            { family: 'Playfair Display', variants: ['400', '500', '600', '700', '800', '900'] },
            { family: 'Merriweather', variants: ['300', '400', '700', '900'] },
            { family: 'PT Sans', variants: ['400', '700'] },
            { family: 'Noto Sans', variants: ['100', '300', '400', '500', '700', '900'] },
            { family: 'Raleway', variants: ['100', '200', '300', '400', '500', '600', '700', '800', '900'] },
            { family: 'Oswald', variants: ['200', '300', '400', '500', '600', '700'] },
            { family: 'Dancing Script', variants: ['400', '500', '600', '700'] },
            { family: 'Pacifico', variants: ['400'] },
            { family: 'Indie Flower', variants: ['400'] },
            { family: 'Bebas Neue', variants: ['400'] },
            { family: 'Plus Jakarta Sans', variants: ['200', '300', '400', '500', '600', '700', '800'] },
            { family: 'DM Sans', variants: ['100', '200', '300', '400', '500', '600', '700', '800', '900'] },
            { family: 'Outfit', variants: ['100', '200', '300', '400', '500', '600', '700', '800', '900'] },
            { family: 'Albert Sans', variants: ['100', '200', '300', '400', '500', '600', '700', '800', '900'] },
            { family: 'Onest', variants: ['100', '200', '300', '400', '500', '600', '700', '800', '900'] },
            { family: 'Sora', variants: ['100', '200', '300', '400', '500', '600', '700', '800'] },
            { family: 'Lexend', variants: ['100', '200', '300', '400', '500', '600', '700', '800'] },
            { family: 'Manrope', variants: ['200', '300', '400', '500', '600', '700', '800'] },
            { family: 'Figtree', variants: ['300', '400', '500', '600', '700', '800', '900'] },
            { family: 'Instrument Sans', variants: ['400', '500', '600', '700'] },
            { family: 'Geist Sans', variants: ['100', '200', '300', '400', '500', '600', '700', '800', '900'] },
            { family: 'Geist Mono', variants: ['100', '200', '300', '400', '500', '600', '700', '800', '900'] }
        ];
    }

    async loadFont(fontFamily, variants = ['400']) {
        // Clean the font family name and remove fallback fonts
        let cleanFontFamily = fontFamily.replace(/^["']|["']$/g, '').trim();

        // Remove fallback fonts like ", sans-serif", ", serif", etc.
        cleanFontFamily = cleanFontFamily.replace(/,\s*(sans-serif|serif|monospace|cursive|fantasy)$/i, '');

        // Check if font is already loaded
        if (this.loadedFonts.has(cleanFontFamily)) {
            return true;
        }

        try {
            // First check if font is in our known lists
            let font = this.fonts.find(f => f.family === cleanFontFamily) ||
                this.getFallbackFonts().find(f => f.family === cleanFontFamily);

            // If not found in lists, try to load it anyway (it might be a valid Google Font)
            if (!font) {
                // Create a temporary font object with default variants
                font = { family: cleanFontFamily, variants: variants };
            }

            // Try to load the font with different weights if the first one fails
            const weightsToTry = ['400', '300', '500', '700', '100', '200', '600', '800', '900'];
            let loadedSuccessfully = false;

            for (const weight of weightsToTry) {
                try {
                    // Create Google Fonts URL with specific weight
                    const fontUrl = this.createGoogleFontsUrl(cleanFontFamily, font.variants, weight);

                    // Check if stylesheet already exists (using a safer method)
                    const existingLink = this.findExistingFontLink(cleanFontFamily);
                    if (existingLink) {
                        await this.waitForFontLoad(cleanFontFamily);
                        this.loadedFonts.add(cleanFontFamily);
                        return true;
                    }

                    // Try to load the font
                    const success = await this.loadFontStylesheet(cleanFontFamily, fontUrl);
                    if (success) {
                        // Wait for the font to be available
                        await this.waitForFontLoad(cleanFontFamily);
                        loadedSuccessfully = true;
                        break;
                    }
                } catch (error) {
                    console.warn(`Failed to load "${cleanFontFamily}" with weight ${weight}:`, error);
                    continue;
                }
            }

            if (loadedSuccessfully) {
                return true;
            } else {
                return false;
            }
        } catch (error) {
            console.error(`Failed to load font ${cleanFontFamily}:`, error);
            return false;
        }
    }

    createGoogleFontsUrl(fontFamily, variants, weight = null) {
        const baseUrl = 'https://fonts.googleapis.com/css2';
        // Remove any surrounding quotes and clean the font family name
        const cleanFontFamily = fontFamily.replace(/^["']|["']$/g, '').trim();
        const familyParam = cleanFontFamily.replace(/\s+/g, '+');

        // Use provided weight or fallback to first variant or '400'
        const selectedWeight = weight || variants[0] || '400';

        return `${baseUrl}?family=${familyParam}:${selectedWeight}&display=swap`;
    }

    findExistingFontLink(fontFamily) {
        // Find existing font link by checking all link elements
        const links = document.querySelectorAll('link[rel="stylesheet"]');
        // Remove any surrounding quotes and clean the font family name
        let cleanFontFamily = fontFamily.replace(/^["']|["']$/g, '').trim();

        // Remove fallback fonts like ", sans-serif", ", serif", etc.
        cleanFontFamily = cleanFontFamily.replace(/,\s*(sans-serif|serif|monospace|cursive|fantasy)$/i, '');

        const familyParam = cleanFontFamily.replace(/\s+/g, '+');

        for (const link of links) {
            if (link.href && link.href.includes('fonts.googleapis.com') && link.href.includes(familyParam)) {
                return link;
            }
        }
        return null;
    }

    async loadFontStylesheet(fontFamily, fontUrl) {
        return new Promise((resolve) => {
            const link = document.createElement('link');
            link.href = fontUrl;
            link.rel = 'stylesheet';

            link.onload = () => {
                this.loadedFonts.add(fontFamily);
                resolve(true);
            };

            link.onerror = () => {
                resolve(false);
            };

            document.head.appendChild(link);
        });
    }

    waitForFontLoad(fontFamily) {
        return new Promise((resolve) => {
            if (document.fonts && document.fonts.load) {
                document.fonts.load(`16px "${fontFamily}"`).then(() => {
                    resolve();
                }).catch((error) => {
                    resolve(); // Resolve anyway to prevent blocking
                });
            } else {
                // Fallback for older browsers
                setTimeout(() => {
                    resolve();
                }, 1000);
            }
        });
    }

    setupFontObserver() {
        // Observe for font changes in the DOM
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    const target = mutation.target;
                    const fontFamily = getComputedStyle(target).fontFamily;
                    if (fontFamily && !this.loadedFonts.has(fontFamily)) {
                        this.loadFont(fontFamily);
                    }
                }
            });
        });

        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['style'],
            subtree: true
        });
    }

    searchFonts(query) {
        if (!query) return this.fonts.slice(0, 20);

        const searchTerm = query.toLowerCase();
        return this.fonts.filter(font =>
            font.family.toLowerCase().includes(searchTerm)
        ).slice(0, 20);
    }

    getFontVariants(fontFamily) {
        // Clean the font family name - remove quotes and trim
        const cleanFontFamily = fontFamily.replace(/^["']|[""]$/g, '').trim();

        const font = this.fonts.find(f => f.family === cleanFontFamily) ||
            this.getFallbackFonts().find(f => f.family === cleanFontFamily);

        if (font) {
            // For known fonts, return only the weights that are actually available
            return font.variants;
        } else {
            // For unknown fonts, return a more conservative set of common weights
            // that are more likely to be available or have visible differences
            return ['300', '400', '500', '600', '700'];
        }
    }

    // Check if a font is available (loaded or in the list)
    isFontAvailable(fontFamily) {
        return this.loadedFonts.has(fontFamily) ||
            this.fonts.some(f => f.family === fontFamily) ||
            this.getFallbackFonts().some(f => f.family === fontFamily);
    }

    // Preview font in a specific element
    previewFont(element, fontFamily) {
        if (!element) return;

        this.loadFont(fontFamily).then(() => {
            element.style.fontFamily = `"${fontFamily}", sans-serif`;
        });
    }
}

// Global instance
window.googleFontsManager = new GoogleFontsManager();
