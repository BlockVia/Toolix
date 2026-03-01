/**
 * ╔══════════════════════════════════════════════════╗
 * ║       🌐  TOOLIX - Frontend Script              ║
 * ║       Account System + Stripe Checkout           ║
 * ╚══════════════════════════════════════════════════╝
 */

// ── Auth Helpers ──
function getToken() {
    return localStorage.getItem('toolix_token');
}

function getUser() {
    try {
        return JSON.parse(localStorage.getItem('toolix_user'));
    } catch { return null; }
}

function isLoggedIn() {
    return !!getToken();
}

function logout() {
    localStorage.removeItem('toolix_token');
    localStorage.removeItem('toolix_user');
    window.location.reload();
}

// ── Update Navbar Based on Auth State ──
function updateNavbar() {
    const navCta = document.querySelector('.nav-cta');
    if (!navCta) return;

    if (isLoggedIn()) {
        const user = getUser();
        navCta.textContent = '👤 ' + (user?.username || 'Account');
        navCta.href = 'account.html';
    } else {
        navCta.textContent = 'Login';
        navCta.href = 'login.html';
    }
}

// Call immediately on script load
document.addEventListener('DOMContentLoaded', updateNavbar);


// ── Stripe Checkout (requires login) ──
async function checkout(plan) {
    if (!isLoggedIn()) {
        window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname + '#pricing');
        return;
    }

    const overlay = document.getElementById('loadingOverlay');
    overlay.classList.add('active');

    try {
        const response = await fetch('/api/create-checkout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + getToken()
            },
            body: JSON.stringify({ plan })
        });

        const data = await response.json();

        if (response.status === 401) {
            localStorage.removeItem('toolix_token');
            localStorage.removeItem('toolix_user');
            overlay.classList.remove('active');
            window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname + '#pricing');
            return;
        }

        if (data.url) {
            window.location.href = data.url;
        } else {
            alert('Error: ' + (data.error || 'Could not create checkout session'));
            overlay.classList.remove('active');
        }
    } catch (error) {
        alert('Connection error. Please try again.');
        overlay.classList.remove('active');
    }
}

// ── Hero Particles ──
function createParticles() {
    const container = document.getElementById('particles');
    if (!container) return;

    for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.style.cssText = `
            position: absolute;
            width: ${Math.random() * 3 + 1}px;
            height: ${Math.random() * 3 + 1}px;
            background: rgba(255, 45, 85, ${Math.random() * 0.4 + 0.1});
            border-radius: 50%;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            animation: float ${Math.random() * 8 + 4}s ease-in-out infinite;
            animation-delay: ${Math.random() * 4}s;
        `;
        container.appendChild(particle);
    }

    const style = document.createElement('style');
    style.textContent = `
        @keyframes float {
            0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
            25% { transform: translateY(-30px) translateX(15px); opacity: 0.8; }
            50% { transform: translateY(-60px) translateX(-10px); opacity: 0.5; }
            75% { transform: translateY(-30px) translateX(20px); opacity: 0.7; }
        }
    `;
    document.head.appendChild(style);
}

// ── Smooth Scroll ──
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// ── Navbar Scroll Effect ──
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.style.borderBottomColor = 'rgba(255, 45, 85, 0.2)';
    } else {
        navbar.style.borderBottomColor = '';
    }
});

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
    createParticles();
    updateNavbar();
});
