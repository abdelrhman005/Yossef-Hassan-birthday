document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const mainContainer = document.getElementById('main-container');
    const envelopeWrapper = document.getElementById('envelope-wrapper');
    const heartSeal = document.getElementById('heart-seal');
    const musicToggle = document.getElementById('music-toggle');
    const floatingBg = document.getElementById('floating-bg');
    const canvas = document.getElementById('confetti-canvas');
    const ctx = canvas.getContext('2d');

    // --- State variables ---
    let isOpen = false;
    let isPlaying = false;
    let audioCtx = null;
    let nextNoteTimeout = null;
    let currentNoteIndex = 0;
    
    // Confetti state
    let confetti = [];
    const confettiColors = ['#FF4D6D', '#FFCAD4', '#F4ACB7', '#FFE5EC', '#FFB703', '#9A8C98', '#C97A8E'];

    // --- Music Box Notes (Frequencies in Hz) ---
    const freqs = {
        G4: 392.00,
        A4: 440.00,
        B4: 493.88,
        C5: 523.25,
        D5: 587.33,
        E5: 659.25,
        F5: 698.46,
        G5: 783.99
    };

    // Melody: Happy Birthday (Note, duration in beats. 1 beat = ~400ms)
    const melody = [
        { note: 'G4', dur: 0.75 }, { note: 'G4', dur: 0.25 }, { note: 'A4', dur: 1.0 }, { note: 'G4', dur: 1.0 }, { note: 'C5', dur: 1.0 }, { note: 'B4', dur: 2.0 },
        { note: 'G4', dur: 0.75 }, { note: 'G4', dur: 0.25 }, { note: 'A4', dur: 1.0 }, { note: 'G4', dur: 1.0 }, { note: 'D5', dur: 1.0 }, { note: 'C5', dur: 2.0 },
        { note: 'G4', dur: 0.75 }, { note: 'G4', dur: 0.25 }, { note: 'G5', dur: 1.0 }, { note: 'E5', dur: 1.0 }, { note: 'C5', dur: 1.0 }, { note: 'B4', dur: 1.0 }, { note: 'A4', dur: 2.0 },
        { note: 'F5', dur: 0.75 }, { note: 'F5', dur: 0.25 }, { note: 'E5', dur: 1.0 }, { note: 'C5', dur: 1.0 }, { note: 'D5', dur: 1.0 }, { note: 'C5', dur: 2.5 }
    ];

    const tempo = 420; // ms per beat

    // --- Canvas Resize Setup ---
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // --- Web Audio Synth logic ---
    function initAudio() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    function playNote(freq, duration) {
        if (!audioCtx) return;
        
        // Resume if suspended (browser security)
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        const filter = audioCtx.createBiquadFilter();

        osc.type = 'triangle'; // Sweet music-box like chime
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

        // Lowpass filter to make it sound warmer/softer
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1400, audioCtx.currentTime);

        // ADSR Envelope for a cute chime instrument
        const now = audioCtx.currentTime;
        gainNode.gain.setValueAtTime(0, now);
        // Attack
        gainNode.gain.linearRampToValueAtTime(0.4, now + 0.03);
        // Decay to Sustain
        gainNode.gain.exponentialRampToValueAtTime(0.12, now + 0.2);
        // Release
        gainNode.gain.setValueAtTime(0.12, now + duration - 0.08);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        // Connect nodes
        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        // Play and stop
        osc.start(now);
        osc.stop(now + duration);
    }

    function playMusicLoop() {
        if (!isPlaying) return;

        const current = melody[currentNoteIndex];
        const freq = freqs[current.note];
        const durationSec = (current.dur * tempo) / 1000;

        playNote(freq, durationSec);

        // Calculate next note schedule
        const nextTime = current.dur * tempo;
        currentNoteIndex = (currentNoteIndex + 1) % melody.length;

        nextNoteTimeout = setTimeout(playMusicLoop, nextTime);
    }

    function startMusic() {
        initAudio();
        isPlaying = true;
        musicToggle.classList.add('playing');
        playMusicLoop();
    }

    function stopMusic() {
        isPlaying = false;
        musicToggle.classList.remove('playing');
        if (nextNoteTimeout) {
            clearTimeout(nextNoteTimeout);
        }
    }

    // --- Interactive Music Toggle ---
    musicToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isPlaying) {
            stopMusic();
        } else {
            startMusic();
        }
    });

    // --- Confetti Particle System ---
    class ConfettiPiece {
        constructor(x, y, isBurst = false) {
            this.x = x;
            this.y = y;
            this.size = Math.random() * 8 + 6;
            this.color = confettiColors[Math.floor(Math.random() * confettiColors.length)];
            
            if (isBurst) {
                // Radial burst outwards and upwards
                const angle = Math.random() * Math.PI * 1.3 + Math.PI * 1.85; // angled upwards
                const speed = Math.random() * 12 + 6;
                this.vx = Math.cos(angle) * speed;
                this.vy = Math.sin(angle) * speed;
            } else {
                // Falling slowly from top
                this.vx = Math.random() * 2 - 1;
                this.vy = Math.random() * 3 + 2;
            }

            this.rotation = Math.random() * 360;
            this.rotationSpeed = Math.random() * 8 - 4;
            this.opacity = 1;
            this.gravity = 0.2;
            this.drag = 0.98;
        }

        update() {
            this.vy += this.gravity;
            this.vx *= this.drag;
            this.vy *= this.drag;
            this.x += this.vx;
            this.y += this.vy;
            this.rotation += this.rotationSpeed;
            
            // Fade out when reaching bottom of viewport
            if (this.y > canvas.height - 50) {
                this.opacity -= 0.02;
            }
        }

        draw() {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate((this.rotation * Math.PI) / 180);
            ctx.globalAlpha = this.opacity;
            ctx.fillStyle = this.color;
            ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
            ctx.restore();
        }
    }

    function triggerConfettiBurst() {
        const envelopeRect = envelopeWrapper.getBoundingClientRect();
        const burstX = envelopeRect.left + envelopeRect.width / 2;
        const burstY = envelopeRect.top + envelopeRect.height / 3;

        // Spawn a burst of confetti
        for (let i = 0; i < 120; i++) {
            confetti.push(new ConfettiPiece(burstX, burstY, true));
        }
    }

    function spawnFallingConfetti() {
        if (isOpen && Math.random() < 0.2) {
            confetti.push(new ConfettiPiece(Math.random() * canvas.width, -10, false));
        }
    }

    function animateConfetti() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        spawnFallingConfetti();

        confetti = confetti.filter(p => p.opacity > 0 && p.x > -50 && p.x < canvas.width + 50);

        confetti.forEach(p => {
            p.update();
            p.draw();
        });

        requestAnimationFrame(animateConfetti);
    }
    animateConfetti();

    // --- Background Floating Elements ---
    const svgs = {
        heart: `<svg viewBox="0 0 24 24" fill="#FF4D6D" width="24" height="24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`,
        star: `<svg viewBox="0 0 24 24" fill="#FFB703" width="24" height="24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`,
        balloon: `<svg viewBox="0 0 24 30" width="24" height="30">
            <ellipse cx="12" cy="11" rx="10" ry="11" fill="#F4ACB7"/>
            <polygon points="12,22 10,24 14,24" fill="#F4ACB7"/>
            <path d="M12,24 Q10,27 12,30" stroke="#FF4D6D" stroke-width="1.5" fill="none"/>
        </svg>`
    };

    function spawnFloatingItem() {
        const item = document.createElement('div');
        item.className = 'floating-item';
        
        const keys = Object.keys(svgs);
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        item.innerHTML = svgs[randomKey];

        // Random positioning & styles
        const size = Math.random() * 20 + 15; // 15px to 35px
        item.style.width = `${size}px`;
        item.style.height = `${size}px`;
        item.style.left = `${Math.random() * 100}vw`;
        
        // Random horizontal sway and speed
        const duration = Math.random() * 8 + 8; // 8s to 16s
        item.style.animationDuration = `${duration}s`;
        
        // Random opacity & balloon colors
        const svgElement = item.querySelector('svg');
        if (randomKey === 'balloon') {
            const colors = ['#FF4D6D', '#FFCAD4', '#F4ACB7', '#C97A8E', '#FFB703'];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            svgElement.querySelector('ellipse').setAttribute('fill', randomColor);
            svgElement.querySelector('polygon').setAttribute('fill', randomColor);
        }

        floatingBg.appendChild(item);

        // Remove element after animation finishes to keep DOM clean
        item.addEventListener('animationend', () => {
            item.remove();
        });
    }

    // Spawn initial elements and set interval
    for(let i = 0; i < 8; i++) {
        setTimeout(spawnFloatingItem, Math.random() * 6000);
    }
    setInterval(spawnFloatingItem, 1500);

    // --- Envelope Interaction ---
    function openEnvelope() {
        if (isOpen) return;

        isOpen = true;
        envelopeWrapper.classList.add('open');

        // Play birthday tune after brief delay to match slide-out animation
        setTimeout(() => {
            mainContainer.classList.add('open-card');
            startMusic();
            triggerConfettiBurst();
        }, 500);
    }

    envelopeWrapper.addEventListener('click', openEnvelope);
    heartSeal.addEventListener('click', (e) => {
        e.stopPropagation(); // prevent double triggers
        openEnvelope();
    });

    // --- Gift Open Interaction ---
    window.openGift = function(element) {
        // If it's already open, close it
        if (element.classList.contains('open-gift')) {
            element.classList.remove('open-gift');
            return;
        }

        // Close other gifts
        document.querySelectorAll('.gift-item').forEach(item => {
            item.classList.remove('open-gift');
        });

        // Open current gift
        element.classList.add('open-gift');

        // Play a little chime note for opening a gift!
        if (isPlaying && audioCtx) {
            playNote(880, 0.15); // A5 chime
            setTimeout(() => {
                if (isPlaying) playNote(1320, 0.25); // E6 chime
            }, 100);
        }
    };

    // Close gifts when clicking anywhere else
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.gift-item')) {
            document.querySelectorAll('.gift-item').forEach(item => {
                item.classList.remove('open-gift');
            });
        }
    });
});
