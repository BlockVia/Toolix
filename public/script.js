/**
 * ╔══════════════════════════════════════════════════╗
 * ║       🌐  TOOLIX - Frontend Script              ║
 * ╚══════════════════════════════════════════════════╝
 */

// ── Stripe Checkout ──
async function checkout(plan) {
    const overlay = document.getElementById('loadingOverlay');
    overlay.classList.add('active');

    try {
        const response = await fetch('/api/create-checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plan })
        });

        const data = await response.json();

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

    // Add the float animation
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
document.addEventListener('DOMContentLoaded', createParticles);
