// Slots Game JavaScript
class SlotsGame {
    constructor() {
        this.balance = 0;
        this.betAmount = 0; // Current bet amount from chips
        this.isSpinning = false;
        // Symbol weights set so: watermelon/plum/cherries/lemon equal; bar half of those; seven half of bar; diamond half of seven
        // Using integer weights: base = 8 for watermelon/plum/cherries/lemon
        this.symbols = [
            { image: 'images/watermelon.png', name: 'watermelon', value: 1, weight: 8 },
            { image: 'images/plum.png', name: 'plum', value: 2, weight: 8 },
            { image: 'images/cherries.png', name: 'cherries', value: 3, weight: 8 },
            { image: 'images/lemon.png', name: 'lemon', value: 4, weight: 8 },
            { image: 'images/bar.png', name: 'bar', value: 5, weight: 4 },
            { image: 'images/seven.png', name: 'seven', value: 6, weight: 2 },
            { image: 'images/diamond.png', name: 'diamond', value: 7, weight: 1 }
        ];

        // Debug flag: set to true in console via `window.slotsGame.debug = true` to log detailed pattern detection
        this.debug = false;
        
        this.initializeElements();
        this.attachEventListeners();
        this.generateSlotsGrid();
        this.loadBalance();

        // Prevent back-button from reverting balance
        window.addEventListener('popstate', () => {
            const stored = sessionStorage.getItem('casinoBalance');
            if (stored !== null) {
                this.balance = parseFloat(stored);
                this.updateBalanceDisplay();
                const newUrl = `${window.location.pathname}?balance=${this.balance}`;
                window.history.replaceState({}, '', newUrl);
            }
        });

        // Handle bfcache restores (pageshow)
        window.addEventListener('pageshow', (event) => {
            const stored = sessionStorage.getItem('casinoBalance');
            if (stored !== null) {
                this.balance = parseFloat(stored);
                this.updateBalanceDisplay();
                const newUrl = `${window.location.pathname}?balance=${this.balance}`;
                try { window.history.replaceState({}, '', newUrl); } catch (e) {}
            }
        });

        // Preload win/was/won/lost and slot sounds (place sounds/win.mp3, won.mp3, lost.mp3, slot.mp3, etc.)
        try {
            this.winAudio = new Audio('sounds/win.mp3');
            this.winAudio.load();
        } catch (e) {
            console.log('Win audio not available:', e);
            this.winAudio = null;
        }
        try {
            this.wonAudio = new Audio('sounds/won.mp3');
            this.wonAudio.load();
        } catch (e) {
            console.log('Won audio not available:', e);
            this.wonAudio = null;
        }
        try {
            this.lostAudio = new Audio('sounds/lost.mp3');
            this.lostAudio.load();
        } catch (e) {
            console.log('Lost audio not available:', e);
            this.lostAudio = null;
        }
        try {
            this.slotAudio = new Audio('sounds/slot.mp3');
            this.slotAudio.load();
        } catch (e) {
            console.log('Slot audio not available:', e);
            this.slotAudio = null;
        }
        // Preload jackpot sound (optional)
        try {
            this.jackpotAudio = new Audio('sounds/jackpot.mp3');
            this.jackpotAudio.load();
        } catch (e) {
            console.log('Jackpot audio not available:', e);
            this.jackpotAudio = null;
        }
    }

    initializeElements() {
        this.balanceDisplay = document.getElementById('slots-balance');
        this.betAmountDisplay = document.getElementById('bet-amount-display');
        this.clearBetButton = document.getElementById('clear-bet-button');
        this.playButton = document.getElementById('play-button');
        this.slotsGrid = document.getElementById('slots-grid');
        this.resultMessage = document.getElementById('result-message');
        this.backButton = document.getElementById('back-to-main');
        
        // Initialize bet amount display
        this.updateBetAmountDisplay();
    }

    attachEventListeners() {
        this.playButton.addEventListener('click', () => this.spin());
        this.clearBetButton.addEventListener('click', () => this.clearBet());
        this.backButton.addEventListener('click', () => this.goBack());
        
        // Add chip click listeners
        const chips = document.querySelectorAll('.chip');
        chips.forEach(chip => {
            chip.addEventListener('click', () => {
                const value = parseFloat(chip.dataset.value);
                this.addToBet(value);
            });
        });
    }

    loadBalance() {
        // Get balance from URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        const balanceParam = urlParams.get('balance');
        const stored = sessionStorage.getItem('casinoBalance');
        if (stored !== null) {
            this.balance = parseFloat(stored);
            const newUrl = `${window.location.pathname}?balance=${this.balance}`;
            window.history.replaceState({}, '', newUrl);
        } else if (balanceParam) {
            this.balance = parseFloat(balanceParam);
            sessionStorage.setItem('casinoBalance', String(this.balance));
        } else {
            this.balance = 0;
        }
        this.updateBalanceDisplay();
        
        // If no balance found, redirect back to main casino
        if (this.balance <= 0) {
            setTimeout(() => {
                alert('Please deposit money in the main casino first!');
                window.location.href = 'index.html';
            }, 1000);
        }
    }

    // Sync from sessionStorage (for pageshow/focus/visibility/popstate)
    syncBalanceFromSession() {
        const stored = sessionStorage.getItem('casinoBalance');
        if (stored !== null) {
            const newBal = parseFloat(stored);
            if (this.balance !== newBal) {
                this.balance = newBal;
                this.updateBalanceDisplay();
                const newUrl = `${window.location.pathname}?balance=${this.balance}`;
                try { window.history.replaceState({}, '', newUrl); } catch (e) {}
            }
        }
    }

    saveBalance() {
        // Persist to sessionStorage and update the URL with new balance
        sessionStorage.setItem('casinoBalance', String(this.balance));
        const newUrl = `slots.html?balance=${this.balance}`;
        window.history.replaceState({}, '', newUrl);
    }

    addToBet(value) {
        this.betAmount += value;
        this.updateBetAmountDisplay();
    }

    clearBet() {
        this.betAmount = 0;
        this.updateBetAmountDisplay();
    }

    updateBetAmountDisplay() {
        this.betAmountDisplay.textContent = `€${this.betAmount.toFixed(2)}`;
    }

    generateSlotsGrid() {
        this.slotsGrid.innerHTML = '';
        for (let i = 0; i < 15; i++) { // 3 rows × 5 columns
            const slotElement = document.createElement('div');
            slotElement.className = 'slot-symbol';
            
            // Create placeholder image for spinning state
            const placeholderImg = document.createElement('img');
            placeholderImg.src = 'images/question.png'; // You can create a simple question mark image
            placeholderImg.alt = '?';
            placeholderImg.className = 'slot-image';
            
            slotElement.appendChild(placeholderImg);
            this.slotsGrid.appendChild(slotElement);
        }
    }

    spin() {
        if (this.isSpinning) return;

        if (this.betAmount <= 0) {
            this.showResult('Please add chips to your bet!', 'lose');
            return;
        }

        if (this.betAmount > this.balance) {
            this.showResult('Insufficient balance!', 'lose');
            return;
        }

        // Store bet amount for this spin
        const betAmount = this.betAmount;

        this.isSpinning = true;
        this.playButton.disabled = true;
        // Disable chips during spin
        document.querySelectorAll('.chip').forEach(chip => chip.style.pointerEvents = 'none');
        this.clearBetButton.disabled = true;
        // Keep the button label unchanged and just disable it (grayed out) during spins
    // Play slot start sound on user spin
    try { if (this.slotAudio) { this.slotAudio.currentTime = 0; this.slotAudio.play().catch(() => {}); } } catch (e) { }
        
        // Deduct bet from balance
        this.balance -= betAmount;
        this.updateBalanceDisplay();
        this.saveBalance();
        
        // Clear bet after deducting
        this.clearBet();

        // Clear previous result
        this.hideResult();

        // Animate spinning
        this.animateSpin();

        // Generate results after animation
        setTimeout(() => {
            try {
                const results = this.generateResults();
                this.displayResults(results);
                
                const winAmount = this.calculateWin(results, betAmount);
                if (winAmount > 0) {
                    this.balance += winAmount;
                    this.updateBalanceDisplay();
                    this.saveBalance();

                    // Always show winnings message and start both win/won audios simultaneously
                    this.showResult(`You won €${winAmount.toFixed(2)}!`, 'win');
                    try {
                        if (this.winAudio) { this.winAudio.currentTime = 0; this.winAudio.play().catch(() => {}); }
                        if (this.wonAudio) { this.wonAudio.currentTime = 0; this.wonAudio.play().catch(() => {}); }

                        // If it's a diamond-all jackpot, also play jackpot audio (optional additional layer)
                        const jackpotName = this.isAllSameSymbol(results);
                        if (jackpotName === 'diamond' && this.jackpotAudio) { this.jackpotAudio.currentTime = 0; this.jackpotAudio.play().catch(() => {}); }
                    } catch (e) {}

                    // Highlighting removed by user preference
                } else {
                    // For losses: do not display any message or play any sound
                    this.hideResult();
                }
            } catch (e) {
                // Log and show a friendly message, but ensure UI state is restored in finally
                console.error('Error during spin result handling:', e);
                try { this.showResult('An error occurred during spin.', 'lose'); } catch (err) { }
            } finally {
                // Always reset the spinning state and button even if errors occur
                this.isSpinning = false;
                this.playButton.disabled = false;
                this.playButton.textContent = 'SPIN';
                // Re-enable chips after spin
                document.querySelectorAll('.chip').forEach(chip => chip.style.pointerEvents = 'auto');
                this.clearBetButton.disabled = false;
            }
        }, 2000);
    }

    animateSpin() {
        // Keep showing placeholder during spin animation
        const symbols = this.slotsGrid.querySelectorAll('.slot-symbol img');
        symbols.forEach(img => {
            img.src = 'images/question.png';
            img.parentElement.classList.add('spinning');
        });
    }

    generateResults() {
        const results = [];
        for (let row = 0; row < 3; row++) {
            results[row] = [];
            for (let col = 0; col < 5; col++) {
                results[row][col] = this.getRandomSymbol();
            }
        }
        return results;
    }

    getRandomSymbol() {
        // Weighted random selection using symbol weights
        const totalWeight = this.symbols.reduce((sum, symbol) => sum + symbol.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (let i = 0; i < this.symbols.length; i++) {
            random -= this.symbols[i].weight;
            if (random <= 0) {
                return this.symbols[i];
            }
        }
        return this.symbols[0]; // fallback
    }

    displayResults(results) {
        const symbols = this.slotsGrid.querySelectorAll('.slot-symbol img');
        let index = 0;
        
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 5; col++) {
                symbols[index].src = results[row][col].image;
                symbols[index].alt = results[row][col].name;
                symbols[index].parentElement.classList.remove('winning', 'spinning');
                index++;
            }
        }
        
    // sound playback handled via slotAudio (played on spin) and winAudio (played on wins)
    }

    calculateWin(results, betAmount) {
        let totalWin = 0;

        // Check JACKPOT - all 15 same symbols (any symbol). Add jackpot payout but still count other wins as well
        const first = results[0][0].name;
        let allSame = true;
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 5; col++) {
                if (results[row][col].name !== first) {
                    allSame = false;
                    break;
                }
            }
            if (!allSame) break;
        }
        if (allSame) {
            switch (first) {
                case 'watermelon': totalWin += betAmount * 25; break;
                case 'plum': totalWin += betAmount * 50; break;
                case 'cherries': totalWin += betAmount * 75; break;
                case 'lemon': totalWin += betAmount * 100; break;
                case 'bar': totalWin += betAmount * 150; break;
                case 'seven': totalWin += betAmount * 200; break;
                case 'diamond': totalWin += betAmount * 500; break;
            }
        }

        // Debug logging: print grid and breakdown if debug flag enabled
        if (this.debug) {
            console.group('Slots debug');
            console.log('Grid names:', results.map(r => r.map(s => s.name)));

            for (let row = 0; row < 3; row++) {
                const line = results[row];
                const rowWin = this.checkRowPatterns(line, betAmount);
                console.log(`Row ${row} win: €${rowWin.toFixed(2)}`);
            }

            const vWin = this.checkVPatterns(results, betAmount);
            console.log(`V patterns win: €${vWin.toFixed(2)}`);
            if (allSame) console.log(`All same symbol jackpot: ${first}`);
            console.groupEnd();
        }

        // Check each row for 3, 4, or 5 matching symbols
        for (let row = 0; row < 3; row++) {
            const line = results[row];
            totalWin += this.checkRowPatterns(line, betAmount);
        }

        // Check V patterns (up V and down V)
        totalWin += this.checkVPatterns(results, betAmount);

        return totalWin;
    }

    // Return the symbol name if all 15 positions are the same symbol, otherwise return null
    isAllSameSymbol(results) {
        const first = results[0][0].name;
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 5; col++) {
                if (results[row][col].name !== first) return null;
            }
        }
        return first;
    }

    checkRowPatterns(row, betAmount) {
        // New behavior: any 3 or 4 (or 5) of the same symbol anywhere in the row qualifies.
        let win = 0;

        // Build counts of each symbol in the row
        const counts = {};
        for (let i = 0; i < 5; i++) {
            const name = row[i].name;
            counts[name] = (counts[name] || 0) + 1;
        }

        // Check for 5 of a kind
        for (const name in counts) {
            if (counts[name] === 5) {
                switch (name) {
                    case 'watermelon': win += betAmount * 4; break;
                    case 'plum': win += betAmount * 5; break;
                    case 'cherries': win += betAmount * 6; break;
                    case 'lemon': win += betAmount * 7; break;
                    case 'bar': win += betAmount * 10; break;
                    case 'seven': win += betAmount * 15; break;
                    case 'diamond': win += betAmount * 25; break;
                }
                return win; // highest priority
            }
        }

        // Check for 4 of a kind
        for (const name in counts) {
            if (counts[name] >= 4) {
                switch (name) {
                    case 'watermelon': win += betAmount * 2; break;
                    case 'plum': win += betAmount * 2; break;
                    case 'cherries': win += betAmount * 3; break;
                    case 'lemon': win += betAmount * 3; break;
                    case 'bar': win += betAmount * 4; break;
                    case 'seven': win += betAmount * 5; break;
                    case 'diamond': win += betAmount * 10; break;
                }
                return win;
            }
        }

        // Check for 3  of a kind
        for (const name in counts) {
            if (counts[name] >= 3) {
                switch (name) {
                    case 'watermelon': win += betAmount * 1; break;
                    case 'plum': win += betAmount * 1; break;
                    case 'cherries': win += betAmount * 1; break;
                    case 'lemon': win += betAmount * 1; break;
                    case 'bar': win += betAmount * 2; break;
                    case 'seven': win += betAmount * 3; break;
                    case 'diamond': win += betAmount * 4; break;
                }
                break;
            }
        }

        return win;
    }

    checkVPatterns(results, betAmount) {
        let win = 0;

        // Up V pattern: grid[0][0], grid[1][1], grid[2][2], grid[1][3], grid[0][4]
        if (results[0][0].name === results[1][1].name && results[1][1].name === results[2][2].name &&
            results[2][2].name === results[1][3].name && results[1][3].name === results[0][4].name) {
            const name = results[0][0].name;
            switch (name) {
                case 'watermelon': win += betAmount * 3; break;
                case 'plum': win += betAmount * 3; break;
                case 'cherries': win += betAmount * 4; break;
                case 'lemon': win += betAmount * 4; break;
                case 'bar': win += betAmount * 8; break;
                case 'seven': win += betAmount * 12; break;
                case 'diamond': win += betAmount * 15; break;
            }
        }

        // Down V pattern: grid[2][0], grid[1][1], grid[0][2], grid[1][3], grid[2][4]
        if (results[2][0].name === results[1][1].name && results[1][1].name === results[0][2].name &&
            results[0][2].name === results[1][3].name && results[1][3].name === results[2][4].name) {
            const name = results[2][0].name;
            switch (name) {
                case 'watermelon': win += betAmount * 3; break;
                case 'plum': win += betAmount * 3; break;
                case 'cherries': win += betAmount * 4; break;
                case 'lemon': win += betAmount * 4; break;
                case 'bar': win += betAmount * 8; break;
                case 'seven': win += betAmount * 12; break;
                case 'diamond': win += betAmount * 15; break;
            }
        }

        return win;
    }

    showResult(message, type) {
        this.resultMessage.textContent = message;
        this.resultMessage.className = `result-message show ${type}`;
    }

    hideResult() {
        this.resultMessage.className = 'result-message';
    }

    updateBalanceDisplay() {
        this.balanceDisplay.textContent = `€${this.balance.toFixed(2)}`;
        
        // Add animation
        this.balanceDisplay.style.transform = 'scale(1.1)';
        this.balanceDisplay.style.color = '#ffed4e';
        setTimeout(() => {
            this.balanceDisplay.style.transform = 'scale(1)';
            this.balanceDisplay.style.color = '#ffd700';
        }, 300);
    }

    // Note: sound playback is handled by preloaded audio elements (slotAudio and winAudio).

    goBack() {
        // Navigate back to main casino with updated balance
        const mainUrl = `index.html?balance=${this.balance}`;
        window.location.href = mainUrl;
    }
}

// Initialize the slots game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Expose instance for debugging via `window.slotsGame`
    window.slotsGame = new SlotsGame();
});
