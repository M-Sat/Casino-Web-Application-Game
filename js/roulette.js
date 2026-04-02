class RouletteGame {
    constructor() {
        this.balance = 0;
        this.selectedBet = null; // { type, value }
        this.betAmount = 0; // Current bet amount from chips
        this.lastSpins = [];
        this.redNumbers = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);

        this.initializeElements();
        this.attachEventListeners();
        this.loadBalance();

        // Prevent back-button balance reversion
        window.addEventListener('popstate', () => {
            const stored = sessionStorage.getItem('casinoBalance');
            if (stored !== null) {
                this.balance = parseFloat(stored);
                this.updateBalanceDisplay();
                const newUrl = `${window.location.pathname}?balance=${this.balance}`;
                window.history.replaceState({}, '', newUrl);
            }
        });

        // Also handle pages restored from bfcache
        window.addEventListener('pageshow', () => {
            const stored = sessionStorage.getItem('casinoBalance');
            if (stored !== null) {
                this.balance = parseFloat(stored);
                this.updateBalanceDisplay();
                const newUrl = `${window.location.pathname}?balance=${this.balance}`;
                try { window.history.replaceState({}, '', newUrl); } catch (e) {}
            }
        });

        this.setupResponsiveGrid();
        this.loadIdleFrame();

        // Preload wheel sound
        try { this.wheelAudio = new Audio('sounds/wheel.mp3'); } catch (e) { this.wheelAudio = null; }
        try { this.winAudio = new Audio('sounds/win.mp3'); } catch (e) { this.winAudio = null; }
        this.updateLastSpinsUI();
    }

    initializeElements() {
        this.balanceDisplay = document.getElementById('roulette-balance');
        this.backButton = document.getElementById('back-to-main');
        this.videoEl = document.getElementById('roulette-video');
        this.idleImg = document.getElementById('roulette-idle');
        this.spinOverlay = document.getElementById('spin-overlay');
        this.spinButton = document.getElementById('spin-button');
        this.betAmountDisplay = document.getElementById('bet-amount-display');
        this.clearBetButton = document.getElementById('clear-bet-button');
        this.betGrid = document.getElementById('bet-grid');
        this.resultMessage = document.getElementById('result-message');
        this.lastSpinsEl = document.getElementById('last-spins');

        // columns/containers
        this.wheelColumn = document.querySelector('.wheel-column');
        this.wheelFrame = this.wheelColumn ? this.wheelColumn.querySelector('.wheel-frame') : null;
        this.bettingColumn = document.querySelector('.betting-column');
        this.betControls = document.querySelector('.bet-controls');

        this.backButton.addEventListener('click', () => this.goBack());
        
        // Initialize bet amount display
        this.updateBetAmountDisplay();
    }

    attachEventListeners() {
        this.spinButton.addEventListener('click', () => this.spin());
        this.clearBetButton.addEventListener('click', () => this.clearBet());
        
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

        if (this.balance <= 0) {
            // Show the floating warning message (like Slots/Blackjack) then redirect to main
            this.showResult('Please deposit money in the main casino first!', 'warn');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1200);
        }
    }

    saveBalance() {
        // persist to sessionStorage and update URL
        sessionStorage.setItem('casinoBalance', String(this.balance));
        const newUrl = `roulette.html?balance=${this.balance}`;
        window.history.replaceState({}, '', newUrl);
    }

    updateBalanceDisplay() {
        this.balanceDisplay.textContent = `€${this.balance.toFixed(2)}`;
    }

    goBack() {
        const mainUrl = `index.html?balance=${this.balance}`;
        window.location.href = mainUrl;
    }

    createNumberGrid() {
        // Clear grid
        this.betGrid.innerHTML = '';

        // column definitions saved on instance for payout checks
        this.col1 = [3,6,9,12,15,18,21,24,27,30,33,36];
        this.col2 = [2,5,8,11,14,17,20,23,26,29,32,35];
        this.col3 = [1,4,7,10,13,16,19,22,25,28,31,34];

        // Add 0 cell that spans 3 rows (leftmost column)
        const zeroCell = document.createElement('div');
        zeroCell.className = 'bet-cell green zero';
        zeroCell.style.gridColumn = '1 / span 1';
        zeroCell.style.gridRow = '1 / span 3';
        zeroCell.textContent = '0';
        zeroCell.dataset.number = '0';
        zeroCell.addEventListener('click', () => this.selectNumberBet(0));
        this.betGrid.appendChild(zeroCell);

        // Add the 3 rows of numbers (each row has 12 numbers)
        for (let i = 0; i < 12; i++) {
            // top row (row 1) - numbers: col1
            const n1 = this.col1[i];
            const cell1 = document.createElement('div');
            cell1.className = 'bet-cell ' + (this.redNumbers.has(n1) ? 'red' : 'black');
            cell1.textContent = n1;
            cell1.dataset.number = String(n1);
            cell1.style.gridColumn = (2 + i).toString();
            cell1.style.gridRow = '1';
            cell1.addEventListener('click', () => this.selectNumberBet(n1));
            this.betGrid.appendChild(cell1);

            // middle row (row 2) - numbers: col2
            const n2 = this.col2[i];
            const cell2 = document.createElement('div');
            cell2.className = 'bet-cell ' + (this.redNumbers.has(n2) ? 'red' : 'black');
            cell2.textContent = n2;
            cell2.dataset.number = String(n2);
            cell2.style.gridColumn = (2 + i).toString();
            cell2.style.gridRow = '2';
            cell2.addEventListener('click', () => this.selectNumberBet(n2));
            this.betGrid.appendChild(cell2);

            // bottom row (row 3) - numbers: col3
            const n3 = this.col3[i];
            const cell3 = document.createElement('div');
            cell3.className = 'bet-cell ' + (this.redNumbers.has(n3) ? 'red' : 'black');
            cell3.textContent = n3;
            cell3.dataset.number = String(n3);
            cell3.style.gridColumn = (2 + i).toString();
            cell3.style.gridRow = '3';
            cell3.addEventListener('click', () => this.selectNumberBet(n3));
            this.betGrid.appendChild(cell3);
        }

        // Add the 2:1 column bet buttons on the right for each row
        for (let r = 1; r <= 3; r++) {
            const colBet = document.createElement('div');
            colBet.className = 'bet-cell outside-bet';
            colBet.textContent = '2:1';
            colBet.dataset.type = 'column';
            colBet.dataset.value = String(r);
            colBet.style.gridColumn = '14';
            colBet.style.gridRow = String(r);
            colBet.addEventListener('click', () => this.selectOutsideBet('column', r));
            this.betGrid.appendChild(colBet);
        }

        // Dozens row (row 4), each spans 4 columns
        const dozen1 = document.createElement('div');
        dozen1.className = 'bet-cell outside-bet';
        dozen1.textContent = '1-12';
        dozen1.dataset.type = 'dozen';
        dozen1.dataset.value = '1';
        dozen1.style.gridColumn = '2 / span 4';
        dozen1.style.gridRow = '4';
        dozen1.addEventListener('click', () => this.selectOutsideBet('dozen', 1));
        this.betGrid.appendChild(dozen1);

        const dozen2 = document.createElement('div');
        dozen2.className = 'bet-cell outside-bet';
        dozen2.textContent = '13-24';
        dozen2.dataset.type = 'dozen';
        dozen2.dataset.value = '2';
        dozen2.style.gridColumn = '6 / span 4';
        dozen2.style.gridRow = '4';
        dozen2.addEventListener('click', () => this.selectOutsideBet('dozen', 2));
        this.betGrid.appendChild(dozen2);

        const dozen3 = document.createElement('div');
        dozen3.className = 'bet-cell outside-bet';
        dozen3.textContent = '25-36';
        dozen3.dataset.type = 'dozen';
        dozen3.dataset.value = '3';
        dozen3.style.gridColumn = '10 / span 4';
        dozen3.style.gridRow = '4';
        dozen3.addEventListener('click', () => this.selectOutsideBet('dozen', 3));
        this.betGrid.appendChild(dozen3);

        // Bottom outside bets row (row 5) - each spans 2 columns
        const outsideDefs = [
            { type: 'half', value: '1', label: '1-18', col: 2 },
            { type: 'parity', value: 'even', label: 'Even', col: 4 },
            { type: 'color', value: 'red', label: 'Red', col: 6 },
            { type: 'color', value: 'black', label: 'Black', col: 8 },
            { type: 'parity', value: 'odd', label: 'Odd', col: 10 },
            { type: 'half', value: '2', label: '19-36', col: 12 }
        ];

        outsideDefs.forEach(def => {
            const el = document.createElement('div');
            el.className = 'bet-cell outside-bet';
            el.textContent = def.label;
            el.dataset.type = def.type;
            el.dataset.value = def.value;
            el.style.gridColumn = `${def.col} / span 2`;
            el.style.gridRow = '5';
            el.addEventListener('click', () => this.selectOutsideBet(def.type, def.value));
            this.betGrid.appendChild(el);
        });
    }

    // Responsive grid: desktop >= 992px uses the existing horizontal layout; smaller screens use a vertical layout
    setupResponsiveGrid() {
        this.mq = window.matchMedia('(min-width: 992px)');
        this._mqHandler = (e) => this._onMqChange(e);
        if (this.mq.addEventListener) this.mq.addEventListener('change', this._mqHandler);
        else this.mq.addListener(this._mqHandler);
        // on resize keep control width in sync when placed under the wheel
        this._onResize = () => { if (!this.mq.matches) this.moveControlsToWheel(); else this.moveControlsToBetting(); };
        window.addEventListener('resize', this._onResize);
        // initial selection
        this._onMqChange(this.mq);
    }

    _onMqChange(e) {
        // reset any selection and grid before rebuilding
        this.clearSelection();
        this.betGrid.innerHTML = '';
        this.betGrid.style.gridTemplateColumns = '';
        if (e.matches) {
            this.createNumberGrid();
            // move controls back to the betting column
            this.moveControlsToBetting();
        } else {
            this.createNumberGrid2();
            // place controls under the wheel in the left column
            this.moveControlsToWheel();
        }
    }

    moveControlsToWheel() {
        if (!this.betControls || !this.wheelColumn) return;
        // append controls under wheel-frame in wheel column
        this.wheelColumn.appendChild(this.betControls);
        // match width to wheel-frame
        const w = this.wheelFrame ? (this.wheelFrame.getBoundingClientRect().width || 320) : 320;
        this.betControls.style.width = `${Math.round(w)}px`;
        this.betControls.style.boxSizing = 'border-box';
        this.betControls.classList.add('controls-in-wheel');
    }

    moveControlsToBetting() {
        if (!this.betControls || !this.bettingColumn) return;
        this.bettingColumn.appendChild(this.betControls);
        this.betControls.style.width = '';
        this.betControls.style.boxSizing = '';
        this.betControls.classList.remove('controls-in-wheel');
    }

    // Vertical / mobile-friendly grid (for widths below 992px)
    createNumberGrid2() {
        // Clear grid
        this.betGrid.innerHTML = '';

        // 4 columns: 3 for numbers, 1 for the dozens column
        this.betGrid.style.gridTemplateColumns = 'repeat(3, 1fr) 1fr';

        // Add 0 cell that spans the three number columns on top
        const zeroCell = document.createElement('div');
        zeroCell.className = 'bet-cell green zero';
        zeroCell.style.gridColumn = '1 / span 3';
        zeroCell.style.gridRow = '1';
        zeroCell.textContent = '0';
        zeroCell.dataset.number = '0';
        zeroCell.addEventListener('click', () => this.selectNumberBet(0));
        this.betGrid.appendChild(zeroCell);

        // Add the numbers as 12 rows of 3 columns each (rows 2..13)
        let num = 1;
        for (let row = 2; row <= 13; row++) {
            for (let col = 1; col <= 3; col++) {
                if (num > 36) break;
                const n = num;
                const cell = document.createElement('div');
                cell.className = 'bet-cell ' + (this.redNumbers.has(n) ? 'red' : 'black');
                cell.textContent = n;
                cell.dataset.number = String(n);
                cell.style.gridColumn = String(col);
                cell.style.gridRow = String(row);
                cell.addEventListener('click', () => this.selectNumberBet(n));
                this.betGrid.appendChild(cell);
                num++;
            }
        }

        // Dozens on the right, each spanning 4 rows
        const dozen1 = document.createElement('div');
        dozen1.className = 'bet-cell outside-bet';
        dozen1.textContent = '1-12';
        dozen1.dataset.type = 'dozen';
        dozen1.dataset.value = '1';
        dozen1.style.gridColumn = '4';
        dozen1.style.gridRow = '2 / span 4';
        dozen1.addEventListener('click', () => this.selectOutsideBet('dozen', 1));
        this.betGrid.appendChild(dozen1);

        const dozen2 = document.createElement('div');
        dozen2.className = 'bet-cell outside-bet';
        dozen2.textContent = '13-24';
        dozen2.dataset.type = 'dozen';
        dozen2.dataset.value = '2';
        dozen2.style.gridColumn = '4';
        dozen2.style.gridRow = '6 / span 4';
        dozen2.addEventListener('click', () => this.selectOutsideBet('dozen', 2));
        this.betGrid.appendChild(dozen2);

        const dozen3 = document.createElement('div');
        dozen3.className = 'bet-cell outside-bet';
        dozen3.textContent = '25-36';
        dozen3.dataset.type = 'dozen';
        dozen3.dataset.value = '3';
        dozen3.style.gridColumn = '4';
        dozen3.style.gridRow = '10 / span 4';
        dozen3.addEventListener('click', () => this.selectOutsideBet('dozen', 3));
        this.betGrid.appendChild(dozen3);

        // Outside bets rows (each roughly half the numbers width)
        const outsideRowStart = 14;
        const outsideDefsMobile = [
            { type: 'half', value: '1', label: '1-18', col: '1 / span 2', row: outsideRowStart },
            { type: 'half', value: '2', label: '19-36', col: '3 / span 2', row: outsideRowStart },

            { type: 'parity', value: 'even', label: 'Even', col: '1 / span 2', row: outsideRowStart + 1 },
            { type: 'parity', value: 'odd', label: 'Odd', col: '3 / span 2', row: outsideRowStart + 1 },

            { type: 'color', value: 'red', label: 'Red', col: '1 / span 2', row: outsideRowStart + 2 },
            { type: 'color', value: 'black', label: 'Black', col: '3 / span 2', row: outsideRowStart + 2 },
        ];

        outsideDefsMobile.forEach(def => {
            const el = document.createElement('div');
            el.className = 'bet-cell outside-bet';
            el.textContent = def.label;
            el.dataset.type = def.type;
            el.dataset.value = def.value;
            el.style.gridColumn = def.col;
            el.style.gridRow = String(def.row);
            el.addEventListener('click', () => this.selectOutsideBet(def.type, def.value));
            this.betGrid.appendChild(el);
        });

        // Keep column arrays consistent with the visual columns 1..3
        this.col1 = [1,4,7,10,13,16,19,22,25,28,31,34];
        this.col2 = [2,5,8,11,14,17,20,23,26,29,32,35];
        this.col3 = [3,6,9,12,15,18,21,24,27,30,33,36];
    }

    selectNumberBet(number) {
        this.selectedBet = { type: 'number', value: number };
        this.updateSelectedUI();
    }

    selectOutsideBet(type, value) {
        if (type === 'dozen') {
            this.selectedBet = { type: 'dozen', value: parseInt(value, 10) };
        } else if (type === 'half') {
            this.selectedBet = { type: 'half', value: parseInt(value, 10) };
        } else if (type === 'parity') {
            this.selectedBet = { type: 'parity', value: value };
        } else if (type === 'color') {
            this.selectedBet = { type: 'color', value: value };
        }
        this.updateSelectedUI();
    }

    clearSelection() {
        this.selectedBet = null;
        this.updateSelectedUI();
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

    updateSelectedUI() {
        // Use visual highlighting only (flashing yellow on .selected) instead of writing text
        // Clear all selections first
        document.querySelectorAll('.bet-cell.selected').forEach(el => el.classList.remove('selected'));
        document.querySelectorAll('.outside-bet.selected').forEach(el => el.classList.remove('selected'));

        if (!this.selectedBet) {
            return;
        }

        if (this.selectedBet.type === 'number') {
            // select matching number cell
            const selector = `.bet-cell[data-number="${this.selectedBet.value}"]`;
            const el = this.betGrid.querySelector(selector);
            if (el) el.classList.add('selected');
        } else {
            // select matching outside bet button
            const btn = Array.from(document.querySelectorAll('.outside-bet')).find(b => b.dataset.type === this.selectedBet.type && b.dataset.value === String(this.selectedBet.value));
            if (btn) btn.classList.add('selected');
        }
    }

    spin() {
        if (this.spinning) return;

        if (!this.selectedBet) { this.showResult('Please select a bet first!', 'warn'); return; }
        if (this.betAmount <= 0) { this.showResult('Please add chips to your bet!', 'warn'); return; }
        if (this.betAmount > this.balance) { this.showResult('Insufficient balance!', 'warn'); return; }

        // Store bet amount for this spin
        const betAmount = this.betAmount;
        
        // Deduct bet immediately
        this.balance -= betAmount;
        this.updateBalanceDisplay();
        this.saveBalance();
        
        // Clear bet after deducting
        this.clearBet();

        this.spinning = true;
        this.spinButton.disabled = true;
        this.showResult('', '');

        // Generate outcome
        const actualNumber = Math.floor(Math.random() * 37); // 0..36
        const videoNumber = (actualNumber === 31) ? 11 : actualNumber; // fallback for missing 31 animation

        // Show quick "Spinning" flash (0.3s) and play wheel sound
        this.spinOverlay.classList.add('show');
        // remove overlay class after animation completes
        setTimeout(() => this.spinOverlay.classList.remove('show'), 350);
        if (this.wheelAudio) { try { this.wheelAudio.currentTime = 0; this.wheelAudio.play(); } catch (e) {} }

        setTimeout(() => {
            // Prepare video
            this.playOutcomeVideo(videoNumber, () => {
                // Determine result/payout
                const payout = this.calculatePayout(this.selectedBet, actualNumber, betAmount);
                let didWin = false;
                if (payout > 0) {
                    const winAmount = payout;
                    this.balance += winAmount;
                    this.updateBalanceDisplay();
                    this.saveBalance();
                    this.showResult(`${actualNumber}\nYou won €${winAmount.toFixed(2)}!`, 'win');
                    didWin = true;
                } else {
                    this.showResult(`${actualNumber}\nYou lost.`, 'lose');
                }

                // Play numbered sound for the result (if available), then play 'won.mp3' or 'lost.mp3' after it ends
                try {
                    if (this.numberAudio) { try { this.numberAudio.pause(); this.numberAudio.currentTime = 0; } catch(e){} }
                    this.numberAudio = new Audio(`sounds/${actualNumber}.mp3`);

                    const playResultAudio = () => {
                        try {
                            const fname = didWin ? 'won.mp3' : 'lost.mp3';
                            if (this.resultAudio) { try { this.resultAudio.pause(); this.resultAudio.currentTime = 0; } catch(e){} }
                            this.resultAudio = new Audio(`sounds/${fname}`);
                            this.resultAudio.play().catch(() => {});
                        } catch (e) { /* ignore */ }
                    };

                    // If this was a win, start the win sound immediately so it plays on top of the number sound
                    if (didWin && this.winAudio) {
                        try { this.winAudio.currentTime = 0; this.winAudio.play().catch(() => {}); } catch(e) {}
                    }

                    const p = this.numberAudio.play();
                    if (p && typeof p.then === 'function') {
                        p.then(() => {
                            // play result when number audio ends
                            const onNumEnd = () => { try { playResultAudio(); } catch(e){}; this.numberAudio.removeEventListener('ended', onNumEnd); };
                            this.numberAudio.addEventListener('ended', onNumEnd);
                        }).catch(() => {
                            // couldn't play numbered sound -> play result immediately
                            playResultAudio();
                        });
                    } else {
                        // older browsers: rely on ended event
                        const onNumEnd = () => { try { playResultAudio(); } catch(e){}; this.numberAudio.removeEventListener('ended', onNumEnd); };
                        this.numberAudio.addEventListener('ended', onNumEnd);
                    }
                } catch (e) { /* ignore sound errors */ }

                // push to history
                this.lastSpins.unshift(actualNumber);
                if (this.lastSpins.length > 20) this.lastSpins.pop();
                this.updateLastSpinsUI();

                // highlight winning number briefly
                this.flashWinningCell(actualNumber);

                // reset spinning state - keep video at last frame (don't switch back to 0.png)
                this.spinning = false;
                this.spinButton.disabled = false;
            });
        }, 300);
    }

    playOutcomeVideo(num, onEnded) {
        // Hide idle image and show video
        if (this.idleImg) this.idleImg.style.display = 'none';
        this.videoEl.style.display = 'block';
        
        // Set video src and play. If file is missing (error), fallback to 11 for 31-case handled already
        const src = `videos/${num}.mp4`;
        this.videoEl.src = src;
        this.videoEl.load();

        const handleEnded = () => {
            // Keep video at last frame (pause at end) instead of switching back to image
            try {
                // Seek to the very end to ensure we're showing the final frame
                this.videoEl.currentTime = this.videoEl.duration;
                this.videoEl.pause();
            } catch (e) {
                // If seeking fails, video is already at end, just pause it
                this.videoEl.pause();
            }
            cleanup();
            if (onEnded) onEnded();
        };
        const handleError = () => {
            // Fallback: try 11.mp4 once
            if (num !== 11) {
                this.videoEl.src = `videos/11.mp4`;
                this.videoEl.load();
                this.videoEl.play().catch(()=>{});
                return;
            }
            cleanup();
            if (onEnded) onEnded();
        };

        const cleanup = () => {
            this.videoEl.removeEventListener('ended', handleEnded);
            this.videoEl.removeEventListener('error', handleError);
        };

        this.videoEl.addEventListener('ended', handleEnded);
        this.videoEl.addEventListener('error', handleError);

        // Play from start
        this.videoEl.currentTime = 0;
        this.videoEl.play().catch((err) => {
            // If browser blocks autoplay, try to resume on user interaction later. For now call onEnded to resolve flow.
            setTimeout(() => { try { this.videoEl.play(); } catch(e){} }, 200);
        });
    }

    calculatePayout(bet, outcome, betAmount) {
        // returns amount to credit (not net profit). For wins we credit betAmount * multiplier
        if (!bet) return 0;
        // number bet
        if (bet.type === 'number') {
            if (parseInt(bet.value,10) === outcome) return betAmount * 36; // as requested
            return 0;
        }
        // dozen bet (1 => 1-12, 2 => 13-24, 3 => 25-36) payout x3
        if (bet.type === 'dozen') {
            if (bet.value === 1 && outcome >=1 && outcome <=12) return betAmount * 3;
            if (bet.value === 2 && outcome >=13 && outcome <=24) return betAmount * 3;
            if (bet.value === 3 && outcome >=25 && outcome <=36) return betAmount * 3;
            return 0;
        }
        // half (1 => 1-18, 2 => 19-36) payout x2
        if (bet.type === 'half') {
            if (bet.value === 1 && outcome >=1 && outcome <=18) return betAmount * 2;
            if (bet.value === 2 && outcome >=19 && outcome <=36) return betAmount * 2;
            return 0;
        }
        // parity
        if (bet.type === 'parity') {
            if (outcome === 0) return 0;
            if (bet.value === 'even' && outcome % 2 === 0) return betAmount * 2;
            if (bet.value === 'odd' && outcome % 2 === 1) return betAmount * 2;
            return 0;
        }
        // color
        if (bet.type === 'color') {
            if (outcome === 0) return 0;
            if (bet.value === 'red' && this.redNumbers.has(outcome)) return betAmount * 2;
            if (bet.value === 'black' && !this.redNumbers.has(outcome)) return betAmount * 2;
            return 0;
        }
        return 0;
    }

    updateLastSpinsUI() {
        this.lastSpinsEl.innerHTML = '';
        for (const n of this.lastSpins) {
            const el = document.createElement('div');
            el.className = 'spin-ball ' + (n === 0 ? 'green' : (this.redNumbers.has(n) ? 'red' : 'black'));
            el.textContent = String(n);
            this.lastSpinsEl.appendChild(el);
        }
    }

    showResult(message, type = 'info') {
        // type can be 'win','lose','warn','jackpot','info'
        // Clear any existing hide timer
        if (this._resultTimer) {
            clearTimeout(this._resultTimer);
            this._resultTimer = null;
        }

        if (!message) {
            this.resultMessage.textContent = '';
            this.resultMessage.className = 'result-message';
            return;
        }

        this.resultMessage.textContent = message;
        this.resultMessage.className = `result-message show ${type}`;

        // Auto-hide non-jackpot messages after 3.5s
        if (type !== 'jackpot') {
            this._resultTimer = setTimeout(() => this.hideResult(), 3500);
        }
    }

    hideResult() {
        if (this._resultTimer) { clearTimeout(this._resultTimer); this._resultTimer = null; }
        this.resultMessage.className = 'result-message';
    }

    flashWinningCell(num) {
        // Highlight the corresponding bet cell briefly
        document.querySelectorAll('.bet-cell').forEach(el => {
            if (parseInt(el.dataset.number,10) === num) {
                el.classList.add('selected');
                setTimeout(() => el.classList.remove('selected'), 1200);
            }
        });
    }

    loadIdleFrame() {
        // Hide video and show idle image
        this.videoEl.style.display = 'none';
        if (this.idleImg) {
            this.idleImg.style.display = 'block';
            this.idleImg.src = 'images/0.png';
        }
    }
}

// Initialize the roulette game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new RouletteGame();
});
