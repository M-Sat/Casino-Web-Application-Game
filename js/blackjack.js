// Blackjack Game JavaScript
class BlackjackGame {
    constructor() {
        this.balance = 0;
        this.betAmount = 0; // Current bet amount from chips
        this.currentBet = 0;
        this.dealerCards = [];
        this.playerCards = [];
        this.gameInProgress = false;
        // Whether the dealer's second (right) card is revealed to the player.
        // Remains false until the player stands (or doubles, which forces a stand).
        this.dealerCardRevealed = false;
        
        // Card suits and values
        this.suits = ['spades', 'hearts', 'clubs', 'diamonds'];
        this.cardValues = {
            'ace': 11, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
            'jack': 10, 'queen': 10, 'king': 10
        };
        this.deck = [];
    // Track whether the player has pressed HIT this round; double down not allowed after a hit
    this.playerHasHit = false;
        
        this.initializeElements();
        this.attachEventListeners();
        this.loadBalance();

        // Prevent back-button from reverting balance: keep sessionStorage authoritative and sync URL on pop
        window.addEventListener('popstate', () => this.syncBalanceFromSession());

        // Also handle pages restored from bfcache (pageshow)
        window.addEventListener('pageshow', (event) => this.syncBalanceFromSession());

        // Also re-sync on focus/visibility to catch any remaining cases
        window.addEventListener('focus', () => this.syncBalanceFromSession());
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') this.syncBalanceFromSession(); });

        // Preload shuffle sound (place shuffle.mp3 in the project root or images folder)
        try {
            this.shuffleAudio = new Audio('sounds/shuffle.mp3');
            this.shuffleAudio.load();
        } catch (e) {
            console.log('Shuffle audio not available:', e);
            this.shuffleAudio = null;
        }
        // Preload win/follow-up/loss/bj sounds
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
            this.bjAudio = new Audio('sounds/bj.mp3');
            this.bjAudio.load();
        } catch (e) {
            console.log('BJ audio not available:', e);
            this.bjAudio = null;
        }
        this.createDeck();
    }

    initializeElements() {
        this.balanceDisplay = document.getElementById('blackjack-balance');
        this.betAmountDisplay = document.getElementById('bet-amount-display');
        this.clearBetButton = document.getElementById('clear-bet-button');
        this.dealButton = document.getElementById('deal-button');
        this.backButton = document.getElementById('back-to-main');
        this.dealerCardsContainer = document.getElementById('dealer-cards');
        this.playerCardsContainer = document.getElementById('player-cards');
        this.dealerValueDisplay = document.getElementById('dealer-value');
        this.playerValueDisplay = document.getElementById('player-value');
        this.hitButton = document.getElementById('hit-button');
        this.standButton = document.getElementById('stand-button');
        this.doubleButton = document.getElementById('double-button');
        this.resultMessage = document.getElementById('result-message');
        
        // Initialize bet amount display
        this.updateBetAmountDisplay();
    }

    attachEventListeners() {
        this.dealButton.addEventListener('click', () => this.dealCards());
        this.hitButton.addEventListener('click', () => this.hit());
        this.standButton.addEventListener('click', () => this.stand());
        this.doubleButton.addEventListener('click', () => this.double());
        this.backButton.addEventListener('click', () => this.goBack());
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
        const newUrl = `blackjack.html?balance=${this.balance}`;
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

    createDeck() {
        this.deck = [];
        for (const suit of this.suits) {
            for (const [card, value] of Object.entries(this.cardValues)) {
                this.deck.push({ 
                    card: card, 
                    suit: suit, 
                    value: value,
                    imageName: `${card}_of_${suit}.png`
                });
            }
        }
        this.shuffleDeck();
    }

    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    dealCards() {
        if (this.gameInProgress) return;

        // Play shuffle sound at start of dealing
        try {
            if (this.shuffleAudio) {
                // rewind and play. Some browsers require user gesture which we have (click)
                this.shuffleAudio.currentTime = 0;
                this.shuffleAudio.play().catch(() => console.log('Shuffle playback prevented'));
            }
        } catch (err) {
            console.log('Shuffle sound error', err);
        }

        if (this.betAmount <= 0) {
            this.showMessage('Please add chips to your bet!', 'lose');
            return;
        }

        if (this.betAmount > this.balance) {
            this.showMessage('Insufficient balance!', 'lose');
            return;
        }

        // Store bet amount for this game
        const betAmount = this.betAmount;

        // Start new game
        this.currentBet = betAmount;
        this.balance -= betAmount;
        this.updateBalanceDisplay();
        this.saveBalance();
        
        // Clear bet after deducting
        this.clearBet();

    // Clear previous game
        this.clearCards();
        this.hideMessage();

    // Reset hit flag for new round
    this.playerHasHit = false;

        // Create new deck if needed
        if (this.deck.length < 10) {
            this.createDeck();
        }

        // Deal initial cards
        this.dealerCards = [];
        this.playerCards = [];
    // Keep dealer's second card hidden until player stands
    this.dealerCardRevealed = false;
        
        // Deal 2 cards to player and dealer
        this.playerCards.push(this.dealCard());
        this.dealerCards.push(this.dealCard());
        this.playerCards.push(this.dealCard());
        this.dealerCards.push(this.dealCard());

        // Update display
        this.updateCardDisplay();
        this.updateValueDisplay();

        // Check for blackjack
        const playerValue = this.calculateHandValue(this.playerCards);
        const dealerValue = this.calculateHandValue(this.dealerCards);

        // Check for immediate blackjack scenarios
        if (playerValue === 21 && dealerValue === 21) {
            // Both have blackjack - push
            this.balance += this.currentBet; // Return original bet
            this.endGame('tie', 'Both have Blackjack! Tie!');
        } else if (playerValue === 21) {
            // Player has blackjack, dealer doesn't
            this.balance += this.currentBet * 2.5; // Blackjack pays 3:2 (1.5x + original bet)
            // Sounds are handled centrally in endGame (player blackjack will trigger bj sequence)
            this.endGame('win', 'Blackjack! You won!');
        } else if (dealerValue === 21) {
            // Dealer has blackjack, player doesn't
            this.endGame('lose', 'Dealer has Blackjack! You lost.');
            // No payout - player loses bet
        } else {
            // No blackjacks - continue playing
            this.gameInProgress = true;
            this.updateButtonStates();
        }
    }

    dealCard() {
        if (this.deck.length === 0) {
            this.createDeck();
        }
        return this.deck.pop();
    }

    hit() {
        if (!this.gameInProgress) return;

        // Once player hits, double down is no longer allowed for this hand
        this.playerHasHit = true;
        this.updateButtonStates();

        this.playerCards.push(this.dealCard());
        this.updateCardDisplay();
        this.updateValueDisplay();

        const playerValue = this.calculateHandValue(this.playerCards);
        
        if (playerValue > 21) {
            // Player busts - immediate loss
            this.endGame('lose', 'Bust! You lost. You went over 21.');
        } else if (playerValue === 21) {
            // Player has 21 - can still stand or let dealer play
            // Don't auto-stand, let player decide or dealer will play after stand
        }
    }

    stand() {
        if (!this.gameInProgress) return;

        this.gameInProgress = false;
        // Reveal dealer's hidden card when player stands
        this.dealerCardRevealed = true;
        this.updateCardDisplay();
        
        // Dealer plays
        this.dealerPlay();
        
        this.updateButtonStates();
    }

    double() {
        if (!this.gameInProgress || this.balance < this.currentBet) return;

        // Double down: increase bet by 100% and take exactly one more card
        this.balance -= this.currentBet;
        this.currentBet *= 2;
        this.updateBalanceDisplay();
        this.saveBalance();

        // Take exactly one more card
        this.playerCards.push(this.dealCard());
        this.updateCardDisplay();
        this.updateValueDisplay();

        const playerValue = this.calculateHandValue(this.playerCards);
        
        if (playerValue > 21) {
            // Player busts after doubling - immediate loss
            this.endGame('lose', 'Bust after doubling. You lost.');
        } else {
            // Player must stand after doubling - dealer plays
            this.gameInProgress = false;
            // Doubling forces a stand: reveal dealer card and let dealer play
            this.dealerCardRevealed = true;
            this.updateButtonStates();
            this.dealerPlay();
        }
    }

    dealerPlay() {
        // Dealer reveals hidden card first
        this.updateCardDisplay();
        this.updateValueDisplay();
        
        let dealerValue = this.calculateHandValue(this.dealerCards);
        
        // Dealer plays: hit until 17 or higher
        // Note: This implementation assumes dealer hits on soft 17
        while (dealerValue < 17) {
            this.dealerCards.push(this.dealCard());
            dealerValue = this.calculateHandValue(this.dealerCards);
            this.updateCardDisplay();
            this.updateValueDisplay();
        }
        
        this.determineWinner();
    }

    determineWinner() {
        const playerValue = this.calculateHandValue(this.playerCards);
        const dealerValue = this.calculateHandValue(this.dealerCards);
        const playerHasBlackjack = this.playerCards.length === 2 && playerValue === 21;
        const dealerHasBlackjack = this.dealerCards.length === 2 && dealerValue === 21;

        if (dealerValue > 21) {
            // Dealer busts - player wins (unless player also busted, which should have been handled earlier)
            this.balance += this.currentBet * 2; // Even money payout
            // Sounds handled centrally in endGame
            this.endGame('win', 'Dealer busts! You won!');
        } else if (playerHasBlackjack && !dealerHasBlackjack) {
            // Player has blackjack, dealer doesn't
            this.balance += this.currentBet * 2.5; // Blackjack pays 3:2
            // Sounds handled centrally in endGame (bj sequence)
            this.endGame('win', 'Blackjack! You won!');
        } else if (dealerHasBlackjack && !playerHasBlackjack) {
            // Dealer has blackjack, player doesn't
            this.endGame('lose', 'Dealer has Blackjack. You lost.');
            // No payout
        } else if (playerHasBlackjack && dealerHasBlackjack) {
            // Both have blackjack
            this.balance += this.currentBet; // Return original bet
            this.endGame('tie', 'Both have Blackjack! Tie!');
        } else if (playerValue > dealerValue) {
            // Player has higher value (but no blackjack)
            this.balance += this.currentBet * 2; // Even money payout
            // Sounds handled centrally in endGame
            this.endGame('win', 'You won!');
        } else if (dealerValue > playerValue) {
            // Dealer has higher value
            this.endGame('lose', 'You lost.');
            // No payout
        } else {
            // Tie (push)
            this.balance += this.currentBet; // Return original bet
            this.endGame('tie', 'Tie!');
        }
    }

    endGame(result, message) {
        this.gameInProgress = false;
        // reset hit flag at end of round
        this.playerHasHit = false;
        // Reveal dealer's second card when the game ends so the player can see the dealer's hand
        this.dealerCardRevealed = true;
        // Immediately update UI so the dealer's hidden card and value are visible for auto-resolved outcomes
        this.updateCardDisplay();
        this.updateValueDisplay();
        this.updateButtonStates();
        this.showMessage(message, result);
        this.updateBalanceDisplay();
        this.saveBalance();

        // Play audio feedback
        if (result === 'win') {
            const playerHasBlackjack = this.playerCards.length === 2 && this.calculateHandValue(this.playerCards) === 21;
            if (playerHasBlackjack) {
                this.playBjSequence();
            } else {
                this.playWinImmediate();
            }
        } else if (result === 'lose') {
            this.playLostImmediate();
        }
    }

    calculateHandValue(cards) {
        let value = 0;
        let aces = 0;

        for (const card of cards) {
            if (card.card === 'ace') {
                aces++;
                value += 11; // Count ace as 11 initially
            } else {
                value += card.value;
            }
        }

        // Adjust for aces: if total > 21, count ace as 1 instead of 11
        while (value > 21 && aces > 0) {
            value -= 10; // Convert ace from 11 to 1
            aces--;
        }

        return value;
    }

    updateCardDisplay() {
        // Clear existing cards
        this.dealerCardsContainer.innerHTML = '';
        this.playerCardsContainer.innerHTML = '';

        // Display dealer cards
        for (let i = 0; i < this.dealerCards.length; i++) {
            const cardElement = document.createElement('div');
            cardElement.className = 'card';
            // The dealer's second card (index 1) remains the placeholder image until
            // `this.dealerCardRevealed` is true (set when player stands or doubles).
            if (i === 1 && !this.dealerCardRevealed) {
                cardElement.style.backgroundImage = 'url("images/cards/dealer.png")';
            } else {
                // Show actual card
                const card = this.dealerCards[i];
                cardElement.style.backgroundImage = `url("images/cards/${card.imageName}")`;
            }
            
            this.dealerCardsContainer.appendChild(cardElement);
        }

        // Display player cards
        for (const card of this.playerCards) {
            const cardElement = document.createElement('div');
            cardElement.className = 'card';
            cardElement.style.backgroundImage = `url("images/cards/${card.imageName}")`;
            this.playerCardsContainer.appendChild(cardElement);
        }
    }

    updateValueDisplay() {
        const dealerValue = this.calculateHandValue(this.dealerCards);
        const playerValue = this.calculateHandValue(this.playerCards);
        // Show dealer full value only when dealer's card is revealed (player stood or doubled).
        // Otherwise show only the first card's value.
        if (this.dealerCardRevealed) {
            this.dealerValueDisplay.textContent = `Value: ${dealerValue}`;
        } else {
            const firstCardValue = this.dealerCards.length > 0 ? this.dealerCards[0].value : 0;
            this.dealerValueDisplay.textContent = `Value: ${firstCardValue}`;
        }
        
        this.playerValueDisplay.textContent = `Value: ${playerValue}`;
    }

    updateButtonStates() {
        if (!this.gameInProgress) {
            this.dealButton.disabled = false;
            this.hitButton.disabled = true;
            this.standButton.disabled = true;
            this.doubleButton.disabled = true;
            // Enable chips when game is not in progress
            document.querySelectorAll('.chip').forEach(chip => chip.style.pointerEvents = 'auto');
            this.clearBetButton.disabled = false;
        } else {
            this.dealButton.disabled = true;
            this.hitButton.disabled = false;
            this.standButton.disabled = false;
            // Double allowed only if player hasn't yet hit and they have sufficient balance
            this.doubleButton.disabled = this.playerHasHit || (this.balance < this.currentBet);
            // Disable chips when game is in progress
            document.querySelectorAll('.chip').forEach(chip => chip.style.pointerEvents = 'none');
            this.clearBetButton.disabled = true;
        }
    }

    clearCards() {
        this.dealerCardsContainer.innerHTML = '';
        this.playerCardsContainer.innerHTML = '';
        this.dealerValueDisplay.textContent = 'Value: 0';
        this.playerValueDisplay.textContent = 'Value: 0';
    }

    showMessage(message, type) {
        this.resultMessage.textContent = message;
        this.resultMessage.className = `result-message show ${type}`;
    }

    hideMessage() {
        this.resultMessage.className = 'result-message';
    }

    // Audio helpers
    playWinImmediate() {
        try { if (this.winAudio) { this.winAudio.currentTime = 0; this.winAudio.play().catch(() => {}); } } catch (e) {}
        try { if (this.wonAudio) { this.wonAudio.currentTime = 0; this.wonAudio.play().catch(() => {}); } } catch (e) {}
    }

    playBjSequence() {
        // Play win and bj on top, then play won when bj finishes
        try { if (this.winAudio) { this.winAudio.currentTime = 0; this.winAudio.play().catch(() => {}); } } catch (e) {}
        try {
            const bj = new Audio('sounds/bj.mp3');
            const onBjEnd = () => {
                try { if (this.wonAudio) { this.wonAudio.currentTime = 0; this.wonAudio.play().catch(() => {}); } } catch(e) {}
                bj.removeEventListener('ended', onBjEnd);
            };
            bj.addEventListener('ended', onBjEnd);
            bj.play().catch(() => {});
        } catch (e) {}
    }

    playLostImmediate() {
        try { if (this.lostAudio) { this.lostAudio.currentTime = 0; this.lostAudio.play().catch(() => {}); } } catch (e) {}
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

    goBack() {
        // Navigate back to main casino with updated balance
        const mainUrl = `index.html?balance=${this.balance}`;
        window.location.href = mainUrl;
    }
}

// Initialize the blackjack game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new BlackjackGame();
});
