// Casino App JavaScript
class CasinoApp {
    constructor() {
        this.balance = 0;
        this.initializeElements();
        this.attachEventListeners();
        this.loadBalanceFromUrl();
        this.updateBalanceDisplay();

        // Ensure that back/forward navigation cannot revert the displayed balance
        window.addEventListener('popstate', () => {
            const stored = sessionStorage.getItem('casinoBalance');
            if (stored !== null) {
                this.balance = parseFloat(stored);
                this.updateBalanceDisplay();
                const newUrl = `${window.location.pathname}?balance=${this.balance}`;
                window.history.replaceState({}, '', newUrl);
            }
        });

        // Handle pages restored from bfcache (pageshow with persisted=true) which may show stale UI
        window.addEventListener('pageshow', () => {
            this.syncBalanceFromSession();
        });

        // Also ensure we re-sync when tab/window gains focus or becomes visible
        window.addEventListener('focus', () => this.syncBalanceFromSession());
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') this.syncBalanceFromSession(); });
    }


    initializeElements() {
        this.depositAmountInput = document.getElementById('deposit-amount');
        this.depositButton = document.getElementById('deposit-btn');
        this.balanceDisplay = document.getElementById('balance-display');
        this.slotsButton = document.getElementById('slots-btn');
        this.blackjackButton = document.getElementById('blackjack-btn');
        this.rouletteButton = document.getElementById('roulette-btn');
    }

    attachEventListeners() {
        // Deposit functionality
        this.depositButton.addEventListener('click', () => this.handleDeposit());
        this.depositAmountInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleDeposit();
            }
        });

        // Game button functionality
        this.slotsButton.addEventListener('click', () => this.navigateToGame('slots'));
        this.blackjackButton.addEventListener('click', () => this.navigateToGame('blackjack'));
        this.rouletteButton.addEventListener('click', () => this.navigateToGame('roulette'));

        // Input validation
        this.depositAmountInput.addEventListener('input', () => this.validateDepositInput());
    }

    loadBalanceFromUrl() {
        // Get balance from URL parameter (when returning from slots game)
        const urlParams = new URLSearchParams(window.location.search);
        const balanceParam = urlParams.get('balance');
        const stored = sessionStorage.getItem('casinoBalance');
        if (stored !== null) {
            // Use stored balance as authoritative and sync URL
            this.balance = parseFloat(stored);
            const newUrl = `${window.location.pathname}?balance=${this.balance}`;
            window.history.replaceState({}, '', newUrl);
        } else if (balanceParam) {
            this.balance = parseFloat(balanceParam);
            // Persist so back/forward cannot revert it
            sessionStorage.setItem('casinoBalance', String(this.balance));
        }
    }

    // Sync from sessionStorage (used by pageshow/popstate/focus/visibility)
    syncBalanceFromSession() {
        const stored = sessionStorage.getItem('casinoBalance');
        if (stored !== null) {
            const newBal = parseFloat(stored);
            // Always set UI from sessionStorage to avoid stale bfcache snapshots
            const oldBal = this.balance;
            this.balance = newBal;
            this.updateBalanceDisplay();
            const newUrl = `${window.location.pathname}?balance=${this.balance}`;
            try { window.history.replaceState({}, '', newUrl); } catch (e) {}
            // If balance changed, show a subtle sync notice
            if (oldBal !== newBal) {
                this.showMessage('Balance synced', 'info');
            }
        } else {
            // No stored balance — ensure UI isn't showing stale amount
            if (this.balance !== 0) {
                this.balance = 0;
                this.updateBalanceDisplay();
                try { window.history.replaceState({}, '', window.location.pathname); } catch (e) {}
                this.showMessage('Balance synced', 'info');
            }
        }
    }


    validateDepositInput() {
        const value = parseFloat(this.depositAmountInput.value);
        if (value < 0) {
            this.depositAmountInput.value = '';
        }
    }

    handleDeposit() {
        const amount = parseFloat(this.depositAmountInput.value);
        
        if (isNaN(amount) || amount <= 0) {
            this.showMessage('Please enter a valid amount greater than 0', 'error');
            return;
        }

        if (amount > 10000) {
            this.showMessage('Maximum deposit amount is €10,000', 'error');
            return;
        }

        this.balance += amount;
        // Persist new balance so history navigation cannot revert it
        sessionStorage.setItem('casinoBalance', String(this.balance));
        this.updateBalanceDisplay();
        this.depositAmountInput.value = '';
        
        this.showMessage(`Successfully deposited €${amount.toFixed(2)}!`, 'success');
        
        // Add visual feedback
        this.depositButton.style.background = 'linear-gradient(45deg, #27ae60, #2ecc71)';
        setTimeout(() => {
            this.depositButton.style.background = 'linear-gradient(45deg, #ffd700, #ffed4e)';
        }, 1000);
    }

    updateBalanceDisplay() {
        this.balanceDisplay.textContent = `€${this.balance.toFixed(2)}`;
        
        // Add animation to balance update
        this.balanceDisplay.style.transform = 'scale(1.1)';
        this.balanceDisplay.style.color = '#ffed4e';
        setTimeout(() => {
            this.balanceDisplay.style.transform = 'scale(1)';
            this.balanceDisplay.style.color = '#ffd700';
        }, 300);
    }

    navigateToGame(gameType) {
        if (this.balance <= 0) {
            this.showMessage('Please deposit some money before playing!', 'error');
            return;
        }

        // Navigate to the specific game
        if (gameType === 'slots') {
            // Open slots in same window with balance as URL parameter
            const slotsUrl = `slots.html?balance=${this.balance}`;
            window.location.href = slotsUrl;
        } else if (gameType === 'blackjack') {
            // Open blackjack in same window with balance as URL parameter
            const blackjackUrl = `blackjack.html?balance=${this.balance}`;
            window.location.href = blackjackUrl;
        } else if (gameType === 'roulette') {
            // Open roulette in same window with balance as URL parameter
            const rouletteUrl = `roulette.html?balance=${this.balance}`;
            window.location.href = rouletteUrl;
        } else {
            // Add loading animation for other games
            const button = document.getElementById(`${gameType}-btn`);
            const originalContent = button.innerHTML;
            button.innerHTML = '<div class="game-icon">⏳</div><div class="game-name">Loading...</div>';
            button.disabled = true;

            setTimeout(() => {
                this.showMessage(`${gameType.charAt(0).toUpperCase() + gameType.slice(1)} game coming soon!`, 'info');
                button.innerHTML = originalContent;
                button.disabled = false;
            }, 1500);
        }
    }

    showMessage(message, type = 'info') {
        // Remove existing message if any
        const existingMessage = document.querySelector('.message');
        if (existingMessage) {
            existingMessage.remove();
        }

        // Create message element
        const messageElement = document.createElement('div');
        messageElement.className = `message message-${type}`;
        messageElement.textContent = message;
        
        // Style the message
        messageElement.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            font-weight: bold;
            z-index: 1000;
            animation: slideIn 0.3s ease;
            max-width: 300px;
            word-wrap: break-word;
        `;

        // Set colors based on message type
        switch (type) {
            case 'success':
                messageElement.style.background = 'linear-gradient(45deg, #27ae60, #2ecc71)';
                messageElement.style.color = '#ffffff';
                break;
            case 'error':
                messageElement.style.background = 'linear-gradient(45deg, #e74c3c, #c0392b)';
                messageElement.style.color = '#ffffff';
                break;
            case 'info':
                messageElement.style.background = 'linear-gradient(45deg, #3498db, #2980b9)';
                messageElement.style.color = '#ffffff';
                break;
        }

        // Add CSS animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(messageElement);

        // Auto remove message after 3 seconds
        setTimeout(() => {
            messageElement.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (messageElement.parentNode) {
                    messageElement.remove();
                }
            }, 300);
        }, 3000);
    }
}

// Initialize the casino app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new CasinoApp();
});

// Add some visual effects
document.addEventListener('DOMContentLoaded', () => {
    // Add floating particles effect
    createFloatingParticles();
});

function createFloatingParticles() {
    const particleContainer = document.createElement('div');
    particleContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1;
        overflow: hidden;
    `;
    document.body.appendChild(particleContainer);

    for (let i = 0; i < 20; i++) {
        createParticle(particleContainer);
    }
}

function createParticle(container) {
    const particle = document.createElement('div');
    particle.style.cssText = `
        position: absolute;
        width: 4px;
        height: 4px;
        background: #ffd700;
        border-radius: 50%;
        opacity: 0.6;
        animation: float ${Math.random() * 10 + 10}s linear infinite;
    `;
    
    particle.style.left = Math.random() * 100 + '%';
    particle.style.animationDelay = Math.random() * 10 + 's';
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes float {
            0% { transform: translateY(100vh) rotate(0deg); opacity: 0; }
            10% { opacity: 0.6; }
            90% { opacity: 0.6; }
            100% { transform: translateY(-100px) rotate(360deg); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
    
    container.appendChild(particle);
}
