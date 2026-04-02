// Asset Preloader Utility
class AssetPreloader {
    constructor() {
        this.loadedCount = 0;
        this.totalCount = 0;
        this.assets = [];
        this.onComplete = null;
    }

    // Add assets to preload list
    addImage(src) {
        this.assets.push({ type: 'image', src: src });
        this.totalCount++;
    }

    addAudio(src) {
        this.assets.push({ type: 'audio', src: src });
        this.totalCount++;
    }

    addVideo(src) {
        this.assets.push({ type: 'video', src: src });
        this.totalCount++;
    }

    // Load a single asset
    loadAsset(asset) {
        return new Promise((resolve, reject) => {
            let element;

            switch (asset.type) {
                case 'image':
                    element = new Image();
                    element.onload = () => {
                        this.loadedCount++;
                        this.updateProgress();
                        resolve();
                    };
                    element.onerror = () => {
                        console.warn(`Failed to load image: ${asset.src}`);
                        this.loadedCount++;
                        this.updateProgress();
                        resolve(); // Continue even if some assets fail
                    };
                    element.src = asset.src;
                    break;

                case 'audio':
                    element = new Audio();
                    element.addEventListener('canplaythrough', () => {
                        this.loadedCount++;
                        this.updateProgress();
                        resolve();
                    });
                    element.onerror = () => {
                        console.warn(`Failed to load audio: ${asset.src}`);
                        this.loadedCount++;
                        this.updateProgress();
                        resolve(); // Continue even if some assets fail
                    };
                    element.src = asset.src;
                    element.load();
                    break;

                case 'video':
                    element = document.createElement('video');
                    element.preload = 'auto';
                    element.addEventListener('canplaythrough', () => {
                        this.loadedCount++;
                        this.updateProgress();
                        resolve();
                    });
                    element.onerror = () => {
                        console.warn(`Failed to load video: ${asset.src}`);
                        this.loadedCount++;
                        this.updateProgress();
                        resolve(); // Continue even if some assets fail
                    };
                    element.src = asset.src;
                    element.load();
                    break;
            }
        });
    }

    // Update progress bar
    updateProgress() {
        const progressBar = document.getElementById('loading-progress-bar');
        const progressText = document.getElementById('loading-progress-text');
        
        if (progressBar && progressText) {
            const percentage = Math.round((this.loadedCount / this.totalCount) * 100);
            progressBar.style.width = percentage + '%';
            progressText.textContent = `Loading... ${percentage}%`;
        }
    }

    // Load all assets
    async loadAll() {
        if (this.totalCount === 0) {
            this.complete();
            return;
        }

        // Load assets in batches to avoid overwhelming the browser
        const batchSize = 10;
        for (let i = 0; i < this.assets.length; i += batchSize) {
            const batch = this.assets.slice(i, i + batchSize);
            await Promise.all(batch.map(asset => this.loadAsset(asset)));
        }

        this.complete();
    }

    // Complete loading
    complete() {
        if (this.onComplete) {
            this.onComplete();
        }
    }

    // Start preloading
    start() {
        this.loadAll();
    }
}

// Page-specific asset lists
const AssetLists = {
    index: {
        images: [
            'images/casino.png',
            'images/slots.png',
            'images/blackjack.png',
            'images/roulette.png',
            'images/chips/chip1.png',
            'images/chips/chip5.png',
            'images/chips/chip25.png',
            'images/chips/chip50.png',
            'images/chips/chip100.png'
        ]
    },
    slots: {
        images: [
            'images/chips/chip1.png',
            'images/chips/chip5.png',
            'images/chips/chip25.png',
            'images/chips/chip50.png',
            'images/chips/chip100.png',
            'images/watermelon.png',
            'images/plum.png',
            'images/cherries.png',
            'images/lemon.png',
            'images/bar.png',
            'images/seven.png',
            'images/diamond.png',
            'images/question.png'
        ],
        sounds: [
            'sounds/win.mp3',
            'sounds/won.mp3',
            'sounds/lost.mp3',
            'sounds/slot.mp3',
            'sounds/jackpot.mp3'
        ]
    },
    blackjack: {
        images: [
            'images/chips/chip1.png',
            'images/chips/chip5.png',
            'images/chips/chip25.png',
            'images/chips/chip50.png',
            'images/chips/chip100.png',
            'images/cards/dealer.png'
        ],
        sounds: [
            'sounds/shuffle.mp3',
            'sounds/win.mp3',
            'sounds/won.mp3',
            'sounds/lost.mp3',
            'sounds/bj.mp3'
        ]
    },
    roulette: {
        images: [
            'images/0.png',
            'images/chips/chip1.png',
            'images/chips/chip5.png',
            'images/chips/chip25.png',
            'images/chips/chip50.png',
            'images/chips/chip100.png'
        ],
        sounds: [
            'sounds/wheel.mp3',
            'sounds/win.mp3',
            'sounds/won.mp3',
            'sounds/lost.mp3'
        ],
        videos: []
    }
};

// Add all card images for blackjack
const suits = ['spades', 'hearts', 'clubs', 'diamonds'];
const cardValues = ['ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king'];
cardValues.forEach(value => {
    suits.forEach(suit => {
        AssetLists.blackjack.images.push(`images/cards/${value}_of_${suit}.png`);
    });
});

// Add all roulette videos (0-36, but 31 is missing so we'll skip it)
for (let i = 0; i <= 36; i++) {
    if (i !== 31) { // Skip missing video
        AssetLists.roulette.videos.push(`videos/${i}.mp4`);
    }
}

// Add all roulette number sounds (0-36)
for (let i = 0; i <= 36; i++) {
    AssetLists.roulette.sounds.push(`sounds/${i}.mp3`);
}

// Initialize preloader for current page
function initPreloader() {
    const loadingScreen = document.getElementById('loading-screen');
    const mainContent = document.getElementById('main-content-wrapper');
    
    if (!loadingScreen) {
        console.warn('Loading screen not found');
        return;
    }
    
    if (!mainContent) {
        console.warn('Main content wrapper not found');
        return;
    }

    // Determine which page we're on
    let pageType = 'index';
    const path = window.location.pathname;
    if (path.includes('slots.html')) pageType = 'slots';
    else if (path.includes('blackjack.html')) pageType = 'blackjack';
    else if (path.includes('roulette.html')) pageType = 'roulette';

    // Get assets for this page
    const assets = AssetLists[pageType] || AssetLists.index;
    const preloader = new AssetPreloader();

    // Add all assets to preloader
    if (assets.images) {
        assets.images.forEach(img => preloader.addImage(img));
    }
    if (assets.sounds) {
        assets.sounds.forEach(sound => preloader.addAudio(sound));
    }
    if (assets.videos) {
        assets.videos.forEach(video => preloader.addVideo(video));
    }

    // Set completion callback
    preloader.onComplete = () => {
        // Hide loading screen with fade out
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            
            // Enable all interactive elements
            if (mainContent) {
                mainContent.classList.add('loaded');
            }
        }, 500);
    };

    // Start preloading
    preloader.start();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPreloader);
} else {
    initPreloader();
}

