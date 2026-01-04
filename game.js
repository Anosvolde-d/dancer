/**
 * RHYTHM DODGER - VOID KNIGHT EDITION
 *
 * A 2.2-style platformer rhythm game.
 */

// ==================== PLAYER IDENTITY SYSTEM ====================

/**
 * Generates a UUID v4 for player identification.
 * @returns {string} A unique UUID
 */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Gets or creates a persistent player ID stored in localStorage.
 * This ID is used to track the player across sessions, NOT IP address.
 * @returns {string} The player's unique ID
 */
function getPlayerId() {
    let playerId = localStorage.getItem('rhythm_dodger_player_id');
    if (!playerId) {
        playerId = generateUUID();
        localStorage.setItem('rhythm_dodger_player_id', playerId);
        console.log('PlayerIdentity: Created new player ID');
    }
    return playerId;
}

/**
 * Gets the player's saved display name (not used for identification).
 * @returns {string|null} The saved display name or null
 */
function getSavedDisplayName() {
    return localStorage.getItem('rhythm_dodger_display_name');
}

/**
 * Saves the player's display name locally.
 * @param {string} name - The display name to save
 */
function saveDisplayName(name) {
    if (name && name.trim()) {
        localStorage.setItem('rhythm_dodger_display_name', name.trim());
    }
}

/**
 * Gets the player's saved Discord name.
 * @returns {string|null} The saved Discord name or null
 */
function getSavedDiscord() {
    return localStorage.getItem('rhythm_dodger_discord');
}

/**
 * Saves the player's Discord name locally.
 * @param {string} discord - The Discord name to save
 */
function saveDiscord(discord) {
    localStorage.setItem('rhythm_dodger_discord', discord || '');
}

// ==================== SPRITE SYSTEM ====================

// Sprite color palette for flying cubes
const SPRITE_COLORS = {
    0: "transparent",
    1: "#FFFF00",
    2: "#6F73FF",
    3: "#A6A9FF",
    4: "#C9CBFF",
    5: "#FFFFFF"
};

// Flying cube sprite data (16x16 pixel art)
const FLYING_SPRITE = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 3, 3, 3, 3, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 2, 3, 3, 3, 3, 3, 3, 1, 1, 1, 1, 1],
    [1, 1, 1, 2, 2, 3, 4, 4, 4, 3, 3, 3, 1, 1, 1, 1],
    [1, 1, 2, 2, 3, 4, 4, 4, 4, 4, 3, 3, 3, 1, 1, 1],
    [1, 2, 2, 3, 3, 4, 5, 5, 4, 4, 4, 3, 3, 3, 1, 1],
    [2, 2, 3, 3, 4, 4, 5, 5, 4, 4, 4, 4, 3, 3, 3, 1],
    [2, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 3, 3, 1],
    [1, 2, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 3, 3, 1, 1],
    [1, 1, 2, 3, 3, 4, 4, 4, 4, 4, 4, 3, 3, 1, 1, 1],
    [1, 1, 1, 2, 3, 3, 4, 4, 4, 4, 3, 3, 1, 1, 1, 1],
    [1, 1, 1, 1, 2, 3, 3, 3, 3, 3, 3, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

// Draw sprite function with pixel art rendering
function drawSprite(ctx, sprite, x, y, pixelSize, colors) {
    for (let row = 0; row < sprite.length; row++) {
        for (let col = 0; col < sprite[row].length; col++) {
            const color = colors[sprite[row][col]];
            if (color !== "transparent") {
                ctx.fillStyle = color;
                ctx.fillRect(
                    x + col * pixelSize,
                    y + row * pixelSize,
                    pixelSize,
                    pixelSize
                );
            }
        }
    }
}

// ==================== UNCANNY EYES EFFECT ====================

/**
 * UncannyEyes - Creepy eyes that appear in Stage 1 and track the player.
 * Opens at the start, tracks player for 10 seconds, then closes with a red flash.
 */
class UncannyEyes {
    constructor(game) {
        this.game = game;
        this.active = false;
        this.startTime = 0;
        this.duration = 10000; // 10 seconds
        
        // Eye style configuration
        this.style = {
            rx: 120, // Horizontal radius (smaller for game)
            ry: 65,  // Vertical radius
            almondPoint: 0.19,
            irisR: 30,
            pupilH: 42,
            pupilW: 10,
            maxOffset: 32
        };
        
        // Two eyes state
        this.eyes = [
            { id: 0, c: { x: 0, y: 0 }, pupil: { x: 0, y: 0 }, look: { x: 0, y: 0 }, veins: [] },
            { id: 1, c: { x: 0, y: 0 }, pupil: { x: 0, y: 0 }, look: { x: 0, y: 0 }, veins: [] }
        ];
        
        // Animation state
        this.openProgress = 0;
        this.closeProgress = 0;
        this.isClosing = false;
        this.flashAlpha = 0;
        this.flashPeaked = false;
        this.time = 0;
        
        // Build veins for each eye
        this.buildVeinsFor(this.eyes[0], 1337);
        this.buildVeinsFor(this.eyes[1], 7331);
    }
    
    /**
     * Starts the uncanny eyes effect.
     */
    start() {
        this.active = true;
        this.startTime = Date.now();
        this.openProgress = 0;
        this.closeProgress = 0;
        this.isClosing = false;
        this.flashAlpha = 0;
        this.flashPeaked = false;
        this.time = 0;
        
        // Position eyes at top-middle of screen
        this.layoutEyes();
    }
    
    /**
     * Positions the eyes at the top-middle of the screen.
     */
    layoutEyes() {
        const cx = window.innerWidth / 2;
        const cy = 140; // Top area
        const spacing = Math.min(320, Math.max(220, window.innerWidth * 0.22));
        
        this.eyes[0].c.x = cx - spacing / 2;
        this.eyes[0].c.y = cy;
        this.eyes[1].c.x = cx + spacing / 2;
        this.eyes[1].c.y = cy;
        
        // Initialize look positions to player
        if (this.game.player) {
            for (const e of this.eyes) {
                e.look.x = this.game.player.x;
                e.look.y = this.game.player.y;
            }
        }
    }
    
    /**
     * Seeded random number generator.
     */
    seededRand(seed) {
        let s = seed >>> 0;
        return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
    }
    
    /**
     * Builds vein paths for an eye.
     */
    buildVeinsFor(eyeObj, seed) {
        const r = this.seededRand(seed);
        eyeObj.veins.length = 0;
        for (let i = 0; i < 12; i++) {
            const a = r() * Math.PI * 2;
            const rr = (0.18 + r() * 0.75);
            const start = {
                x: Math.cos(a) * this.style.rx * rr,
                y: Math.sin(a) * this.style.ry * rr
            };
            const segs = 5 + Math.floor(r() * 7);
            const path = [start];
            let x = start.x, y = start.y;
            let ang = a + (r() - 0.5) * 0.9;
            for (let s = 0; s < segs; s++) {
                const step = 7 + r() * 14;
                ang += (r() - 0.5) * 0.78;
                x += Math.cos(ang) * step;
                y += Math.sin(ang) * step;
                path.push({ x, y });
            }
            eyeObj.veins.push(path);
        }
    }
    
    /**
     * Limits offset to ellipse bounds.
     */
    limitToEllipse(dx, dy, rx, ry) {
        const nx = dx / rx;
        const ny = dy / ry;
        const m = Math.hypot(nx, ny);
        if (m <= 1) return { dx, dy };
        return { dx: dx / m, dy: dy / m };
    }
    
    /**
     * Clamps a value between min and max.
     */
    clamp(v, a, b) {
        return Math.max(a, Math.min(b, v));
    }
    
    /**
     * Linear interpolation.
     */
    lerp(a, b, t) {
        return a + (b - a) * t;
    }
    
    /**
     * Ease out cubic.
     */
    easeOutCubic(x) {
        return 1 - Math.pow(1 - x, 3);
    }
    
    /**
     * Ease in cubic.
     */
    easeInCubic(x) {
        return x * x * x;
    }
    
    /**
     * Updates the eyes state.
     */
    update(dt) {
        if (!this.active) return;
        
        this.time += dt;
        const elapsed = Date.now() - this.startTime;
        
        // Opening animation (first 1.4 seconds)
        if (!this.isClosing) {
            const openDelay = 150;
            const openDuration = 1400;
            const x = (elapsed - openDelay) / openDuration;
            this.openProgress = this.easeOutCubic(this.clamp(x, 0, 1));
        }
        
        // Check if it's time to close (after 10 seconds)
        if (elapsed >= this.duration && !this.isClosing) {
            this.isClosing = true;
            this.closeProgress = 0;
        }
        
        // Closing animation
        if (this.isClosing) {
            this.closeProgress += dt * 2.5; // Close over ~0.4 seconds
            
            // Flash effect when fully closed
            if (this.closeProgress >= 1) {
                if (!this.flashPeaked) {
                    // Flash in quickly (~0.5s)
                    this.flashAlpha = Math.min(1, this.flashAlpha + dt * 4);
                    if (this.flashAlpha >= 1) {
                        this.flashPeaked = true;
                    }
                } else {
                    // Fade out over ~1.5s
                    this.flashAlpha -= dt * 0.7;
                    if (this.flashAlpha <= 0) {
                        this.active = false;
                        this.flashAlpha = 0;
                    }
                }
            }
        }
        
        // Update eye tracking (track player, not mouse)
        const targetX = this.game.player ? this.game.player.x : window.innerWidth / 2;
        const targetY = this.game.player ? this.game.player.y : window.innerHeight / 2;
        
        for (const eyeObj of this.eyes) {
            this.updateEyeState(eyeObj, targetX, targetY);
        }
    }
    
    /**
     * Updates a single eye's tracking state.
     */
    updateEyeState(eyeObj, targetX, targetY) {
        const t = this.time;
        
        // Laggy tracking
        eyeObj.look.x = this.lerp(eyeObj.look.x, targetX, 0.08);
        eyeObj.look.y = this.lerp(eyeObj.look.y, targetY, 0.08);
        
        let dx = eyeObj.look.x - eyeObj.c.x;
        let dy = eyeObj.look.y - eyeObj.c.y;
        dy *= 1.15;
        
        const lim = this.limitToEllipse(dx, dy, this.style.rx, this.style.ry);
        dx = lim.dx;
        dy = lim.dy;
        
        // Desired pupil offset
        const desiredX = (dx / this.style.rx) * this.style.maxOffset;
        const desiredY = (dy / this.style.ry) * this.style.maxOffset;
        
        // Micro-saccades
        const scale = this.clamp(Math.hypot(dx, dy) / (this.style.rx * 0.65), 0, 1);
        const jitter = 0.7 + 1.2 * (1 - scale);
        const jx = Math.sin(t * 9.2 + eyeObj.id * 1.9) * 0.35 * jitter;
        const jy = Math.cos(t * 8.1 + eyeObj.id * 1.3) * 0.35 * jitter;
        
        eyeObj.pupil.x = this.lerp(eyeObj.pupil.x, desiredX + jx, 0.12);
        eyeObj.pupil.y = this.lerp(eyeObj.pupil.y, desiredY + jy, 0.12);
    }
    
    /**
     * Draws the almond eye path.
     */
    eyePath(ctx, c, inset, t, open, eyeId) {
        const rx = this.style.rx - inset;
        const ry = this.style.ry - inset;
        const o = this.lerp(0.05, 1.0, open);
        
        const tension = 0.06 * Math.sin(t * 0.7 + c.x * 0.002);
        const topH = ry * (1.05 - tension) * o;
        const botH = ry * (0.86 + tension * 0.25) * o;
        
        const innerSoft = 0.14;
        const outerSoft = 0.07;
        const innerIsRight = eyeId === 0;
        
        const pOuter = rx * this.style.almondPoint;
        const pInner = rx * (this.style.almondPoint + innerSoft);
        
        const L = { x: c.x - rx, y: c.y };
        const R = { x: c.x + rx, y: c.y };
        
        const top1 = { x: c.x - rx * 0.62, y: c.y - topH * 0.98 };
        const top2 = { x: c.x + rx * 0.62, y: c.y - topH * 0.96 };
        const bot1 = { x: c.x + rx * 0.62, y: c.y + botH * 0.98 };
        const bot2 = { x: c.x - rx * 0.62, y: c.y + botH * 0.96 };
        
        const pL = innerIsRight ? pOuter : pInner;
        const pR = innerIsRight ? pInner : pOuter;
        const vL = innerIsRight ? outerSoft : innerSoft;
        const vR = innerIsRight ? innerSoft : outerSoft;
        
        const LhT = { x: L.x + pL, y: L.y - ry * vL * o };
        const LhB = { x: L.x + pL, y: L.y + ry * vL * o };
        const RhT = { x: R.x - pR, y: R.y - ry * vR * o };
        const RhB = { x: R.x - pR, y: R.y + ry * vR * o };
        
        ctx.beginPath();
        ctx.moveTo(L.x, L.y);
        ctx.bezierCurveTo(LhT.x, LhT.y, top1.x, top1.y, c.x, c.y - topH);
        ctx.bezierCurveTo(top2.x, top2.y, RhT.x, RhT.y, R.x, R.y);
        ctx.bezierCurveTo(RhB.x, RhB.y, bot1.x, bot1.y, c.x, c.y + botH);
        ctx.bezierCurveTo(bot2.x, bot2.y, LhB.x, LhB.y, L.x, L.y);
        ctx.closePath();
    }
    
    /**
     * Draws the iris.
     */
    drawIris(ctx, x, y, r, t) {
        ctx.save();
        ctx.translate(x, y);
        
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        
        const iris = ctx.createRadialGradient(0, 0, 2, 0, 0, r);
        iris.addColorStop(0, "#ff3b3b");
        iris.addColorStop(0.35, "#b10000");
        iris.addColorStop(0.7, "#3a0000");
        iris.addColorStop(1, "#120000");
        ctx.fillStyle = iris;
        ctx.fill();
        
        ctx.lineWidth = 4;
        ctx.strokeStyle = "rgba(0,0,0,0.85)";
        ctx.stroke();
        
        // Spiral streaks
        ctx.save();
        ctx.globalAlpha = 0.22;
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 32; i++) {
            const a = (i / 32) * Math.PI * 2;
            const swirl = a + Math.sin(t * 0.9 + i) * 0.08;
            const r0 = r * 0.15;
            const r1 = r * (0.92 - (i % 3) * 0.05);
            ctx.beginPath();
            ctx.moveTo(Math.cos(swirl) * r0, Math.sin(swirl) * r0);
            ctx.lineTo(Math.cos(swirl + 0.25) * r1, Math.sin(swirl + 0.25) * r1);
            ctx.strokeStyle = i % 2 ? "rgba(0,0,0,0.55)" : "rgba(255,180,180,0.35)";
            ctx.stroke();
        }
        ctx.restore();
        
        ctx.restore();
    }
    
    /**
     * Draws the slit pupil.
     */
    drawSlitPupil(ctx, x, y, w, h, t, seedPhase) {
        ctx.save();
        ctx.translate(x, y);
        
        const edgeWobble = 2;
        const steps = 14;
        
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
            const p = i / steps;
            const yy = -h / 2 + p * h;
            const wob = Math.sin(p * Math.PI * 2 + t * 2.4 + seedPhase) * edgeWobble;
            const xx = -w / 2 + wob;
            if (i === 0) ctx.moveTo(xx, yy);
            else ctx.lineTo(xx, yy);
        }
        for (let i = steps; i >= 0; i--) {
            const p = i / steps;
            const yy = -h / 2 + p * h;
            const wob = Math.sin(p * Math.PI * 2 + t * 2.4 + 1.7 + seedPhase) * edgeWobble;
            const xx = w / 2 + wob;
            ctx.lineTo(xx, yy);
        }
        ctx.closePath();
        
        const g = ctx.createRadialGradient(0, 0, 2, 0, 0, Math.max(w, h));
        g.addColorStop(0, "#000");
        g.addColorStop(0.55, "#050005");
        g.addColorStop(1, "#000");
        ctx.fillStyle = g;
        ctx.fill();
        
        ctx.restore();
    }
    
    /**
     * Draws a single eye.
     */
    drawEye(ctx, eyeObj, t, open) {
        const c = eyeObj.c;
        
        // Outer fill
        this.eyePath(ctx, c, 0, t, open, eyeObj.id);
        ctx.fillStyle = "#090909";
        ctx.fill();
        
        // Inner clip
        ctx.save();
        this.eyePath(ctx, c, 8, t, open, eyeObj.id);
        ctx.clip();
        
        // Sclera
        const scl = ctx.createRadialGradient(c.x - this.style.rx * 0.22, c.y - this.style.ry * 0.22, 10, c.x, c.y, this.style.rx);
        scl.addColorStop(0, "#f2ecec");
        scl.addColorStop(0.35, "#d9d0d0");
        scl.addColorStop(0.75, "#8d7c7c");
        scl.addColorStop(1, "#140000");
        ctx.fillStyle = scl;
        ctx.fillRect(c.x - this.style.rx - 40, c.y - this.style.ry - 40, (this.style.rx + 40) * 2, (this.style.ry + 40) * 2);
        
        // Veins
        ctx.save();
        ctx.globalAlpha = 0.28 * open;
        ctx.lineWidth = 1.2;
        for (const path of eyeObj.veins) {
            ctx.beginPath();
            for (let i = 0; i < path.length; i++) {
                const p = path[i];
                const wobx = Math.sin(t * 0.8 + i * 1.7 + eyeObj.id) * 0.5;
                const woby = Math.cos(t * 0.7 + i * 2.1 + eyeObj.id) * 0.5;
                const x = c.x + p.x + wobx;
                const y = c.y + p.y + woby;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = "rgba(170, 0, 0, 0.9)";
            ctx.stroke();
        }
        ctx.restore();
        
        ctx.restore();
        
        // Outline
        this.eyePath(ctx, c, 0, t, open, eyeObj.id);
        ctx.strokeStyle = "rgba(0,0,0,0.95)";
        ctx.lineWidth = 8;
        ctx.stroke();
        
        // Red aura
        ctx.save();
        ctx.globalAlpha = 0.22 * open;
        this.eyePath(ctx, c, -5, t, open, eyeObj.id);
        ctx.strokeStyle = "rgba(255,0,0,0.18)";
        ctx.lineWidth = 5;
        ctx.stroke();
        ctx.restore();
        
        // Clip for iris/pupil
        ctx.save();
        this.eyePath(ctx, c, 12, t, open, eyeObj.id);
        ctx.clip();
        
        const irisX = c.x + eyeObj.pupil.x * 0.9;
        const irisY = c.y + eyeObj.pupil.y * 0.9;
        this.drawIris(ctx, irisX, irisY, this.style.irisR * open, t + eyeObj.id * 0.4);
        
        const pupilX = c.x + eyeObj.pupil.x;
        const pupilY = c.y + eyeObj.pupil.y;
        
        // Dilation
        const tight = 0.66 - 0.16 * Math.sin(t * 1.7 + eyeObj.id);
        const wide = 1.10 + 0.22 * Math.sin(t * 0.9 + 1.5 + eyeObj.id * 0.4);
        const d = this.clamp(Math.hypot(eyeObj.look.x - c.x, eyeObj.look.y - c.y) / (Math.min(window.innerWidth, window.innerHeight) * 0.55), 0, 1);
        const snap = d < 0.35 ? tight : wide;
        
        const pw = this.style.pupilW * (0.85 + (1 - d) * 0.15) * open;
        const ph = this.style.pupilH * snap * open;
        
        this.drawSlitPupil(ctx, pupilX, pupilY, pw, ph, t, eyeObj.id * 1.3);
        
        // Glint
        ctx.save();
        ctx.globalAlpha = 0.25 * open;
        ctx.beginPath();
        ctx.arc(pupilX + 5 * open + Math.sin(t * 2.4 + eyeObj.id) * 1.2,
                pupilY - 6 * open + Math.cos(t * 2.1 + eyeObj.id) * 1.0,
                1.8 * open, 0, Math.PI * 2);
        ctx.fillStyle = "#ffb3b3";
        ctx.fill();
        ctx.restore();
        
        ctx.restore();
        
        // Highlights
        ctx.save();
        this.eyePath(ctx, c, 10, t, open, eyeObj.id);
        ctx.clip();
        
        const hx = c.x - this.style.rx * 0.22;
        const hy = c.y - this.style.ry * 0.22;
        ctx.beginPath();
        ctx.ellipse(hx, hy, 28 * open, 16 * open, -0.25, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.24)";
        ctx.fill();
        
        ctx.restore();
    }
    
    /**
     * Main draw function.
     */
    draw(ctx) {
        if (!this.active) return;
        
        // Calculate effective open amount (considering closing)
        let effectiveOpen = this.openProgress;
        if (this.isClosing) {
            effectiveOpen = Math.max(0, this.openProgress * (1 - this.closeProgress));
        }
        
        // Subtle floating motion
        const floatY = Math.sin(this.time * 0.7) * 4;
        this.eyes[0].c.y = 140 + floatY;
        this.eyes[1].c.y = 140 + floatY;
        
        // Draw both eyes
        ctx.save();
        for (const eyeObj of this.eyes) {
            this.drawEye(ctx, eyeObj, this.time, effectiveOpen);
        }
        ctx.restore();
        
        // Red flash effect when closing
        if (this.flashAlpha > 0) {
            ctx.save();
            ctx.fillStyle = `rgba(255, 0, 0, ${this.flashAlpha * 0.6})`;
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.restore();
        }
    }
    
    /**
     * Resets the eyes effect.
     */
    reset() {
        this.active = false;
        this.startTime = 0;
        this.openProgress = 0;
        this.closeProgress = 0;
        this.isClosing = false;
        this.flashAlpha = 0;
        this.time = 0;
    }
}

// ==================== ANTI-CHEAT MANAGER ====================

/**
 * AntiCheatManager - Handles anti-cheat detection and reporting.
 * Detects actual tampering (not just DevTools), page visibility changes, and validates game timing.
 * IMPROVED: Only flags real cheating, not DevTools usage.
 */
class AntiCheatManager {
    constructor(game) {
        this.game = game;
        this.isFlagged = false;
        this.pausedTime = 0;
        this.totalPausedTime = 0;
        this.pauseStartTime = null;
        this.isPausedByVisibility = false;
        
        // Tampering detection state (NOT DevTools detection)
        this.expectedGameState = {};
        this.lastValidScore = 0;
        this.gameStartTimestamp = 0;
        this.frameCount = 0;
        this.lastFrameTime = 0;
        this.speedViolations = 0;
        
        // Minimum completion time (must match server)
        this.MINIMUM_COMPLETION_TIME = 180; // seconds
        
        // Maximum allowed speed multiplier (detect speed hacks)
        this.MAX_SPEED_MULTIPLIER = 1.5;
    }

    /**
     * Initializes all anti-cheat detection mechanisms.
     * IMPROVED: Focus on actual tampering, not DevTools.
     */
    init() {
        this.setupVisibilityHandler();
        this.setupTamperingDetection();
        this.gameStartTimestamp = Date.now();
        console.log('AntiCheat: Initialized (tampering detection only)');
    }

    /**
     * Sets up visibility change handler for pause/resume.
     */
    setupVisibilityHandler() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.onPageHidden();
            } else {
                this.onPageVisible();
            }
        });
        
        // Also handle window blur/focus for additional coverage
        window.addEventListener('blur', () => {
            if (this.game.gameState === 'PLAYING' || this.game.gameState === 'BOSS_PHASE') {
                this.onPageHidden();
            }
        });
        
        window.addEventListener('focus', () => {
            if (this.isPausedByVisibility) {
                this.onPageVisible();
            }
        });
    }

    /**
     * Called when page becomes hidden (tab switch, minimize, etc.)
     */
    onPageHidden() {
        if (this.game.gameState !== 'PLAYING' && this.game.gameState !== 'BOSS_PHASE' && this.game.gameState !== 'ARENA_3D') {
            return;
        }
        
        if (this.isPausedByVisibility) return; // Already paused
        
        this.isPausedByVisibility = true;
        this.pauseStartTime = Date.now();
        
        // Pause the game
        this.game.audio.pause();
        
        // Show pause overlay
        this.showPauseOverlay();
        
        console.log('AntiCheat: Game paused (page hidden)');
    }

    /**
     * Called when page becomes visible again.
     */
    onPageVisible() {
        if (!this.isPausedByVisibility) return;
        
        this.isPausedByVisibility = false;
        
        // Calculate paused duration
        if (this.pauseStartTime) {
            const pausedDuration = Date.now() - this.pauseStartTime;
            this.totalPausedTime += pausedDuration;
            this.pauseStartTime = null;
        }
        
        // Hide pause overlay
        this.hidePauseOverlay();
        
        // Resume the game
        if (this.game.gameState === 'PLAYING' || this.game.gameState === 'BOSS_PHASE') {
            this.game.audio.play().catch(e => console.error('Audio resume failed:', e));
            this.game.lastTime = Date.now(); // Reset time to prevent huge dt spike
            requestAnimationFrame(this.game.loop);
        } else if (this.game.gameState === 'ARENA_3D' && this.game.arena3D) {
            this.game.audio.play().catch(e => console.error('Audio resume failed:', e));
        }
        
        console.log('AntiCheat: Game resumed (page visible)');
    }

    /**
     * Shows the pause overlay when page is hidden.
     */
    showPauseOverlay() {
        let overlay = document.getElementById('visibility-pause-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'visibility-pause-overlay';
            overlay.className = 'visibility-pause-overlay';
            overlay.innerHTML = `
                <div class="pause-content">
                    <h1 class="pause-title">PAUSED</h1>
                    <p class="pause-message">Return to continue</p>
                </div>
            `;
            document.body.appendChild(overlay);
        }
        overlay.classList.remove('hidden');
        overlay.classList.add('active');
    }

    /**
     * Hides the pause overlay.
     */
    hidePauseOverlay() {
        const overlay = document.getElementById('visibility-pause-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
            overlay.classList.remove('active');
        }
    }

    /**
     * Sets up tampering detection (NOT DevTools detection).
     * Only flags actual cheating behaviors.
     */
    setupTamperingDetection() {
        // Monitor for speed hacks by checking frame timing
        this.lastFrameTime = performance.now();
        
        // Store expected game state for validation
        this.expectedGameState = {
            minFrameTime: 10, // Minimum ms between frames (100+ FPS is suspicious if sustained)
            maxDeltaTime: 100, // Maximum dt in ms (prevents time manipulation)
        };
        
        // Store original function references for integrity checking
        this.originalFunctions = new Map();
        this.functionCheckInterval = null;
        
        // Start function integrity monitoring after game initializes
        setTimeout(() => this.setupFunctionIntegrityCheck(), 1000);
    }
    
    /**
     * Sets up function integrity checking to detect console tampering.
     * Detects when critical game functions are overridden.
     */
    setupFunctionIntegrityCheck() {
        if (!this.game) return;
        
        // Store references to critical functions
        const criticalMethods = [
            'gameOver',
            'victory',
            'showBossVictory',
            'checkCollision'
        ];
        
        // Store original function strings (for comparison)
        criticalMethods.forEach(methodName => {
            if (this.game[methodName]) {
                this.originalFunctions.set(methodName, this.game[methodName].toString().substring(0, 100));
            }
        });
        
        // Also protect Player methods
        if (this.game.player) {
            const playerMethods = ['die', 'takeDamage', 'checkCollision'];
            playerMethods.forEach(methodName => {
                if (this.game.player[methodName]) {
                    this.originalFunctions.set(`player.${methodName}`, this.game.player[methodName].toString().substring(0, 100));
                }
            });
        }
        
        // Check integrity periodically
        this.functionCheckInterval = setInterval(() => this.checkFunctionIntegrity(), 2000);
    }
    
    /**
     * Checks if critical functions have been tampered with.
     */
    checkFunctionIntegrity() {
        if (!this.game || this.isFlagged) return;
        
        // Check Game methods
        const gameMethods = ['gameOver', 'victory', 'showBossVictory', 'checkCollision'];
        for (const methodName of gameMethods) {
            if (this.game[methodName]) {
                const currentStr = this.game[methodName].toString().substring(0, 100);
                const originalStr = this.originalFunctions.get(methodName);
                
                if (originalStr && currentStr !== originalStr) {
                    this.flagPlayer('function_tampering', { 
                        function: methodName,
                        type: 'game_method'
                    });
                    // Force game over for cheaters
                    this.forceGameOverForCheater('Function tampering detected');
                    return;
                }
            }
        }
        
        // Check Player methods
        if (this.game.player) {
            const playerMethods = ['die', 'takeDamage', 'checkCollision'];
            for (const methodName of playerMethods) {
                if (this.game.player[methodName]) {
                    const currentStr = this.game.player[methodName].toString().substring(0, 100);
                    const originalStr = this.originalFunctions.get(`player.${methodName}`);
                    
                    if (originalStr && currentStr !== originalStr) {
                        this.flagPlayer('function_tampering', { 
                            function: `player.${methodName}`,
                            type: 'player_method'
                        });
                        // Force game over for cheaters
                        this.forceGameOverForCheater('Function tampering detected');
                        return;
                    }
                }
            }
        }
        
        // Check if game object itself was replaced
        if (window.game && window.game !== this.game) {
            this.flagPlayer('game_object_replaced', {});
            this.forceGameOverForCheater('Game object tampering detected');
        }
    }
    
    /**
     * Forces game over for detected cheaters with a message.
     * @param {string} reason - The reason for forcing game over
     */
    forceGameOverForCheater(reason) {
        console.error(`AntiCheat: ${reason}`);
        
        // Clear the integrity check interval
        if (this.functionCheckInterval) {
            clearInterval(this.functionCheckInterval);
        }
        
        // Show cheater message
        this.showCheaterMessage(reason);
        
        // Force game state to prevent further play
        if (this.game) {
            this.game.gameState = 'GAME_OVER';
            this.game.audio.pause();
        }
    }
    
    /**
     * Shows a message to detected cheaters.
     * @param {string} reason - The reason for detection
     */
    showCheaterMessage(reason) {
        let overlay = document.getElementById('cheater-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'cheater-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(30, 20, 40, 0.95);
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                z-index: 99999;
                font-family: 'Courier New', monospace;
            `;
            overlay.innerHTML = `
                <div style="text-align: center; max-width: 500px; padding: 2rem;">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">🤔</div>
                    <h1 style="font-size: 2rem; color: #ffaa00; margin-bottom: 1rem;">Hmm...</h1>
                    <p style="font-size: 1.2rem; color: #ffffff; margin-bottom: 1.5rem;">
                        Sorry, but the anti-cheat thinks you cheated.
                    </p>
                    <p style="font-size: 1rem; color: #aaaaaa; margin-bottom: 2rem;">
                        If you didn't cheat, please contact the creator to resolve this!
                    </p>
                    <p style="font-size: 0.9rem; color: #666666;">
                        Your score won't be submitted and rewards are disabled.
                    </p>
                    <button onclick="location.reload()" style="
                        margin-top: 2rem;
                        padding: 0.8rem 2rem;
                        font-size: 1rem;
                        background: rgba(255, 170, 0, 0.2);
                        border: 2px solid #ffaa00;
                        color: #ffaa00;
                        cursor: pointer;
                        border-radius: 8px;
                        font-family: inherit;
                    ">Try Again</button>
                </div>
            `;
            document.body.appendChild(overlay);
        }
        overlay.style.display = 'flex';
    }
    
    /**
     * Checks if the player is flagged for cheating.
     * @returns {boolean} True if flagged
     */
    isPlayerFlagged() {
        return this.isFlagged;
    }

    /**
     * Validates frame timing to detect speed hacks.
     * Called each frame from the game loop.
     * @param {number} dt - Delta time in seconds
     */
    validateFrameTiming(dt) {
        const now = performance.now();
        const frameDelta = now - this.lastFrameTime;
        this.lastFrameTime = now;
        this.frameCount++;
        
        // Check for speed hacks (game running faster than real time)
        // Only flag if consistently too fast (not just occasional spikes)
        if (dt > 0 && frameDelta > 0) {
            const speedMultiplier = (dt * 1000) / frameDelta;
            
            if (speedMultiplier > this.MAX_SPEED_MULTIPLIER) {
                this.speedViolations++;
                
                // Only flag after sustained violations (10+ consecutive)
                if (this.speedViolations >= 10) {
                    this.flagPlayer('speed_hack', {
                        speedMultiplier: speedMultiplier.toFixed(2),
                        violations: this.speedViolations
                    });
                }
            } else {
                // Reset violations if frame timing is normal
                this.speedViolations = Math.max(0, this.speedViolations - 1);
            }
        }
    }

    /**
     * Validates score before submission.
     * Checks for impossible scores.
     * @param {number} score - The score to validate
     * @param {boolean} isVictory - Whether this is a victory score
     * @returns {object} Validation result with isValid and reason
     */
    validateScoreSubmission(score, isVictory) {
        const result = { isValid: true, reason: null };
        
        // Check for impossible completion time (victory only)
        if (isVictory && score < this.MINIMUM_COMPLETION_TIME) {
            result.isValid = false;
            result.reason = 'impossible_time';
            this.flagPlayer('impossible_score', { score, minRequired: this.MINIMUM_COMPLETION_TIME });
        }
        
        // Check for score manipulation (score higher than elapsed time)
        const elapsedTime = this.getAdjustedSurvivalTime();
        if (score > elapsedTime + 5) { // 5 second tolerance
            result.isValid = false;
            result.reason = 'score_manipulation';
            this.flagPlayer('score_manipulation', { claimed: score, actual: elapsedTime });
        }
        
        return result;
    }

    /**
     * Flags the player for suspicious activity.
     * IMPROVED: Logs detailed information about what was detected.
     * @param {string} reason - The reason for flagging
     * @param {object} details - Additional details about the violation
     */
    async flagPlayer(reason, details = {}) {
        if (this.isFlagged) return; // Already flagged
        
        this.isFlagged = true;
        
        const flagData = {
            reason,
            details,
            timestamp: new Date().toISOString(),
            gameTime: this.getAdjustedSurvivalTime(),
            frameCount: this.frameCount
        };
        
        console.warn(`AntiCheat: Player flagged for ${reason}`, flagData);
        
        // Report to server with detailed information
        try {
            await fetch('/api/flag', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    reason: `${reason}: ${JSON.stringify(details)}`.substring(0, 100)
                })
            });
        } catch (err) {
            console.error('AntiCheat: Failed to report flag:', err);
        }
    }

    /**
     * Gets the adjusted game time (excluding paused time).
     * @returns {number} Adjusted time in milliseconds
     */
    getAdjustedTime() {
        // Ensure startTime is valid
        if (!this.game.startTime || this.game.startTime <= 0) {
            return 0;
        }
        const rawElapsed = Date.now() - this.game.startTime;
        const adjusted = rawElapsed - this.totalPausedTime;
        // Never return negative time
        return Math.max(0, adjusted);
    }

    /**
     * Gets the adjusted survival time in seconds.
     * @returns {number} Adjusted survival time in seconds
     */
    getAdjustedSurvivalTime() {
        const time = this.getAdjustedTime() / 1000;
        // Never return negative time
        return Math.max(0, time);
    }

    /**
     * Validates a score before submission.
     * @param {number} score - The score to validate
     * @returns {boolean} True if valid, false if suspicious
     */
    validateScore(score) {
        if (score < this.MINIMUM_COMPLETION_TIME) {
            console.warn(`AntiCheat: Score ${score}s is below minimum ${this.MINIMUM_COMPLETION_TIME}s`);
            return false;
        }
        return true;
    }

    /**
     * Checks if the game is currently paused by visibility.
     * @returns {boolean} True if paused
     */
    isPaused() {
        return this.isPausedByVisibility;
    }

    /**
     * Resets the anti-cheat state for a new game.
     */
    reset() {
        this.totalPausedTime = 0;
        this.pauseStartTime = null;
        this.isPausedByVisibility = false;
        this.speedViolations = 0;
        this.frameCount = 0;
        this.gameStartTimestamp = Date.now();
        this.hidePauseOverlay();
    }

    /**
     * Cleans up anti-cheat resources.
     */
    cleanup() {
        // Clear function integrity check interval
        if (this.functionCheckInterval) {
            clearInterval(this.functionCheckInterval);
            this.functionCheckInterval = null;
        }
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.resize();

        this.gameState = 'MENU'; // MENU, PLAYING, GAME_OVER, VICTORY
        this.startTime = 0;
        this.lastTime = 0;
        this.score = 0;
        this.lastSurvivalTime = 0; // Store survival time for score submission

        // Config
        this.BPM = 174; // Approx BPM for the track (adjusted for the new music)
        this.duration = 180; // 3 minutes target

        // Audio - proper initialization order
        this.audio = document.getElementById('bg-music');
        this.audio.preload = 'auto';
        this.audio.crossOrigin = 'anonymous';
        this.audio.loop = true;
        this.audio.src = 'https://cdn.jsdelivr.net/gh/Anosvolde-d/grimm@c73fbff5b21060333c7f1b7c82e00e8e04380814/Grimm%20(1).mp3';
        this.audio.load(); // Force load the audio
        
        // Audio error handling state
        this.audioLoadFailed = false;
        this.pendingAudioUrl = null;
        
        // Setup audio error handling
        this.setupAudioErrorHandling();

        // Camera
        this.camera = {
            shake: 0
        };
        
        // Mobile scale for 2D gameplay (de-zoom on mobile)
        this.mobileScale = 1.0;

        // Audio Analysis
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.source = null;

        // Input
        this.keys = {
            left: false,
            right: false,
            jump: false
        };

        // Initialize game objects
        this.player = new Player(this);
        this.obstacles = new ObstacleManager(this);
        this.particles = new ParticleSystem(this);
        this.lights = new LightSystem(this);
        this.stageManager = new StageManager(this);
        this.adminMenu = new AdminMenu(this);
        this.antiCheat = new AntiCheatManager(this);
        
        // Uncanny Eyes effect for Stage 1
        this.uncannyEyes = new UncannyEyes(this);
        
        // Initialize anti-cheat
        this.antiCheat.init();
        
        // Boss Phase Manager (initialized when needed)
        // Requirements: 1.1
        this.bossPhaseManager = null;
        
        // 3D Arena (initialized when needed)
        this.arena3D = null;
        
        // Boss Music Controller - Requirements: 9.1, 9.2, 9.5, 9.6
        this.bossMusicController = null;

        // Load Obstacle Sprite
        this.projectileSprite = new Image();
        this.projectileSprite.src = 'https://media.discordapp.net/attachments/1307041726719852610/1453077798108397761/f320394ee46d59c0ffe7363e6c90c1d3.gif?ex=694c23a7&is=694ad227&hm=876dcf5ba3bd4f53c33cdcde1c7c26b5bb6c52ca25aa10b649cb95b82a0b5560&=';

        this.bindEvents();
        this.loop = this.loop.bind(this);
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = window.innerWidth * dpr;
        this.canvas.height = window.innerHeight * dpr;

        this.canvas.style.width = `${window.innerWidth}px`;
        this.canvas.style.height = `${window.innerHeight}px`;

        this.ctx.scale(dpr, dpr);

        this.floorY = window.innerHeight - 100;
        this.centerX = window.innerWidth / 2;
        
        // Set mobile scale for 2D gameplay (de-zoom on mobile)
        if (this.isMobileDevice()) {
            // Scale down more to show much more play area on mobile
            this.mobileScale = 0.45;
        } else {
            this.mobileScale = 1.0;
        }
    }

    bindEvents() {
        window.addEventListener('resize', () => this.resize());

        window.addEventListener('keydown', (e) => {
            if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.keys.left = true;
            if (e.code === 'ArrowRight' || e.code === 'KeyD') this.keys.right = true;
            if (e.code === 'Space' || e.code === 'ArrowUp') {
                e.preventDefault(); // Prevent page scroll/reset
                this.keys.jump = true;
                if (this.gameState === 'PLAYING' || this.gameState === 'BOSS_PHASE') this.player.jump();
            }
            if (e.code === 'KeyL') {
                // Debug: force spawn laser
                this.obstacles.spawnLaser(Math.random() > 0.5 ? 'horizontal' : 'vertical');
            }
            if (e.code === 'Escape') {
                this.togglePause();
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.keys.left = false;
            if (e.code === 'ArrowRight' || e.code === 'KeyD') this.keys.right = false;
            if (e.code === 'Space' || e.code === 'ArrowUp') this.keys.jump = false;
        });

        document.getElementById('start-btn').addEventListener('click', () => {
            this.start();
        });

        document.getElementById('restart-btn').addEventListener('click', () => this.start());
        document.getElementById('menu-btn').addEventListener('click', () => this.toMenu());

        // Continue button for stage transitions
        const continueBtn = document.getElementById('continue-btn');
        if (continueBtn) {
            continueBtn.addEventListener('click', () => this.continueToNextStage());
        }

        // Boss victory menu button - Requirements: 5.1, 5.2
        const bossVictoryMenuBtn = document.getElementById('boss-victory-menu-btn');
        if (bossVictoryMenuBtn) {
            bossVictoryMenuBtn.addEventListener('click', () => this.toMenu());
        }

        // Leaderboard tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });

        // Score submission handlers
        const submitBtn = document.getElementById('submit-score-btn');
        if (submitBtn) {
            submitBtn.addEventListener('click', () => this.submitScore('game-over'));
        }

        const winSubmitBtn = document.getElementById('win-submit-score-btn');
        if (winSubmitBtn) {
            winSubmitBtn.addEventListener('click', () => this.submitScore('win'));
        }

        // Load leaderboards on page load
        this.loadLeaderboards();
        
        // Setup mobile controls
        this.setupMobileControls();
    }

    /**
     * Detects if the device is mobile/tablet.
     */
    isMobileDevice() {
        return ('ontouchstart' in window) || 
               (navigator.maxTouchPoints > 0) || 
               (navigator.msMaxTouchPoints > 0) ||
               /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    /**
     * Sets up mobile touch controls for 2D gameplay.
     * Uses dual event system (touch + pointer) for iPhone compatibility.
     */
    setupMobileControls() {
        if (!this.isMobileDevice()) return;
        
        const mobileControls = document.getElementById('mobile-controls');
        const jumpBtn = document.getElementById('mobile-jump-btn');
        const leftBtn = document.getElementById('mobile-left-btn');
        const rightBtn = document.getElementById('mobile-right-btn');
        
        if (!mobileControls || !jumpBtn || !leftBtn || !rightBtn) return;
        
        // Setup jump button with dual event system
        this.setupTouchButton(jumpBtn, 
            () => {
                this.keys.jump = true;
                if (this.gameState === 'PLAYING' || this.gameState === 'BOSS_PHASE') {
                    this.player.jump();
                }
            },
            () => {
                this.keys.jump = false;
            }
        );
        
        // Setup left button
        this.setupTouchButton(leftBtn,
            () => { this.keys.left = true; },
            () => { this.keys.left = false; }
        );
        
        // Setup right button
        this.setupTouchButton(rightBtn,
            () => { this.keys.right = true; },
            () => { this.keys.right = false; }
        );
        
        console.log('Mobile controls initialized with dual event system');
    }

    /**
     * Sets up a touch button with dual event system for iPhone compatibility.
     * @param {HTMLElement} element - The button element
     * @param {Function} onPress - Callback when pressed
     * @param {Function} onRelease - Callback when released
     */
    setupTouchButton(element, onPress, onRelease) {
        if (!element) return;
        
        // Prevent default touch behaviors via CSS
        element.style.touchAction = 'none';
        element.style.webkitTouchCallout = 'none';
        element.style.webkitUserSelect = 'none';
        element.style.userSelect = 'none';
        
        let isPressed = false;
        let activePointerId = null;
        
        const handlePress = (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Track pointer ID for multi-touch support
            if (e.pointerId !== undefined) {
                activePointerId = e.pointerId;
            }
            
            if (!isPressed) {
                isPressed = true;
                element.classList.add('pressed');
                onPress();
                console.log('Mobile button pressed:', element.id);
            }
        };
        
        const handleRelease = (e) => {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            
            if (isPressed) {
                isPressed = false;
                activePointerId = null;
                element.classList.remove('pressed');
                onRelease();
                console.log('Mobile button released:', element.id);
            }
        };
        
        // Touch events (primary for mobile)
        element.addEventListener('touchstart', handlePress, { passive: false, capture: true });
        element.addEventListener('touchend', handleRelease, { passive: false, capture: true });
        element.addEventListener('touchcancel', handleRelease, { passive: false, capture: true });
        
        // Pointer events (better iOS Safari 13+ support)
        element.addEventListener('pointerdown', handlePress, { passive: false, capture: true });
        element.addEventListener('pointerup', handleRelease, { passive: false, capture: true });
        element.addEventListener('pointercancel', handleRelease, { passive: false, capture: true });
        element.addEventListener('pointerleave', handleRelease, { passive: false, capture: true });
        
        // Mouse events as fallback
        element.addEventListener('mousedown', handlePress, { passive: false });
        element.addEventListener('mouseup', handleRelease, { passive: false });
        element.addEventListener('mouseleave', handleRelease, { passive: false });
    }

    /**
     * Shows mobile controls for 2D gameplay.
     */
    showMobileControls() {
        if (!this.isMobileDevice()) {
            console.log('Not a mobile device, skipping mobile controls');
            return;
        }
        
        const mobileControls = document.getElementById('mobile-controls');
        const mobileControls3D = document.getElementById('mobile-controls-3d');
        
        console.log('Showing mobile controls, element:', mobileControls);
        
        if (mobileControls) {
            mobileControls.classList.remove('hidden');
            mobileControls.classList.add('active');
            mobileControls.style.display = 'flex'; // Force display
            console.log('Mobile controls shown');
        } else {
            console.error('Mobile controls element not found!');
        }
        if (mobileControls3D) {
            mobileControls3D.classList.add('hidden');
            mobileControls3D.classList.remove('active');
        }
    }

    /**
     * Hides mobile controls.
     */
    hideMobileControls() {
        const mobileControls = document.getElementById('mobile-controls');
        const mobileControls3D = document.getElementById('mobile-controls-3d');
        
        if (mobileControls) {
            mobileControls.classList.add('hidden');
            mobileControls.classList.remove('active');
        }
        if (mobileControls3D) {
            mobileControls3D.classList.add('hidden');
            mobileControls3D.classList.remove('active');
        }
    }

    // ==================== AUDIO ERROR HANDLING METHODS ====================

    /**
     * Sets up audio error handling with toast notifications.
     * Requirements: 3.2
     */
    setupAudioErrorHandling() {
        // Handle audio load errors
        this.audio.addEventListener('error', (e) => {
            console.error('Audio load error:', e);
            this.handleAudioError('Failed to load audio track');
        });

        // Handle stalled loading
        this.audio.addEventListener('stalled', () => {
            console.warn('Audio loading stalled');
        });

        // Setup toast button handlers
        const retryBtn = document.getElementById('audio-retry-btn');
        const continueBtn = document.getElementById('audio-continue-btn');

        if (retryBtn) {
            retryBtn.addEventListener('click', () => this.retryAudioLoad());
        }

        if (continueBtn) {
            continueBtn.addEventListener('click', () => this.continueWithoutAudio());
        }
    }

    /**
     * Handles audio load failures by showing error toast.
     * Requirements: 3.2
     * @param {string} message - Error message to display
     */
    handleAudioError(message) {
        this.audioLoadFailed = true;
        const toast = document.getElementById('audio-error-toast');
        const toastMessage = toast?.querySelector('.toast-message');
        
        if (toast && toastMessage) {
            toastMessage.textContent = message;
            toast.classList.remove('hidden');
        }
    }

    /**
     * Hides the audio error toast.
     */
    hideAudioErrorToast() {
        const toast = document.getElementById('audio-error-toast');
        if (toast) {
            toast.classList.add('hidden');
        }
    }

    /**
     * Retries loading the audio track.
     * Requirements: 3.2
     */
    retryAudioLoad() {
        this.hideAudioErrorToast();
        this.audioLoadFailed = false;
        
        // Reload the current audio source
        const currentSrc = this.pendingAudioUrl || this.audio.src;
        this.audio.src = currentSrc;
        this.audio.load();
        
        this.audio.play()
            .then(() => {
                console.log('Audio retry successful');
                this.pendingAudioUrl = null;
            })
            .catch(e => {
                console.error('Audio retry failed:', e);
                this.handleAudioError('Audio retry failed - check your connection');
            });
    }

    /**
     * Continues gameplay without audio.
     * Requirements: 3.2
     */
    continueWithoutAudio() {
        this.hideAudioErrorToast();
        this.audioLoadFailed = false;
        this.pendingAudioUrl = null;
        console.log('Continuing without audio');
    }

    // ==================== LEADERBOARD API METHODS ====================

    async loadLeaderboards() {
        await Promise.all([
            this.loadDailyLeaderboard(),
            this.loadAllTimeLeaderboard(),
            this.loadStats(),
            this.loadUserProfile()
        ]);
    }

    /**
     * Loads user profile based on IP and prefills username fields.
     */
    async loadUserProfile() {
        try {
            // Get player ID from localStorage (UUID-based, not IP)
            const playerId = getPlayerId();
            
            // First, try to load from localStorage (faster)
            const savedName = getSavedDisplayName();
            const savedDiscord = getSavedDiscord();
            
            // Prefill username fields from localStorage
            const usernameInput = document.getElementById('username-input');
            const winUsernameInput = document.getElementById('win-username-input');
            const discordInput = document.getElementById('discord-input');
            const winDiscordInput = document.getElementById('win-discord-input');
            
            if (usernameInput && !usernameInput.value && savedName) {
                usernameInput.value = savedName;
            }
            if (winUsernameInput && !winUsernameInput.value && savedName) {
                winUsernameInput.value = savedName;
            }
            if (discordInput && !discordInput.value && savedDiscord) {
                discordInput.value = savedDiscord;
            }
            if (winDiscordInput && !winDiscordInput.value && savedDiscord) {
                winDiscordInput.value = savedDiscord;
            }
            
            // Fetch profile from server using player ID
            const response = await fetch(`/api/user/profile?playerId=${encodeURIComponent(playerId)}`);
            const data = await response.json();
            
            if (data.success && data.profile) {
                this.userProfile = data.profile;
                
                // Update fields if server has newer data
                if (data.profile.username && !savedName) {
                    if (usernameInput && !usernameInput.value) {
                        usernameInput.value = data.profile.username;
                    }
                    if (winUsernameInput && !winUsernameInput.value) {
                        winUsernameInput.value = data.profile.username;
                    }
                }
                if (data.profile.discord && !savedDiscord) {
                    if (discordInput && !discordInput.value) {
                        discordInput.value = data.profile.discord;
                    }
                    if (winDiscordInput && !winDiscordInput.value) {
                        winDiscordInput.value = data.profile.discord;
                    }
                }
                
                // Show best score if available
                if (data.profile.bestScore) {
                    this.showBestScore(data.profile.bestScore);
                }
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
        }
    }

    /**
     * Shows the user's best score in the submission forms.
     */
    showBestScore(bestScore) {
        // Add best score display to game over form
        const gameOverForm = document.getElementById('score-submission');
        if (gameOverForm) {
            let bestScoreDiv = gameOverForm.querySelector('.best-score-display');
            if (!bestScoreDiv) {
                bestScoreDiv = document.createElement('div');
                bestScoreDiv.className = 'best-score-display';
                gameOverForm.insertBefore(bestScoreDiv, gameOverForm.querySelector('.form-group'));
            }
            bestScoreDiv.textContent = `Your best: ${parseFloat(bestScore).toFixed(2)}s`;
        }
        
        // Add best score display to win form
        const winForm = document.getElementById('win-score-submission');
        if (winForm) {
            let bestScoreDiv = winForm.querySelector('.best-score-display');
            if (!bestScoreDiv) {
                bestScoreDiv = document.createElement('div');
                bestScoreDiv.className = 'best-score-display';
                winForm.insertBefore(bestScoreDiv, winForm.querySelector('.form-group'));
            }
            bestScoreDiv.textContent = `Your best: ${parseFloat(bestScore).toFixed(2)}s`;
        }
    }

    /**
     * Updates best score display after a game.
     */
    updateBestScoreDisplay() {
        const currentScore = this.lastSurvivalTime;
        const bestScore = this.userProfile?.bestScore;
        
        // Only show "new record" if we have a valid previous best score to compare against
        // and the current score is actually higher (longer survival time = better)
        // Ensure both values are numbers for proper comparison
        const currentScoreNum = parseFloat(currentScore) || 0;
        const bestScoreNum = parseFloat(bestScore);
        
        if (!isNaN(bestScoreNum) && bestScoreNum > 0 && currentScoreNum > bestScoreNum) {
            // New record!
            const bestScoreDivs = document.querySelectorAll('.best-score-display');
            bestScoreDivs.forEach(div => {
                div.textContent = `🎉 NEW RECORD! Previous: ${bestScoreNum.toFixed(2)}s`;
                div.classList.add('new-record');
            });
        }
    }

    async loadDailyLeaderboard() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch('/api/leaderboard/daily', { signal: controller.signal });
            clearTimeout(timeoutId);
            
            const text = await response.text();
            console.log('Daily leaderboard raw response:', text.substring(0, 200));
            
            const result = safeParseLeaderboard(text);
            console.log('Daily leaderboard parsed:', result.success, 'entries:', result.leaderboard?.length);
            
            if (result.success) {
                this.renderLeaderboard('daily-leaderboard', result.leaderboard);
            } else {
                console.error('Daily leaderboard parse error:', result.error);
                this.renderLeaderboard('daily-leaderboard', []);
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.error('Daily leaderboard request timed out');
                this.showConnectionError('daily-leaderboard');
            } else {
                console.error('Failed to load daily leaderboard:', error);
                this.renderLeaderboard('daily-leaderboard', []);
            }
        }
    }

    async loadAllTimeLeaderboard() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch('/api/leaderboard/all-time', { signal: controller.signal });
            clearTimeout(timeoutId);
            
            const text = await response.text();
            console.log('All-time leaderboard raw response:', text.substring(0, 200));
            
            const result = safeParseLeaderboard(text);
            console.log('All-time leaderboard parsed:', result.success, 'entries:', result.leaderboard?.length);
            
            if (result.success) {
                this.renderLeaderboard('alltime-leaderboard', result.leaderboard);
            } else {
                console.error('All-time leaderboard parse error:', result.error);
                this.renderLeaderboard('alltime-leaderboard', []);
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.error('All-time leaderboard request timed out');
                this.showConnectionError('alltime-leaderboard');
            } else {
                console.error('Failed to load all-time leaderboard:', error);
                this.renderLeaderboard('alltime-leaderboard', []);
            }
        }
    }

    async loadStats() {
        try {
            const response = await fetch('/api/stats');
            const data = await response.json();
            const dailyPlayers = document.getElementById('daily-players');
            const totalGames = document.getElementById('total-games');
            if (dailyPlayers) dailyPlayers.textContent = data.dailyPlayers || 0;
            if (totalGames) totalGames.textContent = data.totalGames || 0;
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    }

    renderLeaderboard(containerId, entries) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const tbody = container.querySelector('tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (!entries || entries.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#888;">No entries yet</td></tr>';
            return;
        }

        entries.forEach((entry, index) => {
            const row = document.createElement('tr');
            const rank = index + 1;
            let rankDisplay = rank;

            // Special rank icons for top 3
            if (rank === 1) rankDisplay = '👑';
            else if (rank === 2) rankDisplay = '🥈';
            else if (rank === 3) rankDisplay = '🥉';

            row.innerHTML = `
                <td class="rank-${rank <= 3 ? rank : ''}">${rankDisplay}</td>
                <td>${this.escapeHtml(entry.username || 'Anonymous')}</td>
                <td>${parseFloat(entry.score).toFixed(2)}s</td>
                <td>${entry.discord ? this.escapeHtml(entry.discord) : '-'}</td>
            `;
            tbody.appendChild(row);
        });
    }

    showConnectionError(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const tbody = container.querySelector('tbody');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#f55;">Connection error - please try again</td></tr>';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update panels
        document.getElementById('daily-leaderboard')?.classList.toggle('active', tabName === 'daily');
        document.getElementById('alltime-leaderboard')?.classList.toggle('active', tabName === 'alltime');
    }

    async submitScore(context) {
        let usernameInput, discordInput, resultDiv, submitBtn;
        const isVictory = (context === 'win'); // Only victory scores need minimum time validation

        if (context === 'win') {
            usernameInput = document.getElementById('win-username-input');
            discordInput = document.getElementById('win-discord-input');
            resultDiv = document.getElementById('win-submission-result');
            submitBtn = document.getElementById('win-submit-score-btn');
        } else {
            usernameInput = document.getElementById('username-input');
            discordInput = document.getElementById('discord-input');
            resultDiv = document.getElementById('submission-result');
            submitBtn = document.getElementById('submit-score-btn');
        }

        const username = usernameInput?.value.trim();
        const discord = discordInput?.value.trim();
        const score = this.lastSurvivalTime;
        const playerId = getPlayerId(); // Get persistent player ID

        if (!username) {
            if (resultDiv) {
                resultDiv.textContent = 'Please enter a username!';
                resultDiv.className = 'submission-result error';
            }
            return;
        }

        if (!score || score <= 0) {
            if (resultDiv) {
                resultDiv.textContent = 'No valid score to submit!';
                resultDiv.className = 'submission-result error';
            }
            return;
        }

        // Disable button during submission
        if (submitBtn) submitBtn.disabled = true;

        try {
            const response = await fetch('/api/score', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    playerId, // Include player ID for proper tracking
                    username,
                    discord: discord || null,
                    score,
                    isVictory // Send victory flag for anti-cheat validation
                })
            });

            const data = await response.json();

            if (response.ok) {
                if (resultDiv) {
                    resultDiv.textContent = '✓ Score submitted successfully!';
                    resultDiv.className = 'submission-result success';
                }
                
                // Save user profile for next time
                this.saveUserProfile(username, discord);
                
                // Refresh leaderboards
                await this.loadLeaderboards();
            } else {
                throw new Error(data.error || 'Submission failed');
            }
        } catch (error) {
            console.error('Score submission failed:', error);
            if (resultDiv) {
                resultDiv.textContent = `✗ ${error.message}`;
                resultDiv.className = 'submission-result error';
            }
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    }

    /**
     * Saves user profile using player ID (not IP).
     */
    async saveUserProfile(username, discord) {
        // Save locally first (instant)
        saveDisplayName(username);
        saveDiscord(discord);
        
        // Then sync to server
        try {
            const playerId = getPlayerId();
            await fetch('/api/user/profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    playerId,
                    username, 
                    discord 
                })
            });
        } catch (error) {
            console.error('Error saving user profile:', error);
        }
    }

    start() {
        // If no audio source set yet (user didn't pick file), try default but it might fail CORS if local
        // Just proceed, game logic handles silence.

        document.getElementById('start-screen').classList.remove('active');
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('game-over-screen').classList.add('hidden');
        document.getElementById('game-over-screen').classList.remove('active');
        document.getElementById('win-screen').classList.add('hidden');
        document.getElementById('hud').classList.remove('hidden');

        this.gameState = 'PLAYING';
        this.startTime = Date.now();
        this.obstacles.reset();
        
        // Reset anti-cheat state for new game
        if (this.antiCheat) {
            this.antiCheat.reset();
        }
        
        // Reset stage to 1 when starting fresh and set background
        if (this.stageManager) {
            this.stageManager.currentStage = 1;
            this.stageManager.setBackground(1);
        }
        
        // Start uncanny eyes effect for Stage 1
        if (this.uncannyEyes) {
            this.uncannyEyes.reset();
            this.uncannyEyes.start();
        }

        // Initialize Audio Analysis on first start (Requires user gesture)
        this.initAudioAnalysis();

        // Force safe spawn on reset
        this.player.reset();
        this.score = 0;

        // Set the correct music for the current stage
        if (this.stageManager) {
            const musicUrl = this.stageManager.getMusicUrl();
            this.audio.src = musicUrl;
        }

        // Try to play audio with error handling
        // Requirements: 3.2
        console.log("Attempting to play audio: ", this.audio.src);
        this.pendingAudioUrl = this.audio.src;
        this.audio.volume = 1.0;
        this.audio.currentTime = 0;
        this.audio.play()
            .then(() => {
                console.log("Audio playing successfully");
                this.pendingAudioUrl = null;
            })
            .catch(e => {
                console.error("Audio play failed:", e);
                this.handleAudioError('Failed to play audio - click Retry or continue without sound');
            });

        // Show mobile controls on touch devices
        this.showMobileControls();

        this.lastTime = Date.now(); // RESET TIME to prevent huge dt spike
        requestAnimationFrame(this.loop);
    }

    initAudioAnalysis() {
        if (!this.audioContext) {
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                this.analyser = this.audioContext.createAnalyser();
                this.source = this.audioContext.createMediaElementSource(this.audio);
                this.source.connect(this.analyser);
                this.analyser.connect(this.audioContext.destination);
                this.analyser.fftSize = 256;
                this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            } catch (e) {
                console.error("Audio Analysis failed to initialize:", e);
            }
        } else if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    toMenu() {
        window.location.reload();
    }

    gameOver() {
        this.gameState = 'GAME_OVER';
        this.audio.pause();

        // Hide mobile controls
        this.hideMobileControls();

        // Use adjusted time from anti-cheat (excludes paused time)
        const survivalTime = this.antiCheat 
            ? this.antiCheat.getAdjustedSurvivalTime().toFixed(2)
            : ((Date.now() - this.startTime) / 1000).toFixed(2);
        this.lastSurvivalTime = parseFloat(survivalTime); // Store for score submission
        document.getElementById('final-score').innerText = `SURVIVED: ${survivalTime}s`;
        
        // Update best score display
        this.updateBestScoreDisplay();
        
        // Check for rewards before showing game over screen
        this.checkForReward(this.lastSurvivalTime).then(reward => {
            if (reward) {
                // Show reward screen first
                this.showRewardScreen(reward);
            } else {
                // Show game over screen directly
                this.showGameOverScreen();
            }
        }).catch(err => {
            console.error('Error checking reward:', err);
            this.showGameOverScreen();
        });
    }

    /**
     * Shows the game over screen.
     */
    showGameOverScreen() {
        document.getElementById('game-over-screen').classList.remove('hidden');
        document.getElementById('game-over-screen').classList.add('active');
        document.getElementById('hud').classList.add('hidden');
    }

    /**
     * Checks if the player earned a reward for their survival time.
     * @param {number} survivalTime - The player's survival time in seconds
     * @returns {Promise<Object|null>} The reward object or null
     */
    async checkForReward(survivalTime) {
        // Block rewards for flagged players
        if (this.antiCheat && this.antiCheat.isPlayerFlagged()) {
            console.log('Rewards blocked: player flagged by anti-cheat');
            return null;
        }
        
        try {
            const playerId = getPlayerId();
            const response = await fetch('/api/rewards/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playerId, score: survivalTime })
            });
            
            const data = await response.json();
            
            if (data.success && data.earned && data.reward) {
                return data.reward;
            }
            return null;
        } catch (error) {
            console.error('Error checking for reward:', error);
            return null;
        }
    }

    /**
     * Shows the reward screen with the earned reward.
     * @param {Object} reward - The reward object with message and code
     */
    showRewardScreen(reward) {
        const rewardScreen = document.getElementById('reward-screen');
        const rewardMessage = document.getElementById('reward-message');
        const rewardCode = document.getElementById('reward-code');
        const copyBtn = document.getElementById('copy-reward-btn');
        const copyFeedback = document.getElementById('copy-feedback');
        const continueBtn = document.getElementById('reward-continue-btn');
        
        if (!rewardScreen) {
            this.showGameOverScreen();
            return;
        }
        
        // Set reward content
        if (rewardMessage) rewardMessage.textContent = reward.message;
        if (rewardCode) rewardCode.textContent = reward.code;
        
        // Hide HUD and show reward screen
        document.getElementById('hud').classList.add('hidden');
        rewardScreen.classList.remove('hidden');
        rewardScreen.classList.add('active');
        
        // Copy button handler
        const copyHandler = () => {
            navigator.clipboard.writeText(reward.code).then(() => {
                if (copyFeedback) {
                    copyFeedback.classList.add('show');
                    setTimeout(() => copyFeedback.classList.remove('show'), 2000);
                }
            }).catch(err => {
                console.error('Failed to copy:', err);
                // Fallback: select the text
                const range = document.createRange();
                range.selectNode(rewardCode);
                window.getSelection().removeAllRanges();
                window.getSelection().addRange(range);
            });
        };
        
        // Continue button handler
        const continueHandler = () => {
            rewardScreen.classList.add('hidden');
            rewardScreen.classList.remove('active');
            this.showGameOverScreen();
            
            // Remove event listeners
            if (copyBtn) copyBtn.removeEventListener('click', copyHandler);
            if (continueBtn) continueBtn.removeEventListener('click', continueHandler);
        };
        
        // Attach handlers
        if (copyBtn) {
            copyBtn.removeEventListener('click', copyHandler); // Remove any existing
            copyBtn.addEventListener('click', copyHandler);
        }
        if (continueBtn) {
            continueBtn.removeEventListener('click', continueHandler); // Remove any existing
            continueBtn.addEventListener('click', continueHandler);
        }
    }

    victory() {
        // Check if player was flagged for cheating
        if (this.antiCheat && this.antiCheat.isPlayerFlagged()) {
            this.antiCheat.showCheaterMessage('Victory blocked');
            return;
        }
        
        this.gameState = 'VICTORY';
        this.audio.pause();

        // Hide mobile controls
        this.hideMobileControls();

        // Use adjusted time from anti-cheat (excludes paused time)
        const survivalTime = this.antiCheat 
            ? this.antiCheat.getAdjustedSurvivalTime().toFixed(2)
            : ((Date.now() - this.startTime) / 1000).toFixed(2);
        this.lastSurvivalTime = parseFloat(survivalTime);

        document.getElementById('win-screen').classList.remove('hidden');
        document.getElementById('win-screen').classList.add('active');
        document.getElementById('win-score').innerText = `TIME: ${survivalTime}s`;
    }

    /**
     * Shows the boss victory screen after surviving the 3D arena.
     * Requirements: 5.1, 5.2
     */
    showBossVictory() {
        this.gameState = 'BOSS_VICTORY';
        this.audio.pause();

        // Use adjusted time from anti-cheat (excludes paused time)
        const survivalTime = this.antiCheat 
            ? this.antiCheat.getAdjustedSurvivalTime().toFixed(2)
            : ((Date.now() - this.startTime) / 1000).toFixed(2);
        this.lastSurvivalTime = parseFloat(survivalTime);

        // Show boss victory screen with special message
        document.getElementById('hud').classList.add('hidden');
        
        // Check if boss victory screen exists, if not use win screen
        let bossVictoryScreen = document.getElementById('boss-victory-screen');
        if (!bossVictoryScreen) {
            // Use win screen with modified message
            document.getElementById('win-screen').classList.remove('hidden');
            document.getElementById('win-screen').classList.add('active');
            document.getElementById('win-score').innerText = 'send a screen to me in the help thread, you monster';
        } else {
            bossVictoryScreen.classList.remove('hidden');
            bossVictoryScreen.classList.add('active');
        }
    }

    /**
     * Called when a stage is completed (not final victory).
     * Pauses gameplay, shows transition screen, and plays relaxation music.
     * Requirements: 2.1, 2.3, 7.1, 7.3
     */
    stageComplete() {
        this.gameState = 'STAGE_COMPLETE';
        
        // Pause current music
        this.audio.pause();
        
        // Show stage complete screen
        document.getElementById('hud').classList.add('hidden');
        document.getElementById('stage-complete-screen').classList.remove('hidden');
        document.getElementById('stage-complete-screen').classList.add('active');
        
        // Start playing relaxation music (Dirtmouth.mp3)
        // Requirements: 7.1
        if (this.stageManager) {
            const relaxationUrl = this.stageManager.getRelaxationMusicUrl();
            this.pendingAudioUrl = relaxationUrl;
            this.audio.src = relaxationUrl;
            this.audio.loop = true;
            this.audio.volume = 0.7;
            this.audio.load();
            this.audio.play()
                .then(() => console.log('Relaxation music playing'))
                .catch(e => {
                    console.error('Relaxation music failed to play:', e);
                    this.handleAudioError('Failed to load relaxation music');
                });
        }
    }

    /**
     * Starts the boss phase after Stage 2 completion.
     * Initializes BossPhaseManager and transitions to boss phase gameplay.
     * Requirements: 1.1, 9.1
     */
    startBossPhase() {
        console.log('Starting Boss Phase...');
        
        // Increment to Stage 3 (Boss Phase)
        if (this.stageManager) {
            this.stageManager.nextStage();
        }
        
        // Initialize BossPhaseManager if not already created
        if (!this.bossPhaseManager) {
            this.bossPhaseManager = new BossPhaseManager(this);
        }
        
        // Reset obstacles for boss phase
        this.obstacles.reset();
        
        // Reset player position
        this.player.reset();
        
        // Set game state to boss phase
        this.gameState = 'BOSS_PHASE';
        
        // Reset timing for boss phase
        this.startTime = Date.now();
        this.lastTime = Date.now();
        
        // Stop regular game audio and start boss phase 1 music - Requirements: 9.1
        if (this.audio) {
            this.audio.pause();
        }
        
        // Initialize and start boss music controller
        if (!this.bossMusicController) {
            this.bossMusicController = new BossMusicController(this);
        }
        this.bossMusicController.playPhase1();
        
        // Start the boss phase with countdown
        this.bossPhaseManager.start();
        
        // Continue game loop
        requestAnimationFrame(this.loop);
    }

    /**
     * Called when player clicks Continue to proceed to next stage.
     * Fades out relaxation music, resets obstacles while preserving score,
     * increments stage and loads new music.
     * Requirements: 2.4, 2.5, 7.2
     */
    continueToNextStage() {
        // Store current score to preserve across stage transition
        const preservedScore = this.score;
        
        // Use crossfade for smooth audio transition
        this.crossfadeToNextStage(preservedScore);
    }

    /**
     * Performs audio crossfade during stage transition.
     * Fades out current track over 1 second, then fades in new track.
     * Requirements: 7.2
     * @param {number} preservedScore - Score to preserve from previous stage
     */
    crossfadeToNextStage(preservedScore) {
        const fadeDuration = 1000; // 1 second fade
        const fadeSteps = 10;
        const fadeInterval = fadeDuration / fadeSteps;
        const volumeStep = this.audio.volume / fadeSteps;
        
        // Fade out current track
        const fadeOutInterval = setInterval(() => {
            if (this.audio.volume > volumeStep) {
                this.audio.volume -= volumeStep;
            } else {
                clearInterval(fadeOutInterval);
                this.audio.pause();
                this.audio.volume = 0;
                
                // Proceed with stage transition and fade in new track
                this.completeStageTransitionWithFadeIn(preservedScore);
            }
        }, fadeInterval);
    }

    /**
     * Completes the stage transition after music fade out, then fades in new track.
     * @param {number} preservedScore - Score to preserve from previous stage
     */
    completeStageTransitionWithFadeIn(preservedScore) {
        // Hide stage complete screen
        document.getElementById('stage-complete-screen').classList.add('hidden');
        document.getElementById('stage-complete-screen').classList.remove('active');
        document.getElementById('hud').classList.remove('hidden');
        
        // Increment stage
        if (this.stageManager) {
            this.stageManager.nextStage();
            // Update background for new stage
            this.stageManager.setBackground(this.stageManager.currentStage);
        }
        
        // Reset obstacles while preserving score
        this.obstacles.reset();
        this.score = preservedScore;
        
        // Reset player position
        this.player.reset();
        
        // Load new stage music
        if (this.stageManager) {
            const newMusicUrl = this.stageManager.getMusicUrl();
            console.log('Loading new stage music:', newMusicUrl);
            this.pendingAudioUrl = newMusicUrl;
            this.audio.src = newMusicUrl;
            this.audio.loop = true;
            this.audio.volume = 0; // Start at 0 for fade in
            this.audio.load();
        }
        
        // Reset timing for new stage
        this.startTime = Date.now();
        this.lastTime = Date.now();
        this.gameState = 'PLAYING';
        
        // Start playing new music with fade in after it's loaded
        const playAudio = () => {
            this.audio.play()
                .then(() => {
                    console.log('Stage music playing, starting fade in');
                    this.fadeInAudio(1.0, 1000); // Fade to full volume over 1 second
                })
                .catch(e => {
                    console.error('Stage music failed:', e);
                    this.handleAudioError('Failed to load stage music');
                });
        };
        
        // Try to play immediately, or wait for canplaythrough event
        if (this.audio.readyState >= 3) {
            playAudio();
        } else {
            this.audio.addEventListener('canplaythrough', playAudio, { once: true });
        }
        
        // Resume game loop
        requestAnimationFrame(this.loop);
    }

    /**
     * Fades in audio to target volume over specified duration.
     * Requirements: 7.2
     * @param {number} targetVolume - Target volume (0.0 to 1.0)
     * @param {number} duration - Fade duration in milliseconds
     */
    fadeInAudio(targetVolume, duration) {
        const fadeSteps = 10;
        const fadeInterval = duration / fadeSteps;
        const volumeStep = targetVolume / fadeSteps;
        
        const fadeInInterval = setInterval(() => {
            if (this.audio.volume < targetVolume - volumeStep) {
                this.audio.volume += volumeStep;
            } else {
                this.audio.volume = targetVolume;
                clearInterval(fadeInInterval);
                console.log('Audio fade in complete');
            }
        }, fadeInterval);
    }

    togglePause() {
        if (this.gameState === 'PLAYING') {
            this.gameState = 'PAUSED';
            this.audio.pause();
            // Show pause overlay
            document.getElementById('hud').innerHTML += '<div id="pause-overlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);display:flex;flex-direction:column;justify-content:center;align-items:center;z-index:1000;"><h1 style="color:#fff;font-size:4rem;font-family:Cinzel,serif;">PAUSED</h1><p style="color:#888;margin-top:1rem;">Press ESC to resume</p></div>';
        } else if (this.gameState === 'PAUSED') {
            this.gameState = 'PLAYING';
            this.audio.play();
            const overlay = document.getElementById('pause-overlay');
            if (overlay) overlay.remove();
            this.lastTime = Date.now();
            requestAnimationFrame(this.loop);
        }
    }

    update(dt) {
        // Handle boss phase update
        if (this.gameState === 'BOSS_PHASE') {
            this.updateBossPhase(dt);
            return;
        }
        
        // Handle 3D arena update
        if (this.gameState === 'ARENA_3D') {
            if (this.arena3D) {
                this.arena3D.update(dt);
            }
            return;
        }
        
        if (this.gameState !== 'PLAYING') return;

        // Timer
        const elapsed = (Date.now() - this.startTime) / 1000;
        document.getElementById('timer').innerText = this.formatTime(elapsed);

        // Stage completion detection using StageManager
        // Requirements: 2.1
        if (this.stageManager && this.stageManager.isStageComplete(elapsed)) {
            // Check if there are more stages
            const currentStage = this.stageManager.currentStage;
            const maxStage = Object.keys(this.stageManager.stageConfigs).length;
            
            if (currentStage < maxStage) {
                // Check if next stage is boss phase
                const nextStageConfig = this.stageManager.stageConfigs[currentStage + 1];
                if (nextStageConfig && nextStageConfig.isBossPhase) {
                    // Stage 2 complete - trigger boss phase entry
                    // Requirements: 1.1
                    this.startBossPhase();
                } else {
                    // More regular stages available - show stage complete screen
                    this.stageComplete();
                }
            } else {
                // Final stage complete - show victory
                this.victory();
            }
            return; // Exit update to prevent further processing
        } else if (!this.stageManager && elapsed > this.duration) {
            // Fallback for when StageManager is not available
            this.victory();
            return;
        }

        // Camera Shake Decay
        if (this.camera.shake > 0) {
            this.camera.shake *= 0.9;
            if (this.camera.shake < 0.5) this.camera.shake = 0;
        }

        this.player.update(dt);
        this.obstacles.update(dt, elapsed, this.particles);
        this.particles.update(dt);
        this.lights.update(dt);
        
        // Update uncanny eyes effect (Stage 1 only)
        if (this.uncannyEyes && this.stageManager && this.stageManager.currentStage === 1) {
            this.uncannyEyes.update(dt);
        }

        // Player trail particles (reduced frequency)
        if ((Math.abs(this.player.vx) > 100 || !this.player.isGrounded) && Math.random() < 0.15) {
            this.particles.emit(this.player.x, this.player.y + this.player.size / 3, 1, this.keys.jump ? '#4aaef5' : '#fff');
        }
    }

    /**
     * Updates the boss phase gameplay.
     * Requirements: 1.1, 1.3, 1.4, 9.3, 9.4
     * @param {number} dt - Delta time in seconds
     */
    updateBossPhase(dt) {
        // Timer
        const elapsed = (Date.now() - this.startTime) / 1000;
        document.getElementById('timer').innerText = this.formatTime(elapsed);
        
        // Camera Shake Decay
        if (this.camera.shake > 0) {
            this.camera.shake *= 0.9;
            if (this.camera.shake < 0.5) this.camera.shake = 0;
        }
        
        // Update boss music controller for bass-driven shake - Requirements: 9.3, 9.4
        if (this.bossMusicController) {
            this.bossMusicController.update();
        }
        
        // Update boss phase manager
        if (this.bossPhaseManager) {
            this.bossPhaseManager.update(dt);
            
            // Check if transitioning to 3D arena
            if (this.bossPhaseManager.getState() === 'TRANSITIONING') {
                // Transition is handled by BossPhaseManager.triggerTransition()
                return;
            }
        }
        
        // Only update player and obstacles when boss phase is ACTIVE (not during countdown)
        if (this.bossPhaseManager && this.bossPhaseManager.getState() === 'ACTIVE') {
            this.player.update(dt);
            this.obstacles.update(dt, elapsed, this.particles);
        }
        
        this.particles.update(dt);
        this.lights.update(dt);
    }

    draw() {
        // Clear
        this.ctx.fillStyle = '#0f0b15'; // Base bg color to clear trails
        // this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); 
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();

        // Apply Camera Shake
        const shakeX = (Math.random() - 0.5) * this.camera.shake;
        const shakeY = (Math.random() - 0.5) * this.camera.shake;
        this.ctx.translate(shakeX, shakeY);
        
        // Apply mobile scale (de-zoom on mobile devices)
        if (this.mobileScale !== 1.0) {
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            this.ctx.translate(centerX, centerY);
            this.ctx.scale(this.mobileScale, this.mobileScale);
            this.ctx.translate(-centerX, -centerY);
        }

        if (this.gameState === 'PLAYING') {
            // Draw Floor
            this.ctx.fillStyle = '#1a1624';
            this.ctx.fillRect(0, this.floorY, this.canvas.width, 10); // Thin line

            // Draw visual floor
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(50, this.floorY, this.canvas.width - 100, 20); // The "Safety" platform

            // Render entities
            this.lights.draw(this.ctx); // Real beams
            this.obstacles.draw(this.ctx);
            this.particles.draw(this.ctx);
            this.player.draw(this.ctx);
            
            // Draw uncanny eyes effect (Stage 1 only, drawn on top)
            if (this.uncannyEyes && this.stageManager && this.stageManager.currentStage === 1) {
                this.uncannyEyes.draw(this.ctx);
            }
        }
        
        // Draw boss phase elements
        // Requirements: 1.1, 1.2, 1.3, 3.1, 3.2
        if (this.gameState === 'BOSS_PHASE') {
            // Draw Floor
            this.ctx.fillStyle = '#1a1624';
            this.ctx.fillRect(0, this.floorY, this.canvas.width, 10);

            // Draw visual floor
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(50, this.floorY, this.canvas.width - 100, 20);

            // Draw boss phase components
            if (this.bossPhaseManager) {
                this.bossPhaseManager.draw(this.ctx);
            }
            
            // Draw obstacles (lasers, boulders)
            this.obstacles.draw(this.ctx);
            
            // Draw particles
            this.particles.draw(this.ctx);
            
            // Draw player (only when not in countdown)
            if (this.bossPhaseManager && this.bossPhaseManager.getState() !== 'COUNTDOWN') {
                this.player.draw(this.ctx);
            } else if (this.bossPhaseManager && this.bossPhaseManager.getState() === 'COUNTDOWN') {
                // Draw player during countdown but dimmed
                this.ctx.globalAlpha = 0.5;
                this.player.draw(this.ctx);
                this.ctx.globalAlpha = 1.0;
            }
        }

        this.ctx.restore();
    }

    loop() {
        // Check if paused by anti-cheat (visibility change)
        if (this.antiCheat && this.antiCheat.isPaused()) {
            return; // Don't continue loop while paused
        }
        
        const now = Date.now();
        let dt = (now - this.lastTime) / 1000;
        if (dt > 0.1) dt = 0.1; // CAP DT to prevent tunneling/explosions
        this.lastTime = now;

        // Handle 3D arena mode
        if (this.gameState === 'ARENA_3D' && this.arena3D) {
            if (this.antiCheat && this.antiCheat.isPaused()) return;
            
            this.arena3D.update(dt);
            this.arena3D.render();
            
            if (this.arena3D.isActive()) {
                requestAnimationFrame(this.loop);
            }
            return;
        }

        this.update(dt);
        this.draw();

        // Continue loop for PLAYING, BOSS_PHASE states
        if (this.gameState === 'PLAYING' || this.gameState === 'BOSS_PHASE') {
            requestAnimationFrame(this.loop);
        }
    }

    shake(amount) {
        this.camera.shake = amount;
        const body = document.body;
        if (amount > 10) {
            body.classList.add('shake-screen-hard');
            setTimeout(() => body.classList.remove('shake-screen-hard'), 500);
        } else {
            body.classList.add('shake-screen');
            setTimeout(() => body.classList.remove('shake-screen'), 500);
        }
    }

    formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
}

class Player {
    constructor(game) {
        this.game = game;
        this.size = 30;
        this.reset();

        // Platformer Physics
        this.friction = 0.8;
        this.gravity = 2000;
        this.jumpForce = -750;
        this.speed = 400;
        
        // Tilt properties
        this.tiltAngle = 0;
        this.targetTilt = 0;
        this.lastDirection = 0; // -1 left, 0 none, 1 right
    }

    reset() {
        this.x = window.innerWidth / 2;
        // Spawn exactly on floor to avoid fall damage or tunneling on start
        this.y = this.game.floorY - this.size / 2;
        this.vx = 0;
        this.vy = 0;
        this.isGrounded = true;
        this.color = '#fff';
        this.tiltAngle = 0;
        this.targetTilt = 0;
        this.lastDirection = 0;
    }

    jump() {
        if (this.isGrounded) {
            this.vy = this.jumpForce;
            this.isGrounded = false;
            this.game.particles.emit(this.x, this.y + this.size / 2, 10, '#fff');
            
            // Set tilt direction based on movement
            if (this.game.keys.left) {
                this.lastDirection = -1;
                this.targetTilt = -0.3; // Tilt left (negative radians)
            } else if (this.game.keys.right) {
                this.lastDirection = 1;
                this.targetTilt = 0.3; // Tilt right (positive radians)
            } else {
                // If no direction, use last direction or slight random
                this.targetTilt = this.lastDirection * 0.2;
            }
        }
    }

    update(dt) {
        // Horizontal Movement
        if (this.game.keys.left) {
            this.vx = -this.speed;
            this.lastDirection = -1;
        } else if (this.game.keys.right) {
            this.vx = this.speed;
            this.lastDirection = 1;
        } else {
            this.vx *= this.friction; // Slide to stop
        }
        
        // Update tilt angle smoothly
        if (!this.isGrounded) {
            // While in air, smoothly approach target tilt
            this.tiltAngle += (this.targetTilt - this.tiltAngle) * 0.15;
        } else {
            // On ground, smoothly return to upright
            this.tiltAngle *= 0.85;
            this.targetTilt = 0;
        }

        // Apply Gravity
        this.vy += this.gravity * dt;

        // Apply Velocity
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Bounds - Fallbox
        if (this.y > window.innerHeight + 100) {
            this.game.gameOver();
        }

        // Platform Collision
        // Platform Collision
        const platStart = 50;
        const platEnd = window.innerWidth - 50;
        const platY = this.game.floorY;
        const feetY = this.y + this.size / 2;
        // Approximation of previous feet Y based on velocity
        const prevFeetY = (this.y - this.vy * dt) + this.size / 2;

        // First check main platform collision
        let landedOnMainPlatform = false;
        if (this.vy >= 0 && this.x > platStart && this.x < platEnd) {
            // 1. Check if we crossed that platform line in this frame (Tunneling check)
            // 2. Or if we are just slightly overlapping (Standard check)
            if ((feetY >= platY && prevFeetY <= platY + 20) || (Math.abs(feetY - platY) < 10)) {
                this.y = platY - this.size / 2;
                this.vy = 0;
                this.isGrounded = true;
                landedOnMainPlatform = true;
            }
        }

        // Check floating isle collision if not landed on main platform
        // Requirements: 6.4
        if (!landedOnMainPlatform && this.vy >= 0) {
            let landedOnIsle = false;
            
            // Check collision with each active floating isle
            if (this.game.obstacles && this.game.obstacles.floatingIsles) {
                for (const isle of this.game.obstacles.floatingIsles) {
                    if (!isle.active) continue;
                    
                    // Check horizontal overlap
                    const playerLeft = this.x - this.size / 2;
                    const playerRight = this.x + this.size / 2;
                    const horizontalOverlap = playerRight > isle.x && playerLeft < isle.x + isle.width;
                    
                    if (horizontalOverlap) {
                        // Check if player's feet are landing on the isle's top surface
                        const isleTop = isle.y;
                        const isleBottom = isle.y + isle.height;
                        
                        // Landing detection: feet crossed or near the isle top while falling
                        if ((feetY >= isleTop && prevFeetY <= isleTop + 15) || 
                            (feetY >= isleTop && feetY <= isleBottom + 5)) {
                            // Land on the isle
                            this.y = isleTop - this.size / 2;
                            this.vy = 0;
                            this.isGrounded = true;
                            landedOnIsle = true;
                            break;
                        }
                    }
                }
            }
            
            if (!landedOnIsle && !landedOnMainPlatform) {
                this.isGrounded = false;
            }
        } else if (!landedOnMainPlatform) {
            this.isGrounded = false;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Shadow/Glow
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.game.keys.jump ? '#4aaef5' : '#fff'; // Blue jump, white normal

        // Draw Player (Cube)
        ctx.fillStyle = '#0f0b15'; // Dark core
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;

        // Apply tilt based on movement direction
        if (!this.isGrounded) {
            ctx.rotate(this.tiltAngle);
        }

        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        ctx.strokeRect(-this.size / 2, -this.size / 2, this.size, this.size);

        // Inner eye/detail
        ctx.fillStyle = this.game.keys.jump ? '#4aaef5' : '#fff';
        ctx.fillRect(-5, -5, 10, 10);

        ctx.restore();
    }
}

class ObstacleManager {
    constructor(game) {
        this.game = game;
        this.hazards = [];
        this.projectiles = [];
        this.lasers = [];
        this.floatingIsles = []; // Track active floating isles for Stage 2
        this.floorPulse = null;
        this.lastSpawnTime = 0;
        this.lastProjectileTime = 0;
        this.lastFloorPulseTime = 0;
        this.lastLaserTime = 0;
        this.lastImpactCheck = 0; // Track last impact trigger check timestamp
        this.lastIsleSpawnTime = 0; // Track last floating isle spawn time
        
        // Boss phase hazards
        // Requirements: 2.1, 2.2, 2.3, 2.4
        this.boulders = [];
        this.cornerLasers = [];
        this.lastBoulderSpawnTime = 0;
        this.lastCornerLaserSpawnTime = 0;

        // RGB/Neon color palette with gradient colors
        this.COLORS = [
            { ray: '#4FC3FF', rayGlow: '#0af', block: '#4FC3FF' },   // blue
            { ray: '#FF5A5A', rayGlow: '#f55', block: '#FF5A5A' },   // red
            { ray: '#FFFFFF', rayGlow: '#fff', block: '#FFFFFF' },   // white
            { ray: '#C77DFF', rayGlow: '#a5f', block: '#C77DFF' }    // neon purple
        ];

        // Block shape patterns (relative positions)
        this.BLOCK_SHAPES = [
            [[0, 0]],                           // Single block
            [[0, 0]],                           // Single block (more common)
            [[0, 0], [1, 0]],                   // Two horizontal
            [[0, 0], [0, -1]],                  // Two vertical
            [[0, 0], [1, 0], [0, -1]],          // L-shape
            [[0, 0], [1, 0], [1, -1]],          // Reverse L
            [[0, 0], [1, 0], [2, 0]],           // Three horizontal
        ];

        // Config
        this.RAY_WIDTH = 9;
        this.BLOCK_SIZE = 50; // Increased for more difficulty
        this.FALL_SPEED = 4;
        this.PROJECTILE_INTERVAL = 1800;
        this.FLOOR_PULSE_INTERVAL = 8000;
        this.LASER_INTERVAL = 6000; // 6 seconds between lasers
    }

    reset() {
        this.hazards = [];
        this.projectiles = [];
        this.lasers = [];
        this.floatingIsles = [];
        this.floorPulse = null;
        this.lastSpawnTime = 0;
        this.lastProjectileTime = 0;
        this.lastFloorPulseTime = 0;
        this.lastLaserTime = 0;
        this.lastImpactCheck = 0;
        this.lastIsleSpawnTime = 0;
        
        // Reset boss phase hazards
        // Requirements: 2.1, 2.2, 2.3, 2.4
        this.boulders = [];
        this.cornerLasers = [];
        this.lastBoulderSpawnTime = 0;
        this.lastCornerLaserSpawnTime = 0;
    }

    /**
     * Triggers a flash effect on the screen for impact moments.
     * Creates a brief white overlay that fades out quickly.
     */
    triggerFlashEffect() {
        // Create flash overlay element if it doesn't exist
        let flashOverlay = document.getElementById('impact-flash');
        if (!flashOverlay) {
            flashOverlay = document.createElement('div');
            flashOverlay.id = 'impact-flash';
            flashOverlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: white;
                pointer-events: none;
                z-index: 999;
                opacity: 0;
                transition: opacity 0.1s ease-out;
            `;
            document.body.appendChild(flashOverlay);
        }
        
        // Trigger flash
        flashOverlay.style.opacity = '0.7';
        
        // Fade out
        setTimeout(() => {
            flashOverlay.style.opacity = '0';
        }, 50);
    }

    // Get current phase based on elapsed time (seconds)
    getPhase(elapsed) {
        if (elapsed < 3) return 'INTRO';
        if (elapsed < 7) return 'FIRST_PULSE';
        if (elapsed < 45) return 'CALM';
        if (elapsed < 56) return 'BUILD';
        if (elapsed < 60) return 'MINI_DROP';
        if (elapsed < 118) return 'CORE';
        if (elapsed < 122) return 'BREAK';
        return 'FINAL';
    }

    // Get spawn interval and warning time based on phase
    getPhaseConfig(phase) {
        switch (phase) {
            case 'INTRO':
                return { spawnInterval: 9999, warningTime: 2500, fallSpeed: 0, shake: 0 };
            case 'FIRST_PULSE':
                return { spawnInterval: 1500, warningTime: 2000, fallSpeed: 4, shake: 0 };
            case 'CALM':
                return { spawnInterval: 800, warningTime: 1500, fallSpeed: 5, shake: 0 };
            case 'BUILD':
                return { spawnInterval: 500, warningTime: 1200, fallSpeed: 6, shake: 1 };
            case 'MINI_DROP':
                return { spawnInterval: 350, warningTime: 800, fallSpeed: 8, shake: 2 };
            case 'CORE':
                return { spawnInterval: 300, warningTime: 700, fallSpeed: 9, shake: 1.5 };
            case 'BREAK':
                return { spawnInterval: 9999, warningTime: 2000, fallSpeed: 0, shake: 0 };
            case 'FINAL':
                return { spawnInterval: 200, warningTime: 500, fallSpeed: 12, shake: 4 };
            default:
                return { spawnInterval: 900, warningTime: 1500, fallSpeed: 5, shake: 0 };
        }
    }

    spawnHazard(warningTime, fallSpeed) {
        // Use phase-based color palette if available
        // Requirements: 5.2, 5.3
        let colorPalette = this.COLORS;
        if (this.currentPhaseConfig && this.currentPhaseConfig.colorPalette) {
            const paletteName = this.currentPhaseConfig.colorPalette;
            if (typeof COLOR_PALETTES !== 'undefined' && COLOR_PALETTES[paletteName]) {
                colorPalette = COLOR_PALETTES[paletteName];
            }
        }
        
        const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
        const shape = this.BLOCK_SHAPES[Math.floor(Math.random() * this.BLOCK_SHAPES.length)];
        const maxWidth = shape.reduce((max, [dx]) => Math.max(max, dx), 0) + 1;
        const x = 50 + Math.floor(Math.random() * (window.innerWidth - 100 - this.BLOCK_SIZE * maxWidth));

        // Store glow intensity from current phase for visual effects
        const glowIntensity = this.currentPhaseConfig ? (this.currentPhaseConfig.glowIntensity || 0.5) : 0.5;

        this.hazards.push({
            x,
            blockY: -this.BLOCK_SIZE * 2,
            color,
            shape,
            startTime: Date.now(),
            warningTime: warningTime,
            fallSpeed: fallSpeed,
            phase: 'WARNING',
            hit: false,
            glowIntensity: glowIntensity
        });
    }

    spawnLaser(type) {
        const color = this.COLORS[Math.floor(Math.random() * this.COLORS.length)];

        this.lasers.push({
            type: type, // 'horizontal' or 'vertical'
            color: color,
            startTime: Date.now(), // Tracking by absolute time
            active: true,
            x: type === 'vertical' ? 80 + Math.random() * (window.innerWidth - 160) : 0,
            y: type === 'horizontal' ? this.game.floorY - 30 - Math.random() * 80 : 0
        });
    }

    spawnFloorPulse() {
        this.floorPulse = {
            state: 'WARN',
            timer: 0,
            warnTime: 1.0,
            activeTime: 0.3
        };
    }
    spawnProjectile() {
        const fromLeft = Math.random() > 0.5;
        const y = this.game.floorY - 20 - (Math.random() * 40);
        const x = fromLeft ? -30 : window.innerWidth + 30;
        const vx = fromLeft ? 250 : -250;

        // Random color from a vibrant palette
        const projectileColors = [
            { main: '#FF6B6B', glow: '#FF4444', core: '#FFB3B3' }, // Red
            { main: '#4ECDC4', glow: '#26A69A', core: '#A7E8E4' }, // Teal
            { main: '#FFE66D', glow: '#FFD93D', core: '#FFF4B3' }, // Yellow
            { main: '#C77DFF', glow: '#9D4EDD', core: '#E0B3FF' }, // Purple
            { main: '#95E1D3', glow: '#5CDB95', core: '#C8F7E8' }, // Mint
            { main: '#FF9F43', glow: '#FF7F00', core: '#FFCF9F' }, // Orange
            { main: '#74B9FF', glow: '#0984E3', core: '#B3D9FF' }, // Blue
        ];
        const color = projectileColors[Math.floor(Math.random() * projectileColors.length)];

        this.projectiles.push({
            x, y, vx,
            baseY: y, // Store base Y for floating animation
            floatOffset: Math.random() * Math.PI * 2, // Random phase offset
            floatSpeed: 2 + Math.random() * 2, // Random float speed
            floatAmount: 8 + Math.random() * 8, // Random float amplitude (8-16px)
            radius: 12,
            color: color,
            active: true
        });
    }

    /**
     * Spawns a floating isle at a random position above the main platform.
     * Isles appear at varying heights and serve as temporary platforms.
     * Requirements: 6.1, 6.3
     */
    spawnFloatingIsle() {
        const floorY = this.game.floorY;
        const minHeight = 80;  // Minimum height above floor
        const maxHeight = 250; // Maximum height above floor
        const minSafeHeight = 50; // Minimum distance from screen top
        
        // Random width between 80 and 150 pixels
        const width = 80 + Math.random() * 70;
        
        // Random X position ensuring isle stays within screen bounds
        const x = 80 + Math.random() * (window.innerWidth - 160 - width);
        
        // Random Y position at varying heights above the main platform
        // Y must be: less than (floorY - minHeight) and greater than minSafeHeight
        const minY = minSafeHeight;
        const maxY = floorY - minHeight;
        const y = minY + Math.random() * (maxY - minY);
        
        // Duration between 3-6 seconds
        const duration = 3000 + Math.random() * 3000;
        
        this.floatingIsles.push(new FloatingIsle(x, y, width, duration));
    }

    /**
     * Spawns a boulder at a random X position that falls without warning.
     * Boulders take exactly 1.5 seconds to reach the ground.
     * Requirements: 2.2, 2.3
     */
    spawnBoulder() {
        const x = 50 + Math.random() * (window.innerWidth - 100);
        const boulder = new Boulder(x, this.game.floorY);
        this.boulders.push(boulder);
    }

    /**
     * Spawns a corner laser targeting the player's current position.
     * Lasers spawn from upper corners (0,0) or (screenWidth, 0).
     * Requirements: 2.1
     * @param {string} corner - Which corner to spawn from: 'left' or 'right'
     */
    spawnCornerLaser(corner) {
        const player = this.game.player;
        const targetX = player.x;
        const targetY = player.y;
        const laser = new CornerLaser(corner, targetX, targetY);
        this.cornerLasers.push(laser);
    }

    /**
     * Updates all boss phase hazards (boulders and corner lasers).
     * Requirements: 2.1, 2.2, 2.3, 2.4
     * @param {number} dt - Delta time in seconds
     */
    updateBossPhaseHazards(dt) {
        // Update boulders
        this.boulders.forEach(boulder => boulder.update(dt));
        this.boulders = this.boulders.filter(boulder => boulder.active);

        // Update corner lasers
        this.cornerLasers.forEach(laser => laser.update(dt));
        this.cornerLasers = this.cornerLasers.filter(laser => laser.active);
    }

    /**
     * Draws all boss phase hazards (boulders and corner lasers).
     * Requirements: 2.1, 2.2
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    drawBossPhaseHazards(ctx) {
        // Draw boulders
        this.boulders.forEach(boulder => boulder.draw(ctx));

        // Draw corner lasers
        this.cornerLasers.forEach(laser => laser.draw(ctx));
    }

    update(dt, elapsed, particles) {
        // Use StageManager for phase config if available, otherwise fall back to local methods
        // Requirements: 4.1-4.12, 6.2
        let config;
        if (this.game.stageManager) {
            config = this.game.stageManager.getPhase(elapsed);
            // Apply stage-specific block size
            this.BLOCK_SIZE = this.game.stageManager.getBlockSize();
        } else {
            const phase = this.getPhase(elapsed);
            config = this.getPhaseConfig(phase);
        }
        
        // Store current phase config for visual effects
        // Requirements: 5.2, 5.3, 5.4
        this.currentPhaseConfig = config;
        
        const now = Date.now();
        const floorY = this.game.floorY;

        // Check for impact triggers and apply visual effects
        if (isImpactTrigger(elapsed, this.lastImpactCheck)) {
            // Trigger screen shake effect (reduced for less intensity)
            this.game.shake(4);
            
            // Trigger flash effect by adding a brief white overlay
            this.triggerFlashEffect();
        }
        this.lastImpactCheck = elapsed;

        // Spawn falling hazards based on phase timing
        if (now - this.lastSpawnTime > config.spawnInterval && config.spawnInterval < 9000) {
            this.spawnHazard(config.warningTime, config.fallSpeed);
            this.lastSpawnTime = now;

            // Beat visual pump
            document.body.classList.add('pulse-bg');
            setTimeout(() => document.body.classList.remove('pulse-bg'), 100);
        }

        // Spawn side projectiles (rare, every 1.8s after intro)
        if (elapsed > 7 && now - this.lastProjectileTime > this.PROJECTILE_INTERVAL) {
            this.spawnProjectile();
            this.lastProjectileTime = now;
        }

        // Spawn floor pulse (rare, every 8s during intense phases)
        const phaseName = config.name || '';
        if ((phaseName === 'BUILD' || phaseName === 'CORE' || phaseName === 'FINAL') &&
            now - this.lastFloorPulseTime > this.FLOOR_PULSE_INTERVAL && !this.floorPulse) {
            this.spawnFloorPulse();
            this.lastFloorPulseTime = now;
        }

        // Spawn side lasers (every 25s as requested)
        // Removed phase restriction to ensure they appear
        if (now - this.lastLaserTime > 25000) {
            const type = Math.random() > 0.5 ? 'horizontal' : 'vertical';
            this.spawnLaser(type);
            this.lastLaserTime = now;
        }

        // Spawn floating isles for Stage 2 during appropriate phases
        // Requirements: 6.1
        if (this.game.stageManager && this.game.stageManager.areFloatingIslesEnabled()) {
            // Spawn isles every 4-6 seconds during non-intro/outro phases
            const isleSpawnInterval = 4000 + Math.random() * 2000;
            const phaseName = config.name || phase;
            const isActivePhase = phaseName !== 'INTRO' && phaseName !== 'OUTRO' && 
                                  phaseName !== 'CALM_INTRO' && phaseName !== 'COOLDOWN';
            
            if (isActivePhase && now - this.lastIsleSpawnTime > isleSpawnInterval) {
                this.spawnFloatingIsle();
                this.lastIsleSpawnTime = now;
            }
        }

        // Update floating isles
        this.floatingIsles.forEach(isle => isle.update(dt));
        this.floatingIsles = this.floatingIsles.filter(isle => isle.active);

        // Update lasers
        this.lasers.forEach(l => {
            const timeActive = (now - l.startTime) / 1000;
            if (timeActive >= 3.0) {
                l.active = false;
            }
        });
        this.lasers = this.lasers.filter(l => l.active);

        // Update falling hazards
        this.hazards.forEach(h => {
            const hazardElapsed = now - h.startTime;

            if (h.phase === 'WARNING') {
                if (hazardElapsed >= h.warningTime) {
                    h.phase = 'FALLING';
                    h.blockY = 0;
                }
            } else {
                h.blockY += h.fallSpeed;

                // Impact effect when block hits floor
                if (!h.impacted && h.blockY >= floorY - this.BLOCK_SIZE) {
                    h.impacted = true;
                    if (particles) {
                        particles.emit(h.x + this.BLOCK_SIZE / 2, floorY, 8, h.color.block);
                    }
                    this.game.shake(0.5); // Light shake for block landing
                }
            }
        });
        this.hazards = this.hazards.filter(h => h.blockY < window.innerHeight + 50);

        // Update projectiles with floating animation
        const time = Date.now() / 1000;
        this.projectiles.forEach(p => {
            p.x += p.vx * dt;
            // Floating up/down animation
            if (p.baseY !== undefined) {
                p.y = p.baseY + Math.sin(time * p.floatSpeed + p.floatOffset) * p.floatAmount;
            }
            if (p.x < -50 || p.x > window.innerWidth + 50) {
                p.active = false;
            }
        });
        this.projectiles = this.projectiles.filter(p => p.active);

        // Update boss phase hazards (boulders and corner lasers)
        // Requirements: 2.1, 2.2, 2.3, 2.4
        this.updateBossPhaseHazards(dt);

        // Update floor pulse
        if (this.floorPulse) {
            this.floorPulse.timer += dt;
            if (this.floorPulse.state === 'WARN') {
                if (this.floorPulse.timer > this.floorPulse.warnTime) {
                    this.floorPulse.state = 'ACTIVE';
                    this.floorPulse.timer = 0;
                    this.game.shake(1); // Reduced floor pulse shake
                }
            } else if (this.floorPulse.state === 'ACTIVE') {
                if (this.floorPulse.timer > this.floorPulse.activeTime) {
                    this.floorPulse = null;
                }
            }
        }

        // Check collisions
        this.checkCollisions(config.shake);
    }

    checkCollisions(shakeAmount) {
        const player = this.game.player;
        const px = player.x;
        const py = player.y;
        const ps = player.size * 0.7;

        // Falling blocks (check each block in shape)
        for (let h of this.hazards) {
            if (h.phase === 'FALLING' && !h.hit) {
                for (let [dx, dy] of h.shape) {
                    const hx = h.x + dx * this.BLOCK_SIZE;
                    const hy = h.blockY + dy * this.BLOCK_SIZE;
                    const hs = this.BLOCK_SIZE;

                    if (px - ps / 2 < hx + hs && px + ps / 2 > hx && py - ps / 2 < hy + hs && py + ps / 2 > hy) {
                        h.hit = true;
                        this.game.shake(shakeAmount);
                        this.game.gameOver();
                        return;
                    }
                }
            }
        }

        // Projectiles (circle collision)
        for (let p of this.projectiles) {
            const dx = px - p.x;
            const dy = py - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < p.radius + ps / 2) {
                this.game.gameOver();
                return;
            }
        }

        // Lasers
        for (let l of this.lasers) {
            const timeActive = (Date.now() - l.startTime) / 1000;

            // Should be firing between 1s and 3s
            if (timeActive >= 1.0 && timeActive < 3.0) {
                const beamSize = 20;

                if (l.type === 'horizontal') {
                    if (py > l.y - beamSize / 2 && py < l.y + beamSize / 2) {
                        this.game.gameOver();
                        return;
                    }
                } else if (l.type === 'vertical') {
                    if (px > l.x - beamSize / 2 && px < l.x + beamSize / 2) {
                        this.game.gameOver();
                        return;
                    }
                }
            }
        }

        // Floor pulse
        if (this.floorPulse && this.floorPulse.state === 'ACTIVE') {
            if (player.isGrounded) {
                this.game.gameOver();
                return;
            }
        }

        // Boss phase hazards - Boulders
        // Requirements: 2.4
        for (let boulder of this.boulders) {
            if (boulder.checkCollision(player)) {
                this.game.shake(shakeAmount);
                this.game.gameOver();
                return;
            }
        }

        // Boss phase hazards - Corner Lasers
        // Requirements: 2.4
        for (let laser of this.cornerLasers) {
            if (laser.checkCollision(player)) {
                this.game.shake(shakeAmount);
                this.game.gameOver();
                return;
            }
        }
    }

    draw(ctx) {
        // Draw floor pulse first (behind everything)
        if (this.floorPulse) {
            this.drawFloorPulse(ctx);
        }

        // Draw floating isles (behind hazards but above floor pulse)
        this.floatingIsles.forEach(isle => {
            isle.draw(ctx);
        });

        // Draw lasers (behind hazards)
        this.lasers.forEach(l => {
            this.drawLaser(ctx, l);
        });

        // Draw falling hazards
        this.hazards.forEach(h => {
            if (h.phase === 'WARNING') {
                this.drawWarningRay(ctx, h);
            }
            if (h.phase === 'FALLING') {
                this.drawBlock(ctx, h);
            }
        });

        // Draw projectiles
        this.projectiles.forEach(p => {
            this.drawProjectile(ctx, p);
        });

        // Draw boss phase hazards (boulders and corner lasers)
        // Requirements: 2.1, 2.2
        this.drawBossPhaseHazards(ctx);
    }

    drawWarningRay(ctx, h) {
        const floorY = this.game.floorY;
        const time = Date.now();
        
        // Apply phase-based glow intensity
        // Requirements: 5.2, 5.3
        const glowIntensity = h.glowIntensity || 0.5;

        ctx.save();

        // Calculate the bounding box of all blocks in shape
        let minX = Infinity, maxX = -Infinity;
        h.shape.forEach(([dx, dy]) => {
            const blockLeft = h.x + dx * this.BLOCK_SIZE;
            const blockRight = blockLeft + this.BLOCK_SIZE;
            if (blockLeft < minX) minX = blockLeft;
            if (blockRight > maxX) maxX = blockRight;
        });

        const centerX = (minX + maxX) / 2;
        const totalWidth = maxX - minX;

        // Pulsing width effect - more intense during DROP phases
        const pulseSpeed = 0.015 + (glowIntensity * 0.01);
        const pulseAmount = 0.3 + (glowIntensity * 0.2);
        const pulse = 1 + Math.sin(time * pulseSpeed) * pulseAmount;
        const rayWidth = (totalWidth / 2 + this.RAY_WIDTH) * pulse;

        // Outer halo (big soft glow) - intensity based on phase
        ctx.globalAlpha = 0.3 * glowIntensity;
        ctx.shadowBlur = 50 * glowIntensity;
        ctx.shadowColor = h.color.rayGlow;
        ctx.fillStyle = h.color.ray;
        ctx.fillRect(centerX - rayWidth * 1.2, 0, rayWidth * 2.4, floorY);

        // Main ray with gradient
        ctx.globalAlpha = 0.7 + (glowIntensity * 0.3);
        const gradient = ctx.createLinearGradient(centerX - rayWidth, 0, centerX + rayWidth, 0);
        gradient.addColorStop(0, 'rgba(255,255,255,0)');
        gradient.addColorStop(0.15, h.color.ray);
        gradient.addColorStop(0.5, '#fff');
        gradient.addColorStop(0.85, h.color.ray);
        gradient.addColorStop(1, 'rgba(255,255,255,0)');

        ctx.shadowBlur = 30 * glowIntensity;
        ctx.shadowColor = h.color.rayGlow;
        ctx.fillStyle = gradient;
        ctx.fillRect(centerX - rayWidth, 0, rayWidth * 2, floorY);

        // Bright core line
        ctx.globalAlpha = 0.9;
        ctx.shadowBlur = 15 * glowIntensity;
        ctx.shadowColor = '#fff';
        ctx.fillStyle = '#fff';
        ctx.fillRect(centerX - 2, 0, 4, floorY);

        // Flicker overlay - more intense during DROP phases
        const flickerSpeed = 0.03 + (glowIntensity * 0.02);
        const flicker = 0.6 + Math.sin(time * flickerSpeed) * 0.4;
        ctx.globalAlpha = flicker * 0.5 * glowIntensity;
        ctx.fillStyle = h.color.ray;
        ctx.fillRect(centerX - rayWidth, 0, rayWidth * 2, floorY);

        ctx.restore();
    }

    drawBlock(ctx, h) {
        ctx.save();
        ctx.fillStyle = h.color.block;
        
        // Apply phase-based glow intensity
        // Requirements: 5.2, 5.3, 5.4
        const glowIntensity = h.glowIntensity || 0.5;
        const baseGlow = 15;
        ctx.shadowBlur = baseGlow + (glowIntensity * 25); // 15-40 range based on intensity
        ctx.shadowColor = h.color.block;

        // Draw each block in the shape
        h.shape.forEach(([dx, dy]) => {
            ctx.fillRect(
                h.x + dx * this.BLOCK_SIZE,
                h.blockY + dy * this.BLOCK_SIZE,
                this.BLOCK_SIZE,
                this.BLOCK_SIZE
            );
        });
        ctx.restore();
    }

    drawLaser(ctx, l) {
        const timeActive = (Date.now() - l.startTime) / 1000;
        ctx.save();

        // Phase 1: Warning (0-1s) - White line scanning across
        if (timeActive < 1.0) {
            const progress = timeActive / 1.0;

            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.shadowColor = '#fff';
            ctx.shadowBlur = 10;
            ctx.globalAlpha = 0.8;

            ctx.beginPath();
            if (l.type === 'horizontal') {
                ctx.moveTo(0, l.y);
                ctx.lineTo(window.innerWidth * progress, l.y);
            } else {
                ctx.moveTo(l.x, 0);
                ctx.lineTo(l.x, this.game.floorY * progress);
            }
            ctx.stroke();

            // Bright leading dot
            ctx.fillStyle = '#fff';
            ctx.shadowBlur = 15;
            if (l.type === 'horizontal') {
                ctx.fillRect(window.innerWidth * progress, l.y - 2, 4, 4);
            } else {
                ctx.fillRect(l.x - 2, this.game.floorY * progress, 4, 4);
            }

        }
        // Phase 2: Firing (1s - 3s)
        else if (timeActive < 3.0) {
            // Neon Multicolor Effect
            const hue = (Date.now() / 2) % 360;
            const color = `hsl(${hue}, 100%, 60%)`;
            const beamSize = 20;

            ctx.globalAlpha = 1;
            ctx.shadowBlur = 20;
            ctx.shadowColor = color;
            ctx.fillStyle = color;

            if (l.type === 'horizontal') {
                // Outer Glow
                ctx.fillRect(0, l.y - beamSize / 2, window.innerWidth, beamSize);
                // White Core
                ctx.fillStyle = '#fff';
                ctx.shadowBlur = 0;
                ctx.fillRect(0, l.y - beamSize / 4, window.innerWidth, beamSize / 2);
                
                // Draw impact particles at edges
                this.drawLaserImpactParticles(ctx, 0, l.y, color);
                this.drawLaserImpactParticles(ctx, window.innerWidth, l.y, color);
            } else {
                // Outer Glow
                ctx.fillRect(l.x - beamSize / 2, 0, beamSize, this.game.floorY);
                // White Core
                ctx.fillStyle = '#fff';
                ctx.shadowBlur = 0;
                ctx.fillRect(l.x - beamSize / 4, 0, beamSize / 2, this.game.floorY);
                
                // Draw impact particles at top and floor
                this.drawLaserImpactParticles(ctx, l.x, 0, color);
                this.drawLaserImpactParticles(ctx, l.x, this.game.floorY, color);
            }

            // Screen shake at start of fire
            if (timeActive < 1.1) {
                // this.game.shake(2); // Light continuous shake
            }
        }

        ctx.restore();
    }

    /**
     * Draws tiny impact particles where lasers hit surfaces.
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} x - X position of impact
     * @param {number} y - Y position of impact
     * @param {string} color - Color of the particles
     */
    drawLaserImpactParticles(ctx, x, y, color) {
        const time = Date.now();
        const particleCount = 5;
        
        ctx.save();
        
        for (let i = 0; i < particleCount; i++) {
            // Create animated particle positions
            const angle = (i / particleCount) * Math.PI * 2 + (time * 0.005);
            const distance = 8 + Math.sin(time * 0.01 + i) * 5;
            const px = x + Math.cos(angle) * distance;
            const py = y + Math.sin(angle) * distance;
            const size = 2 + Math.sin(time * 0.02 + i * 0.5) * 1;
            
            // Draw particle
            ctx.beginPath();
            ctx.arc(px, py, size, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.shadowBlur = 8;
            ctx.shadowColor = color;
            ctx.globalAlpha = 0.6 + Math.sin(time * 0.015 + i) * 0.3;
            ctx.fill();
        }
        
        // Add a few extra sparkles
        for (let i = 0; i < 3; i++) {
            const sparkAngle = (time * 0.003 + i * 2.1) % (Math.PI * 2);
            const sparkDist = 12 + Math.sin(time * 0.008 + i) * 4;
            const sx = x + Math.cos(sparkAngle) * sparkDist;
            const sy = y + Math.sin(sparkAngle) * sparkDist;
            
            ctx.beginPath();
            ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.shadowBlur = 5;
            ctx.shadowColor = '#fff';
            ctx.globalAlpha = 0.8;
            ctx.fill();
        }
        
        ctx.restore();
    }

    drawProjectile(ctx, p) {
        ctx.save();
        
        // Get color (use default blue if no color set)
        const color = p.color || { main: '#4FC3FF', glow: '#0088cc', core: '#8ff' };
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);

        // Colorful gradient sphere
        const grad = ctx.createRadialGradient(p.x - 3, p.y - 3, 0, p.x, p.y, p.radius);
        grad.addColorStop(0, color.core);
        grad.addColorStop(0.5, color.main);
        grad.addColorStop(1, color.glow);

        ctx.fillStyle = grad;
        ctx.shadowBlur = 20;
        ctx.shadowColor = color.main;
        ctx.fill();
        
        // Add a small bright core
        ctx.beginPath();
        ctx.arc(p.x - 2, p.y - 2, p.radius * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.8;
        ctx.fill();
        
        ctx.restore();
    }

    drawFloorPulse(ctx) {
        const fp = this.floorPulse;
        const floorY = this.game.floorY;

        ctx.save();
        if (fp.state === 'WARN') {
            // Glowing warning
            const alpha = fp.timer / fp.warnTime;
            ctx.fillStyle = `rgba(255, 60, 60, ${alpha * 0.6})`;
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#f33';
            ctx.fillRect(50, floorY, window.innerWidth - 100, 20);
        } else if (fp.state === 'ACTIVE') {
            // Full danger
            ctx.fillStyle = '#ff3333';
            ctx.shadowBlur = 30;
            ctx.shadowColor = '#f00';
            ctx.fillRect(50, floorY - 5, window.innerWidth - 100, 30);
        }
        ctx.restore();
    }
}

class ParticleSystem {
    constructor(game) {
        this.particles = [];
    }

    emit(x, y, count, color) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 200,
                vy: (Math.random() - 0.5) * 200,
                life: 1.0,
                color: color
            });
        }
    }

    update(dt) {
        this.particles.forEach(p => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
        });
        this.particles = this.particles.filter(p => p.life > 0);
    }

    draw(ctx) {
        this.particles.forEach(p => {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.life * 10); // Spin based on life
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            const size = 4 + (1 - p.life) * 4; // Grow as they fade
            ctx.fillRect(-size / 2, -size / 2, size, size);
            ctx.restore();
        });
        ctx.globalAlpha = 1;
    }
}

class LightSystem {
    constructor(game) {
        this.game = game;
        // Disabled - no background ambient lights
    }

    update(dt) {
        // Disabled
    }

    draw(ctx) {
        // Disabled
    }
}

// ==================== VOID PORTAL CLASS ====================

/**
 * VoidPortal class - Central void portal visual element for Boss Phase.
 * Creates a tearing animation effect in the upper-middle portion of the screen.
 * Requirements: 1.1
 */
class VoidPortal {
    /**
     * Creates a new VoidPortal instance.
     * @param {number} x - X position (center of portal)
     * @param {number} y - Y position (center of portal)
     */
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 80;
        this.tearProgress = 0; // 0-1 for animation
        this.active = false;
        
        // Visual properties
        this.innerRadius = 30;
        this.pulsePhase = 0;
        this.rotationAngle = 0;
        this.tearLines = [];
        
        // Generate random tear lines for the tearing effect
        this.generateTearLines();
    }

    /**
     * Generates random tear lines for the portal's tearing visual effect.
     */
    generateTearLines() {
        const numLines = 12;
        for (let i = 0; i < numLines; i++) {
            this.tearLines.push({
                angle: (i / numLines) * Math.PI * 2,
                length: 0.5 + Math.random() * 0.5,
                speed: 0.8 + Math.random() * 0.4,
                offset: Math.random() * Math.PI * 2
            });
        }
    }

    /**
     * Starts the portal tearing animation.
     */
    start() {
        this.active = true;
        this.tearProgress = 0;
    }

    /**
     * Updates the portal animation state.
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        if (!this.active) return;

        // Progress the tearing animation
        if (this.tearProgress < 1) {
            this.tearProgress += dt * 0.5; // Takes 2 seconds to fully open
            if (this.tearProgress > 1) this.tearProgress = 1;
        }

        // Update pulse and rotation
        this.pulsePhase += dt * 3;
        this.rotationAngle += dt * 0.5;
    }

    /**
     * Draws the void portal with distortion/tearing effect.
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    draw(ctx) {
        if (!this.active) return;

        ctx.save();
        ctx.translate(this.x, this.y);

        const progress = this.tearProgress;
        const pulse = 1 + Math.sin(this.pulsePhase) * 0.1;
        const fastPulse = 1 + Math.sin(this.pulsePhase * 3) * 0.05;
        const currentRadius = this.radius * progress * pulse;
        const currentInnerRadius = this.innerRadius * progress * pulse;

        // Outer cosmic aura (multiple layers)
        for (let layer = 3; layer >= 0; layer--) {
            ctx.globalAlpha = 0.15 * progress * (1 - layer * 0.2);
            ctx.shadowBlur = 80 * progress;
            ctx.shadowColor = layer % 2 === 0 ? '#FF00FF' : '#00FFFF';
            
            const layerRadius = currentRadius * (1.8 + layer * 0.3);
            const layerGradient = ctx.createRadialGradient(0, 0, currentInnerRadius, 0, 0, layerRadius);
            layerGradient.addColorStop(0, 'rgba(255, 0, 255, 0.6)');
            layerGradient.addColorStop(0.3, 'rgba(139, 0, 255, 0.4)');
            layerGradient.addColorStop(0.6, 'rgba(0, 255, 255, 0.2)');
            layerGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            
            ctx.fillStyle = layerGradient;
            ctx.beginPath();
            ctx.arc(0, 0, layerRadius, 0, Math.PI * 2);
            ctx.fill();
        }

        // Swirling energy spirals
        ctx.globalAlpha = 0.6 * progress;
        ctx.lineWidth = 3;
        for (let spiral = 0; spiral < 4; spiral++) {
            const spiralOffset = (spiral / 4) * Math.PI * 2;
            const hue = (spiral * 60 + this.pulsePhase * 30) % 360;
            ctx.strokeStyle = `hsl(${hue}, 100%, 70%)`;
            ctx.shadowBlur = 20;
            ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
            
            ctx.beginPath();
            for (let t = 0; t < Math.PI * 4; t += 0.1) {
                const spiralRadius = currentInnerRadius + (currentRadius - currentInnerRadius) * (t / (Math.PI * 4));
                const angle = t + spiralOffset + this.rotationAngle * 2;
                const x = Math.cos(angle) * spiralRadius * progress;
                const y = Math.sin(angle) * spiralRadius * progress;
                if (t === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        // Energy tendrils reaching outward
        ctx.globalAlpha = 0.7 * progress;
        for (let i = 0; i < 8; i++) {
            const tendrilAngle = (i / 8) * Math.PI * 2 + this.rotationAngle;
            const tendrilLength = currentRadius * (0.8 + Math.sin(this.pulsePhase * 2 + i) * 0.3);
            const wobble = Math.sin(this.pulsePhase * 3 + i * 0.5) * 10;
            
            const gradient = ctx.createLinearGradient(
                Math.cos(tendrilAngle) * currentInnerRadius,
                Math.sin(tendrilAngle) * currentInnerRadius,
                Math.cos(tendrilAngle) * tendrilLength,
                Math.sin(tendrilAngle) * tendrilLength
            );
            gradient.addColorStop(0, '#FF00FF');
            gradient.addColorStop(0.5, '#8B00FF');
            gradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
            
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 4 - i * 0.3;
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#FF00FF';
            
            ctx.beginPath();
            ctx.moveTo(Math.cos(tendrilAngle) * currentInnerRadius, Math.sin(tendrilAngle) * currentInnerRadius);
            ctx.quadraticCurveTo(
                Math.cos(tendrilAngle + 0.2) * (tendrilLength * 0.6) + wobble,
                Math.sin(tendrilAngle + 0.2) * (tendrilLength * 0.6) + wobble,
                Math.cos(tendrilAngle) * tendrilLength,
                Math.sin(tendrilAngle) * tendrilLength
            );
            ctx.stroke();
        }

        // Tearing lines effect (enhanced)
        ctx.globalAlpha = 0.9 * progress;
        this.tearLines.forEach((line, idx) => {
            const lineProgress = Math.min(1, progress * line.speed);
            const lineLength = currentRadius * line.length * lineProgress * 1.2;
            const wobble = Math.sin(this.pulsePhase * 2 + line.offset) * 8;
            
            const hue = (idx * 30 + this.pulsePhase * 20) % 360;
            ctx.strokeStyle = `hsl(${hue}, 100%, 80%)`;
            ctx.lineWidth = 2 + Math.sin(this.pulsePhase + idx) * 1;
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#FFFFFF';
            
            ctx.save();
            ctx.rotate(line.angle + this.rotationAngle * 0.3);
            ctx.beginPath();
            ctx.moveTo(currentInnerRadius * 0.5, wobble);
            ctx.lineTo(lineLength, wobble * 0.3);
            ctx.stroke();
            
            // Add spark at end of tear line
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(lineLength, wobble * 0.3, 3 * fastPulse, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        // Multiple portal rings with rotation
        for (let ring = 0; ring < 3; ring++) {
            ctx.globalAlpha = (0.9 - ring * 0.25) * progress;
            const ringRadius = currentRadius * (0.7 + ring * 0.15);
            const ringRotation = this.rotationAngle * (ring % 2 === 0 ? 1 : -1) * (1 + ring * 0.5);
            
            ctx.strokeStyle = ring === 0 ? '#FF00FF' : ring === 1 ? '#C77DFF' : '#00FFFF';
            ctx.lineWidth = (4 - ring) * progress;
            ctx.shadowBlur = 30;
            ctx.shadowColor = ctx.strokeStyle;
            
            ctx.save();
            ctx.rotate(ringRotation);
            ctx.beginPath();
            // Draw dashed ring for outer rings
            if (ring > 0) {
                ctx.setLineDash([10, 10]);
            }
            ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }

        // Inner void (enhanced black hole effect)
        ctx.globalAlpha = progress;
        const innerGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, currentInnerRadius * 1.2);
        innerGradient.addColorStop(0, '#000000');
        innerGradient.addColorStop(0.4, '#0a001a');
        innerGradient.addColorStop(0.7, '#1a0033');
        innerGradient.addColorStop(0.9, '#330066');
        innerGradient.addColorStop(1, '#660099');
        
        ctx.fillStyle = innerGradient;
        ctx.shadowBlur = 30;
        ctx.shadowColor = '#000000';
        ctx.beginPath();
        ctx.arc(0, 0, currentInnerRadius * 1.1, 0, Math.PI * 2);
        ctx.fill();

        // Swirling particles inside void
        ctx.globalAlpha = 0.8 * progress;
        for (let p = 0; p < 12; p++) {
            const particleAngle = (p / 12) * Math.PI * 2 + this.pulsePhase * 2;
            const particleRadius = currentInnerRadius * (0.3 + Math.sin(this.pulsePhase * 3 + p) * 0.2);
            const px = Math.cos(particleAngle) * particleRadius;
            const py = Math.sin(particleAngle) * particleRadius;
            
            ctx.fillStyle = p % 2 === 0 ? '#FF00FF' : '#00FFFF';
            ctx.shadowBlur = 10;
            ctx.shadowColor = ctx.fillStyle;
            ctx.beginPath();
            ctx.arc(px, py, 2 + Math.sin(this.pulsePhase + p) * 1, 0, Math.PI * 2);
            ctx.fill();
        }

        // Bright pulsing center core
        ctx.globalAlpha = 0.9 * progress;
        const coreGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 8 * fastPulse);
        coreGradient.addColorStop(0, '#FFFFFF');
        coreGradient.addColorStop(0.5, '#FF00FF');
        coreGradient.addColorStop(1, 'rgba(139, 0, 255, 0)');
        
        ctx.fillStyle = coreGradient;
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(0, 0, 8 * fastPulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    /**
     * Resets the portal to initial state.
     */
    reset() {
        this.tearProgress = 0;
        this.active = false;
        this.pulsePhase = 0;
        this.rotationAngle = 0;
    }

    /**
     * Checks if a player is colliding with the portal.
     * @param {Player} player - The player object
     * @returns {boolean} True if player is inside the portal
     */
    checkPlayerCollision(player) {
        if (!this.active || this.tearProgress < 1) return false;
        
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Player collides if within the inner radius of the portal
        return dist < this.innerRadius + player.size / 2;
    }
}

// ==================== TRANSITION SCREEN CLASS ====================

/**
 * TransitionScreen class - Handles the grey screen with typewriter text between phases.
 * Displays dramatic typewriter text, Continue button, and instructions.
 * Requirements: 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5
 */
class TransitionScreen {
    /**
     * Creates a new TransitionScreen instance.
     * @param {Game} game - Reference to the main game instance
     */
    constructor(game) {
        this.game = game;
        this.active = false;
        
        // Fade properties
        this.fadeProgress = 0;
        this.fadeDuration = 0.5; // 0.5 seconds fade-in
        
        // Typewriter properties
        this.text = "Bravo! you made i-...wait...actually? nah... time for the 3d phase";
        this.displayedChars = 0;
        this.charDelay = 50; // 50ms per character
        this.charTimer = 0;
        this.textComplete = false;
        
        // Button and instructions state
        this.showContinue = false;
        this.showInstructions = false;
        this.instructionLines = [
            "- collect those little hovering white shards",
            "- collect 15 of them"
        ];
        
        // Callback for when transition is complete
        this.onComplete = null;
        
        // Create DOM elements
        this.createDOMElements();
    }

    /**
     * Creates the DOM elements for the transition screen.
     */
    createDOMElements() {
        // Check if elements already exist
        if (document.getElementById('transition-screen')) {
            this.container = document.getElementById('transition-screen');
            this.textElement = document.getElementById('transition-text');
            this.continueBtn = document.getElementById('transition-continue-btn');
            this.instructionsElement = document.getElementById('transition-instructions');
            return;
        }
        
        // Create container
        this.container = document.createElement('div');
        this.container.id = 'transition-screen';
        this.container.className = 'transition-screen hidden';
        
        // Create text element
        this.textElement = document.createElement('div');
        this.textElement.id = 'transition-text';
        this.textElement.className = 'transition-text';
        
        // Create continue button
        this.continueBtn = document.createElement('button');
        this.continueBtn.id = 'transition-continue-btn';
        this.continueBtn.className = 'transition-continue-btn hidden';
        this.continueBtn.textContent = 'Continue';
        this.continueBtn.addEventListener('click', () => this.onContinueClick());
        
        // Create instructions element
        this.instructionsElement = document.createElement('div');
        this.instructionsElement.id = 'transition-instructions';
        this.instructionsElement.className = 'transition-instructions hidden';
        
        // Assemble
        this.container.appendChild(this.textElement);
        this.container.appendChild(this.continueBtn);
        this.container.appendChild(this.instructionsElement);
        document.body.appendChild(this.container);
    }

    /**
     * Starts the transition screen.
     * @param {Function} onComplete - Callback when transition is complete
     */
    start(onComplete) {
        this.active = true;
        this.fadeProgress = 0;
        this.displayedChars = 0;
        this.charTimer = 0;
        this.textComplete = false;
        this.showContinue = false;
        this.showInstructions = false;
        this.onComplete = onComplete;
        
        // Reset DOM elements
        this.textElement.textContent = '';
        this.continueBtn.classList.add('hidden');
        this.instructionsElement.classList.add('hidden');
        this.instructionsElement.innerHTML = '';
        
        // Show container
        this.container.classList.remove('hidden');
        this.container.classList.add('active');
    }

    /**
     * Updates the transition screen state.
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        if (!this.active) return;
        
        // Update fade-in
        if (this.fadeProgress < 1) {
            this.fadeProgress += dt / this.fadeDuration;
            if (this.fadeProgress > 1) this.fadeProgress = 1;
            this.container.style.opacity = this.fadeProgress;
        }
        
        // Update typewriter effect (only after fade is mostly complete)
        if (this.fadeProgress > 0.8 && !this.textComplete) {
            this.charTimer += dt * 1000; // Convert to ms
            
            while (this.charTimer >= this.charDelay && this.displayedChars < this.text.length) {
                this.displayedChars++;
                this.charTimer -= this.charDelay;
                this.textElement.textContent = this.text.substring(0, this.displayedChars);
            }
            
            // Check if text is complete
            if (this.displayedChars >= this.text.length) {
                this.textComplete = true;
                this.showContinue = true;
                this.continueBtn.classList.remove('hidden');
            }
        }
    }

    /**
     * Handles the Continue button click.
     * Requirements: 4.3, 4.4, 4.5
     */
    onContinueClick() {
        if (!this.showInstructions) {
            // First click - show instructions
            this.showInstructions = true;
            this.continueBtn.textContent = 'Start';
            
            // Display instructions
            this.instructionsElement.classList.remove('hidden');
            this.instructionsElement.innerHTML = this.instructionLines
                .map(line => `<p>${line}</p>`)
                .join('');
        } else {
            // Second click - complete transition
            this.complete();
        }
    }

    /**
     * Completes the transition and triggers callback.
     */
    complete() {
        this.active = false;
        this.container.classList.add('hidden');
        this.container.classList.remove('active');
        
        if (this.onComplete) {
            this.onComplete();
        }
    }

    /**
     * Draws the transition screen (for canvas-based rendering if needed).
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    draw(ctx) {
        // DOM-based rendering is used, but this method is here for compatibility
        if (!this.active) return;
    }

    /**
     * Resets the transition screen to initial state.
     */
    reset() {
        this.active = false;
        this.fadeProgress = 0;
        this.displayedChars = 0;
        this.charTimer = 0;
        this.textComplete = false;
        this.showContinue = false;
        this.showInstructions = false;
        
        if (this.container) {
            this.container.classList.add('hidden');
            this.container.classList.remove('active');
        }
    }
}

// ==================== ORBITING BLOCK CLASS ====================

/**
 * OrbitingBlock class - Neon-colored blocks that orbit around a central point.
 * Used in the Boss Phase to create a halo pattern around the central white block.
 * Requirements: 1.2
 */
class OrbitingBlock {
    /**
     * Creates a new OrbitingBlock instance.
     * @param {number} centerX - X position of the orbit center
     * @param {number} centerY - Y position of the orbit center
     * @param {number} orbitRadius - Radius of the circular orbit
     * @param {number} angle - Initial angle in radians
     * @param {string} color - Neon color for the block
     */
    constructor(centerX, centerY, orbitRadius, angle, color) {
        this.centerX = centerX;
        this.centerY = centerY;
        this.orbitRadius = orbitRadius;
        this.angle = angle;
        this.angularSpeed = 0.02; // radians per frame (approximately 1.2 rad/s at 60fps)
        this.color = color;
        this.size = 20;
        
        // Visual properties
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.glowIntensity = 0.8;
    }

    /**
     * Updates the orbital position by advancing the angle.
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        // Update angle based on angular speed (convert to per-second rate)
        this.angle += this.angularSpeed * 60 * dt;
        
        // Keep angle in 0-2π range
        if (this.angle > Math.PI * 2) {
            this.angle -= Math.PI * 2;
        }
        
        // Update pulse phase for glow effect
        this.pulsePhase += dt * 4;
    }

    /**
     * Calculates the current x,y position from the angle.
     * Position is exactly (centerX + radius * cos(θ), centerY + radius * sin(θ))
     * @returns {{x: number, y: number}} Current position
     */
    getPosition() {
        return {
            x: this.centerX + this.orbitRadius * Math.cos(this.angle),
            y: this.centerY + this.orbitRadius * Math.sin(this.angle)
        };
    }

    /**
     * Draws the orbiting block with neon glow effect.
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    draw(ctx) {
        const pos = this.getPosition();
        this.x = pos.x; // Store for energy line drawing
        this.y = pos.y;
        const pulse = 1 + Math.sin(this.pulsePhase) * 0.15;
        const fastPulse = 1 + Math.sin(this.pulsePhase * 2) * 0.1;
        const currentSize = this.size * pulse;

        ctx.save();
        ctx.translate(pos.x, pos.y);
        
        // Rotate block based on orbit angle for visual interest
        ctx.rotate(this.angle * 2);

        // Trail effect (motion blur)
        ctx.globalAlpha = 0.15;
        for (let trail = 3; trail > 0; trail--) {
            const trailOffset = trail * 4;
            ctx.fillStyle = this.color;
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.color;
            ctx.fillRect(-currentSize/2 - trailOffset, -currentSize/2, currentSize, currentSize);
        }

        // Outer energy field
        ctx.globalAlpha = 0.25;
        ctx.shadowBlur = 35;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.fillRect(-currentSize * 0.9, -currentSize * 0.9, currentSize * 1.8, currentSize * 1.8);

        // Outer glow
        ctx.globalAlpha = 0.5 * this.glowIntensity;
        ctx.shadowBlur = 25;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.fillRect(-currentSize * 0.7, -currentSize * 0.7, currentSize * 1.4, currentSize * 1.4);

        // Main block with gradient
        ctx.globalAlpha = 0.95;
        ctx.shadowBlur = 15;
        const mainGradient = ctx.createLinearGradient(-currentSize/2, -currentSize/2, currentSize/2, currentSize/2);
        mainGradient.addColorStop(0, this.color);
        mainGradient.addColorStop(0.5, '#FFFFFF');
        mainGradient.addColorStop(1, this.color);
        ctx.fillStyle = mainGradient;
        ctx.fillRect(-currentSize / 2, -currentSize / 2, currentSize, currentSize);

        // Inner rotating pattern
        ctx.save();
        ctx.rotate(-this.pulsePhase * 0.5);
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#FFFFFF';
        const innerSize = currentSize * 0.6;
        ctx.strokeRect(-innerSize/2, -innerSize/2, innerSize, innerSize);
        ctx.restore();

        // Bright inner core with pulsing
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#FFFFFF';
        const coreGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, currentSize * 0.25 * fastPulse);
        coreGradient.addColorStop(0, '#FFFFFF');
        coreGradient.addColorStop(0.7, this.color);
        coreGradient.addColorStop(1, 'rgba(255,255,255,0.5)');
        ctx.fillStyle = coreGradient;
        ctx.beginPath();
        ctx.arc(0, 0, currentSize * 0.25 * fastPulse, 0, Math.PI * 2);
        ctx.fill();

        // Border glow
        ctx.globalAlpha = 0.8;
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 8;
        ctx.shadowColor = this.color;
        ctx.strokeRect(-currentSize / 2, -currentSize / 2, currentSize, currentSize);

        // Corner sparkles
        ctx.globalAlpha = 0.9 * fastPulse;
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowBlur = 5;
        const sparkleSize = 3;
        ctx.fillRect(-currentSize/2 - 1, -currentSize/2 - 1, sparkleSize, sparkleSize);
        ctx.fillRect(currentSize/2 - sparkleSize + 1, -currentSize/2 - 1, sparkleSize, sparkleSize);
        ctx.fillRect(-currentSize/2 - 1, currentSize/2 - sparkleSize + 1, sparkleSize, sparkleSize);
        ctx.fillRect(currentSize/2 - sparkleSize + 1, currentSize/2 - sparkleSize + 1, sparkleSize, sparkleSize);

        ctx.restore();
    }

    /**
     * Updates the center position (for when the central block moves).
     * @param {number} centerX - New center X position
     * @param {number} centerY - New center Y position
     */
    setCenter(centerX, centerY) {
        this.centerX = centerX;
        this.centerY = centerY;
    }
}

// ==================== NEON COLOR PALETTE ====================

/**
 * Neon color palette for orbiting blocks.
 * Requirements: 1.2
 */
const NEON_COLORS = [
    '#FF00FF', // Magenta
    '#00FFFF', // Cyan
    '#FF0080', // Hot Pink
    '#80FF00', // Lime
    '#FF8000', // Orange
    '#0080FF', // Electric Blue
    '#FF0040', // Red-Pink
    '#40FF00', // Bright Green
    '#8000FF', // Purple
    '#FFFF00', // Yellow
    '#00FF80', // Mint
    '#FF4000'  // Red-Orange
];

// ==================== CENTRAL BLOCK CLASS ====================

/**
 * CentralBlock class - White block at the center with orbiting neon blocks.
 * Creates the halo pattern for the Boss Phase visual effect.
 * Requirements: 1.2
 */
class CentralBlock {
    /**
     * Creates a new CentralBlock instance with orbiting blocks.
     * @param {number} x - X position of the central block
     * @param {number} y - Y position of the central block
     * @param {number} blockCount - Number of orbiting blocks (8-12)
     */
    constructor(x, y, blockCount = 10) {
        this.x = x;
        this.y = y;
        this.size = 40;
        this.active = false;
        
        // Visual properties
        this.pulsePhase = 0;
        this.glowIntensity = 1.0;
        
        // Emergence animation properties
        this.emergenceScale = 1.0;  // Scale during emergence (0-1)
        this.blocksOpacity = 1.0;   // Opacity of orbiting blocks during fade-in (0-1)
        
        // Block throwing properties (Requirements: 2.1, 2.4)
        this.timeSinceEmergence = 0;
        this.hasThrown = false;
        
        // Orbiting blocks array
        this.orbitingBlocks = [];
        this.orbitRadius = 120;
        
        // Initialize orbiting blocks
        this.initOrbitingBlocks(blockCount);
    }

    /**
     * Initializes the orbiting blocks at different angles with various neon colors.
     * @param {number} count - Number of blocks to create (8-12)
     */
    initOrbitingBlocks(count) {
        // Ensure count is within 8-12 range
        const blockCount = Math.max(8, Math.min(12, count));
        
        this.orbitingBlocks = [];
        
        for (let i = 0; i < blockCount; i++) {
            // Distribute blocks evenly around the circle
            const angle = (i / blockCount) * Math.PI * 2;
            
            // Pick a neon color (cycle through palette)
            const color = NEON_COLORS[i % NEON_COLORS.length];
            
            // Create orbiting block
            const block = new OrbitingBlock(
                this.x,
                this.y,
                this.orbitRadius,
                angle,
                color
            );
            
            // Vary angular speed slightly for visual interest
            block.angularSpeed = 0.018 + (Math.random() * 0.008);
            
            this.orbitingBlocks.push(block);
        }
    }

    /**
     * Starts the central block and orbiting blocks animation.
     */
    start() {
        this.active = true;
    }

    /**
     * Updates the central block and all orbiting blocks.
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        if (!this.active) return;

        // Update pulse phase
        this.pulsePhase += dt * 2;

        // Update all orbiting blocks
        this.orbitingBlocks.forEach(block => {
            block.setCenter(this.x, this.y);
            block.update(dt);
        });
    }

    /**
     * Draws the central white block and all orbiting blocks.
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    draw(ctx) {
        if (!this.active) return;

        // Draw orbiting blocks first (behind central block) with opacity
        ctx.save();
        ctx.globalAlpha = this.blocksOpacity;
        this.orbitingBlocks.forEach(block => {
            block.draw(ctx);
        });
        ctx.restore();

        // Draw energy connections between orbiting blocks (with opacity)
        ctx.save();
        ctx.globalAlpha = 0.3 * this.blocksOpacity;
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00FFFF';
        
        for (let i = 0; i < this.orbitingBlocks.length; i++) {
            const block1 = this.orbitingBlocks[i];
            const block2 = this.orbitingBlocks[(i + 1) % this.orbitingBlocks.length];
            ctx.beginPath();
            ctx.moveTo(block1.x, block1.y);
            ctx.lineTo(block2.x, block2.y);
            ctx.stroke();
        }
        ctx.restore();

        // Draw central white block with emergence scale
        const pulse = 1 + Math.sin(this.pulsePhase) * 0.1;
        const fastPulse = 1 + Math.sin(this.pulsePhase * 3) * 0.05;
        const currentSize = this.size * pulse * this.emergenceScale;
        
        // Don't draw if scale is 0
        if (this.emergenceScale <= 0) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Apply emergence scale
        ctx.scale(this.emergenceScale, this.emergenceScale);

        // Outer energy field (multiple layers)
        for (let layer = 3; layer >= 0; layer--) {
            ctx.globalAlpha = 0.15 * (1 - layer * 0.2);
            const fieldSize = this.size * pulse * (2 + layer * 0.5);
            const hue = (this.pulsePhase * 30 + layer * 40) % 360;
            
            ctx.shadowBlur = 40;
            ctx.shadowColor = `hsl(${hue}, 100%, 70%)`;
            ctx.fillStyle = `hsla(${hue}, 100%, 70%, 0.3)`;
            ctx.fillRect(-fieldSize / 2, -fieldSize / 2, fieldSize, fieldSize);
        }

        // Rotating energy rays
        ctx.globalAlpha = 0.4;
        for (let ray = 0; ray < 8; ray++) {
            const rayAngle = (ray / 8) * Math.PI * 2 + this.pulsePhase * 0.5;
            const rayLength = this.size * pulse * 1.5;
            
            const gradient = ctx.createLinearGradient(0, 0, 
                Math.cos(rayAngle) * rayLength, 
                Math.sin(rayAngle) * rayLength);
            gradient.addColorStop(0, '#FFFFFF');
            gradient.addColorStop(0.5, '#00FFFF');
            gradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
            
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 3;
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#00FFFF';
            
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(rayAngle) * rayLength, Math.sin(rayAngle) * rayLength);
            ctx.stroke();
        }

        // Outer glow (enhanced)
        const baseSize = this.size * pulse;
        ctx.globalAlpha = 0.6;
        ctx.shadowBlur = 50;
        ctx.shadowColor = '#FFFFFF';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(-baseSize * 0.8, -baseSize * 0.8, baseSize * 1.6, baseSize * 1.6);

        // Main white block with gradient
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 30;
        const mainGradient = ctx.createLinearGradient(-currentSize/2, -currentSize/2, currentSize/2, currentSize/2);
        mainGradient.addColorStop(0, '#FFFFFF');
        mainGradient.addColorStop(0.5, '#E0E0E0');
        mainGradient.addColorStop(1, '#FFFFFF');
        ctx.fillStyle = mainGradient;
        ctx.fillRect(-currentSize / 2, -currentSize / 2, currentSize, currentSize);

        // Inner geometric pattern
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = '#00FFFF';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00FFFF';
        
        // Inner rotating square
        ctx.save();
        ctx.rotate(this.pulsePhase * 0.3);
        const innerSquareSize = currentSize * 0.6;
        ctx.strokeRect(-innerSquareSize/2, -innerSquareSize/2, innerSquareSize, innerSquareSize);
        ctx.restore();
        
        // Inner diamond
        ctx.save();
        ctx.rotate(Math.PI / 4 - this.pulsePhase * 0.2);
        const diamondSize = currentSize * 0.4;
        ctx.strokeRect(-diamondSize/2, -diamondSize/2, diamondSize, diamondSize);
        ctx.restore();

        // Inner bright core with pulsing
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#FFFFCC';
        const coreGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, currentSize * 0.3 * fastPulse);
        coreGradient.addColorStop(0, '#FFFFFF');
        coreGradient.addColorStop(0.5, '#FFFFCC');
        coreGradient.addColorStop(1, '#FFD700');
        ctx.fillStyle = coreGradient;
        const coreSize = currentSize * 0.35 * fastPulse;
        ctx.beginPath();
        ctx.arc(0, 0, coreSize, 0, Math.PI * 2);
        ctx.fill();

        // Bright center point
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(0, 0, 5 * fastPulse, 0, Math.PI * 2);
        ctx.fill();

        // Border outline (enhanced)
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = '#00FFFF';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00FFFF';
        ctx.strokeRect(-currentSize / 2, -currentSize / 2, currentSize, currentSize);

        // Corner accents
        const cornerSize = 8;
        ctx.fillStyle = '#FF00FF';
        ctx.shadowColor = '#FF00FF';
        ctx.fillRect(-currentSize/2 - 2, -currentSize/2 - 2, cornerSize, cornerSize);
        ctx.fillRect(currentSize/2 - cornerSize + 2, -currentSize/2 - 2, cornerSize, cornerSize);
        ctx.fillRect(-currentSize/2 - 2, currentSize/2 - cornerSize + 2, cornerSize, cornerSize);
        ctx.fillRect(currentSize/2 - cornerSize + 2, currentSize/2 - cornerSize + 2, cornerSize, cornerSize);

        ctx.restore();

        // Draw energy lines from center to orbiting blocks
        ctx.save();
        ctx.globalAlpha = 0.25 + Math.sin(this.pulsePhase * 2) * 0.1;
        this.orbitingBlocks.forEach((block, idx) => {
            const gradient = ctx.createLinearGradient(this.x, this.y, block.x, block.y);
            gradient.addColorStop(0, '#FFFFFF');
            gradient.addColorStop(0.5, block.color);
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 2;
            ctx.shadowBlur = 10;
            ctx.shadowColor = block.color;
            
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(block.x, block.y);
            ctx.stroke();
        });
        ctx.restore();
    }

    /**
     * Sets the position of the central block and updates orbiting blocks.
     * @param {number} x - New X position
     * @param {number} y - New Y position
     */
    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }

    /**
     * Gets all orbiting blocks.
     * @returns {OrbitingBlock[]} Array of orbiting blocks
     */
    getOrbitingBlocks() {
        return this.orbitingBlocks;
    }

    /**
     * Resets the central block to initial state.
     */
    reset() {
        this.active = false;
        this.pulsePhase = 0;
        this.timeSinceEmergence = 0;
        this.hasThrown = false;
        // Re-initialize orbiting blocks
        this.initOrbitingBlocks(this.orbitingBlocks.length || 10);
    }

    /**
     * Throws one orbiting block toward the player's position.
     * Requirements: 2.1, 2.4
     * @param {number} targetX - Target X position (player's position)
     * @param {number} targetY - Target Y position (player's position)
     * @returns {BlockProjectile|null} The created projectile, or null if no blocks available
     */
    throwBlock(targetX, targetY) {
        if (this.orbitingBlocks.length === 0) return null;
        
        // Remove one orbiting block
        const block = this.orbitingBlocks.pop();
        
        // Create a projectile from the removed block
        const projectile = new BlockProjectile(
            block.x,
            block.y,
            targetX,
            targetY,
            block.color
        );
        
        return projectile;
    }

    /**
     * Gets the current count of orbiting blocks.
     * @returns {number} Number of orbiting blocks
     */
    getOrbitingBlockCount() {
        return this.orbitingBlocks.length;
    }

    /**
     * Updates time tracking for block throwing attack.
     * Requirements: 2.1
     * @param {number} dt - Delta time in seconds
     */
    updateTimeSinceEmergence(dt) {
        this.timeSinceEmergence = (this.timeSinceEmergence || 0) + dt;
    }

    /**
     * Checks if it's time to throw a block (30 seconds since emergence).
     * Requirements: 2.1
     * @returns {boolean} True if 30 seconds have passed and hasn't thrown yet
     */
    shouldThrowBlock() {
        return (this.timeSinceEmergence || 0) >= 30 && !this.hasThrown;
    }

    /**
     * Marks that a block has been thrown.
     */
    markBlockThrown() {
        this.hasThrown = true;
    }
}

// ==================== BLOCK PROJECTILE CLASS ====================

/**
 * BlockProjectile class - Thrown orbiting block that travels toward the player.
 * Has a warning state (0.5s) before flying toward the target.
 * Requirements: 2.1, 2.2, 2.3, 2.5
 */
class BlockProjectile {
    /**
     * Creates a new BlockProjectile instance.
     * @param {number} startX - Starting X position
     * @param {number} startY - Starting Y position
     * @param {number} targetX - Target X position (player's position when thrown)
     * @param {number} targetY - Target Y position (player's position when thrown)
     * @param {string} color - Neon color of the block
     */
    constructor(startX, startY, targetX, targetY, color) {
        this.x = startX;
        this.y = startY;
        this.targetX = targetX;
        this.targetY = targetY;
        this.color = color;
        this.size = 25;
        this.speed = 400; // pixels per second
        this.warningTime = 0.5; // seconds
        this.state = 'WARNING'; // WARNING, FLYING, EXITED
        this.stateTimer = 0;
        
        // Calculate direction vector (normalized)
        const dx = targetX - startX;
        const dy = targetY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        this.dirX = distance > 0 ? dx / distance : 0;
        this.dirY = distance > 0 ? dy / distance : 1;
        
        // Visual properties
        this.pulsePhase = 0;
        this.trailParticles = [];
        this.warningPulse = 0;
    }

    /**
     * Updates the projectile state and position.
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        this.stateTimer += dt;
        this.pulsePhase += dt * 8;
        
        if (this.state === 'WARNING') {
            // Warning phase - block shakes/pulses but doesn't move
            this.warningPulse += dt * 20;
            
            if (this.stateTimer >= this.warningTime) {
                this.state = 'FLYING';
                this.stateTimer = 0;
            }
        } else if (this.state === 'FLYING') {
            // Flying phase - move toward target and beyond
            this.x += this.dirX * this.speed * dt;
            this.y += this.dirY * this.speed * dt;
            
            // Add trail particles
            if (Math.random() < 0.5) {
                this.trailParticles.push({
                    x: this.x + (Math.random() - 0.5) * this.size,
                    y: this.y + (Math.random() - 0.5) * this.size,
                    alpha: 1,
                    size: 5 + Math.random() * 5
                });
            }
            
            // Update trail particles
            for (let i = this.trailParticles.length - 1; i >= 0; i--) {
                this.trailParticles[i].alpha -= dt * 3;
                if (this.trailParticles[i].alpha <= 0) {
                    this.trailParticles.splice(i, 1);
                }
            }
            
            // Check if exited screen
            if (this.x < -100 || this.x > window.innerWidth + 100 ||
                this.y < -100 || this.y > window.innerHeight + 100) {
                this.state = 'EXITED';
            }
        }
    }

    /**
     * Draws the projectile with visual effects.
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    draw(ctx) {
        if (this.state === 'EXITED') return;
        
        ctx.save();
        
        // Draw trail particles first (behind the block)
        for (const particle of this.trailParticles) {
            ctx.globalAlpha = particle.alpha * 0.6;
            ctx.fillStyle = this.color;
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.color;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.translate(this.x, this.y);
        
        if (this.state === 'WARNING') {
            // Warning state - pulsing/shaking effect
            const shake = Math.sin(this.warningPulse) * 3;
            ctx.translate(shake, 0);
            
            // Draw warning indicator (expanding rings)
            const ringProgress = (this.stateTimer / this.warningTime);
            for (let i = 0; i < 3; i++) {
                const ringAlpha = (1 - ringProgress) * (1 - i * 0.3);
                const ringSize = this.size * (1.5 + ringProgress * 2 + i * 0.5);
                ctx.globalAlpha = ringAlpha * 0.5;
                ctx.strokeStyle = '#FF0000';
                ctx.lineWidth = 3;
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#FF0000';
                ctx.beginPath();
                ctx.arc(0, 0, ringSize, 0, Math.PI * 2);
                ctx.stroke();
            }
            
            // Draw exclamation mark
            ctx.globalAlpha = 0.8 + Math.sin(this.warningPulse * 2) * 0.2;
            ctx.fillStyle = '#FF0000';
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#FF0000';
            ctx.fillText('!', 0, -this.size - 15);
        }
        
        // Draw the block itself
        const pulse = 1 + Math.sin(this.pulsePhase) * 0.1;
        const currentSize = this.size * pulse;
        
        // Outer glow
        ctx.globalAlpha = 0.6;
        ctx.shadowBlur = 30;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.fillRect(-currentSize * 0.8, -currentSize * 0.8, currentSize * 1.6, currentSize * 1.6);
        
        // Main block with gradient
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 20;
        const gradient = ctx.createLinearGradient(-currentSize/2, -currentSize/2, currentSize/2, currentSize/2);
        gradient.addColorStop(0, this.color);
        gradient.addColorStop(0.5, '#FFFFFF');
        gradient.addColorStop(1, this.color);
        ctx.fillStyle = gradient;
        ctx.fillRect(-currentSize / 2, -currentSize / 2, currentSize, currentSize);
        
        // Inner core
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(0, 0, currentSize * 0.2, 0, Math.PI * 2);
        ctx.fill();
        
        // Border
        ctx.globalAlpha = 0.8;
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 8;
        ctx.shadowColor = this.color;
        ctx.strokeRect(-currentSize / 2, -currentSize / 2, currentSize, currentSize);
        
        ctx.restore();
    }

    /**
     * Checks collision between the projectile and the player.
     * Requirements: 2.5
     * @param {Player} player - The player object
     * @returns {boolean} True if player is hit by the projectile
     */
    checkCollision(player) {
        if (this.state !== 'FLYING') return false;
        
        const px = player.x;
        const py = player.y;
        const ps = player.size * 0.7; // Slightly smaller hitbox for fairness
        
        // Rectangle collision check
        const halfSize = this.size / 2;
        const halfPlayerSize = ps / 2;
        
        const overlapX = Math.abs(this.x - px) < (halfSize + halfPlayerSize);
        const overlapY = Math.abs(this.y - py) < (halfSize + halfPlayerSize);
        
        return overlapX && overlapY;
    }

    /**
     * Checks if the projectile has exited the screen.
     * @returns {boolean} True if projectile has exited
     */
    hasExited() {
        return this.state === 'EXITED';
    }

    /**
     * Gets the current state of the projectile.
     * @returns {string} Current state: WARNING, FLYING, or EXITED
     */
    getState() {
        return this.state;
    }

    /**
     * Gets the warning time duration.
     * @returns {number} Warning time in seconds
     */
    getWarningTime() {
        return this.warningTime;
    }

    /**
     * Gets the time spent in current state.
     * @returns {number} State timer in seconds
     */
    getStateTimer() {
        return this.stateTimer;
    }
}

// ==================== BOULDER CLASS (BOSS PHASE) ====================

/**
 * Boulder class - Warning-less falling obstacles for Boss Phase.
 * Boulders drop without visual warning but take exactly 1.5 seconds to land.
 * Requirements: 2.2, 2.3
 */
class Boulder {
    /**
     * Creates a new Boulder instance.
     * @param {number} x - X position to spawn at
     * @param {number} groundY - Y position of the ground (floor)
     */
    constructor(x, groundY) {
        this.x = x;
        this.y = -50; // Start above screen
        this.size = 60;
        
        // Fall timing - must take exactly 1.5 seconds to reach ground
        this.fallDuration = 1.5; // seconds
        
        // Calculate fall speed based on distance and duration
        // Distance = groundY - startY = groundY - (-50) = groundY + 50
        this.groundY = groundY;
        const totalDistance = groundY + 50;
        this.fallSpeed = totalDistance / this.fallDuration;
        
        // State tracking
        this.active = true;
        this.spawnTime = Date.now();
        
        // Visual properties
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 4;
        this.color = '#8B4513'; // Brown
        this.crackPattern = this.generateCrackPattern();
    }

    /**
     * Generates random crack pattern for visual variety.
     * @returns {Array} Array of crack line definitions
     */
    generateCrackPattern() {
        const cracks = [];
        const numCracks = 3 + Math.floor(Math.random() * 3);
        
        for (let i = 0; i < numCracks; i++) {
            cracks.push({
                startAngle: Math.random() * Math.PI * 2,
                length: 0.3 + Math.random() * 0.4,
                offset: Math.random() * 0.3
            });
        }
        
        return cracks;
    }

    /**
     * Gets the calculated fall speed for this boulder.
     * Speed is calculated to ensure 1.5 second fall time.
     * @returns {number} Fall speed in pixels per second
     */
    getFallSpeed() {
        return this.fallSpeed;
    }

    /**
     * Gets the expected fall duration.
     * @returns {number} Fall duration in seconds (always 1.5)
     */
    getFallDuration() {
        return this.fallDuration;
    }

    /**
     * Updates the boulder position.
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        if (!this.active) return;

        // Move boulder down
        this.y += this.fallSpeed * dt;
        
        // Rotate for visual effect
        this.rotation += this.rotationSpeed * dt;

        // Deactivate when past ground
        if (this.y > this.groundY + this.size) {
            this.active = false;
        }
    }

    /**
     * Checks collision between the boulder and the player.
     * @param {Player} player - The player object
     * @returns {boolean} True if player is hit by the boulder
     */
    checkCollision(player) {
        if (!this.active) return false;

        const px = player.x;
        const py = player.y;
        const ps = player.size * 0.7;

        // Circle-to-rectangle collision (approximate boulder as circle)
        const boulderRadius = this.size / 2;
        
        // Find closest point on player rectangle to boulder center
        const closestX = Math.max(px - ps / 2, Math.min(this.x, px + ps / 2));
        const closestY = Math.max(py - ps / 2, Math.min(this.y, py + ps / 2));
        
        // Calculate distance from closest point to boulder center
        const dx = this.x - closestX;
        const dy = this.y - closestY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        return distance < boulderRadius;
    }

    /**
     * Draws the boulder with rocky texture.
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    draw(ctx) {
        if (!this.active) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        const radius = this.size / 2;

        // Shadow/depth effect
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(5, 5, radius, 0, Math.PI * 2);
        ctx.fill();

        // Main boulder body - gradient for 3D effect
        ctx.globalAlpha = 1;
        const gradient = ctx.createRadialGradient(-radius * 0.3, -radius * 0.3, 0, 0, 0, radius);
        gradient.addColorStop(0, '#A0522D'); // Lighter brown
        gradient.addColorStop(0.5, '#8B4513'); // Saddle brown
        gradient.addColorStop(1, '#5D3A1A'); // Dark brown

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();

        // Rocky texture - irregular edge
        ctx.strokeStyle = '#5D3A1A';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 0; i <= 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const wobble = radius * (0.9 + Math.sin(angle * 5 + this.rotation) * 0.1);
            if (i === 0) {
                ctx.moveTo(Math.cos(angle) * wobble, Math.sin(angle) * wobble);
            } else {
                ctx.lineTo(Math.cos(angle) * wobble, Math.sin(angle) * wobble);
            }
        }
        ctx.closePath();
        ctx.stroke();

        // Crack lines
        ctx.strokeStyle = '#3D2A1A';
        ctx.lineWidth = 2;
        this.crackPattern.forEach(crack => {
            const startX = Math.cos(crack.startAngle) * radius * crack.offset;
            const startY = Math.sin(crack.startAngle) * radius * crack.offset;
            const endX = Math.cos(crack.startAngle) * radius * crack.length;
            const endY = Math.sin(crack.startAngle) * radius * crack.length;
            
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        });

        // Highlight
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(-radius * 0.3, -radius * 0.3, radius * 0.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    /**
     * Resets the boulder to initial state.
     */
    reset() {
        this.y = -50;
        this.active = true;
        this.spawnTime = Date.now();
    }
}

// ==================== CORNER LASER CLASS (BOSS PHASE) ====================

/**
 * CornerLaser class - Deadly laser beams that fire from upper screen corners.
 * Used in Boss Phase to create challenging hazards targeting the player.
 * Requirements: 2.1
 */
class CornerLaser {
    /**
     * Creates a new CornerLaser instance.
     * @param {string} corner - Which corner to spawn from: 'left' or 'right'
     * @param {number} targetX - X position to target
     * @param {number} targetY - Y position to target
     */
    constructor(corner, targetX, targetY) {
        this.corner = corner; // 'left' or 'right'
        
        // Starting position is exactly at upper corners
        // Left corner: (0, 0), Right corner: (screenWidth, 0)
        this.startX = corner === 'left' ? 0 : window.innerWidth;
        this.startY = 0;
        
        this.targetX = targetX;
        this.targetY = targetY;
        
        // State machine: CHARGING, FIRING, DONE
        this.state = 'CHARGING';
        this.chargeTime = 0.5; // seconds to charge
        this.fireTime = 0.3;   // seconds the beam is active
        this.timer = 0;
        
        // Visual properties
        this.beamWidth = 8;
        this.active = true;
        
        // Calculate beam angle
        this.angle = Math.atan2(this.targetY - this.startY, this.targetX - this.startX);
    }

    /**
     * Gets the starting position of the laser.
     * Position is exactly (0, 0) for left corner or (screenWidth, 0) for right corner.
     * @returns {{x: number, y: number}} Starting position
     */
    getStartPosition() {
        return {
            x: this.startX,
            y: this.startY
        };
    }

    /**
     * Updates the laser state.
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        if (!this.active) return;

        this.timer += dt;

        if (this.state === 'CHARGING') {
            if (this.timer >= this.chargeTime) {
                this.state = 'FIRING';
                this.timer = 0;
            }
        } else if (this.state === 'FIRING') {
            if (this.timer >= this.fireTime) {
                this.state = 'DONE';
                this.active = false;
            }
        }
    }

    /**
     * Checks collision between the laser beam and the player.
     * @param {Player} player - The player object
     * @returns {boolean} True if player is hit by the laser
     */
    checkCollision(player) {
        if (!this.active || this.state !== 'FIRING') return false;

        const px = player.x;
        const py = player.y;
        const ps = player.size * 0.7; // Player collision size

        // Calculate beam line from start to target (extended beyond target)
        const beamLength = Math.sqrt(
            Math.pow(window.innerWidth, 2) + Math.pow(window.innerHeight, 2)
        );
        
        const endX = this.startX + Math.cos(this.angle) * beamLength;
        const endY = this.startY + Math.sin(this.angle) * beamLength;

        // Point-to-line distance calculation
        const dist = this.pointToLineDistance(
            px, py,
            this.startX, this.startY,
            endX, endY
        );

        // Check if player is within beam width
        return dist < (this.beamWidth / 2 + ps / 2);
    }

    /**
     * Calculates the distance from a point to a line segment.
     * @param {number} px - Point X
     * @param {number} py - Point Y
     * @param {number} x1 - Line start X
     * @param {number} y1 - Line start Y
     * @param {number} x2 - Line end X
     * @param {number} y2 - Line end Y
     * @returns {number} Distance from point to line
     */
    pointToLineDistance(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;

        if (lenSq !== 0) {
            param = dot / lenSq;
        }

        let xx, yy;

        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        const dx = px - xx;
        const dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Draws the corner laser with charging and firing effects.
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    draw(ctx) {
        if (!this.active) return;

        ctx.save();

        const beamLength = Math.sqrt(
            Math.pow(window.innerWidth, 2) + Math.pow(window.innerHeight, 2)
        );
        const endX = this.startX + Math.cos(this.angle) * beamLength;
        const endY = this.startY + Math.sin(this.angle) * beamLength;

        if (this.state === 'CHARGING') {
            // Charging effect - pulsing warning line
            const progress = this.timer / this.chargeTime;
            const pulse = 0.5 + Math.sin(this.timer * 20) * 0.3;

            // Warning line
            ctx.globalAlpha = 0.3 + progress * 0.4;
            ctx.strokeStyle = '#FF0000';
            ctx.lineWidth = 2 + progress * 4;
            ctx.shadowBlur = 10 + progress * 20;
            ctx.shadowColor = '#FF0000';

            ctx.beginPath();
            ctx.moveTo(this.startX, this.startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();

            // Charging orb at origin
            ctx.globalAlpha = pulse;
            ctx.fillStyle = '#FF4444';
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.arc(this.startX, this.startY, 10 + progress * 15, 0, Math.PI * 2);
            ctx.fill();

        } else if (this.state === 'FIRING') {
            // Firing effect - bright deadly beam
            const fadeOut = 1 - (this.timer / this.fireTime);

            // Outer glow
            ctx.globalAlpha = 0.6 * fadeOut;
            ctx.strokeStyle = '#FF0000';
            ctx.lineWidth = this.beamWidth * 3;
            ctx.shadowBlur = 40;
            ctx.shadowColor = '#FF0000';

            ctx.beginPath();
            ctx.moveTo(this.startX, this.startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();

            // Core beam
            ctx.globalAlpha = fadeOut;
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = this.beamWidth;
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#FFFFFF';

            ctx.beginPath();
            ctx.moveTo(this.startX, this.startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();

            // Inner bright core
            ctx.strokeStyle = '#FFFF00';
            ctx.lineWidth = this.beamWidth * 0.3;
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#FFFF00';

            ctx.beginPath();
            ctx.moveTo(this.startX, this.startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        }

        ctx.restore();
    }

    /**
     * Resets the laser to initial state.
     */
    reset() {
        this.state = 'CHARGING';
        this.timer = 0;
        this.active = true;
    }
}

// ==================== FLOATING ISLE CLASS ====================

/**
 * FloatingIsle class - temporary platform for Stage 2.
 * Appears at varying heights above the main platform and serves as valid ground for jumping.
 * Requirements: 6.1, 6.3
 */
class FloatingIsle {
    /**
     * Creates a new floating isle.
     * @param {number} x - X position of the isle
     * @param {number} y - Y position of the isle (must be above main platform)
     * @param {number} width - Width of the isle in pixels
     * @param {number} duration - How long the isle remains active in milliseconds
     */
    constructor(x, y, width, duration) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = 15;
        this.duration = duration;
        this.spawnTime = Date.now();
        this.active = true;
        
        // Visual properties for neon glow effect
        this.glowColor = '#4FC3FF';
        this.coreColor = '#FFFFFF';
        this.pulsePhase = Math.random() * Math.PI * 2; // Random starting phase for pulse
    }

    /**
     * Updates the floating isle state.
     * Tracks lifetime and deactivates when duration expires.
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        const elapsed = Date.now() - this.spawnTime;
        
        // Deactivate when duration expires
        if (elapsed >= this.duration) {
            this.active = false;
        }
    }

    /**
     * Draws the floating isle with neon glow effect.
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    draw(ctx) {
        if (!this.active) return;

        const elapsed = Date.now() - this.spawnTime;
        const lifeRatio = elapsed / this.duration;
        
        ctx.save();

        // Calculate fade-out effect near end of life
        let alpha = 1;
        if (lifeRatio > 0.7) {
            // Start fading at 70% of lifetime
            alpha = 1 - ((lifeRatio - 0.7) / 0.3);
        }

        // Pulsing glow intensity
        const pulse = 1 + Math.sin(Date.now() * 0.005 + this.pulsePhase) * 0.3;

        // Outer glow (large soft shadow)
        ctx.globalAlpha = alpha * 0.4;
        ctx.shadowBlur = 30 * pulse;
        ctx.shadowColor = this.glowColor;
        ctx.fillStyle = this.glowColor;
        ctx.fillRect(this.x - 5, this.y - 3, this.width + 10, this.height + 6);

        // Main platform body
        ctx.globalAlpha = alpha * 0.9;
        ctx.shadowBlur = 15 * pulse;
        ctx.shadowColor = this.glowColor;
        
        // Gradient fill for depth
        const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
        gradient.addColorStop(0, this.coreColor);
        gradient.addColorStop(0.5, this.glowColor);
        gradient.addColorStop(1, '#0088cc');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Bright top edge (highlight)
        ctx.globalAlpha = alpha;
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#fff';
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.x, this.y, this.width, 3);

        // Corner accents for visual interest
        ctx.fillStyle = this.glowColor;
        ctx.fillRect(this.x, this.y, 5, this.height);
        ctx.fillRect(this.x + this.width - 5, this.y, 5, this.height);

        ctx.restore();
    }

    /**
     * Checks if a player is colliding with this floating isle.
     * Used for ground detection when player lands on the isle.
     * @param {Player} player - The player object to check collision with
     * @returns {boolean} True if player is overlapping the isle's collision bounds
     */
    checkPlayerCollision(player) {
        if (!this.active) return false;

        const playerLeft = player.x - player.size / 2;
        const playerRight = player.x + player.size / 2;
        const playerBottom = player.y + player.size / 2;
        const playerTop = player.y - player.size / 2;

        // Check horizontal overlap
        const horizontalOverlap = playerRight > this.x && playerLeft < this.x + this.width;
        
        // Check if player's feet are at or near the isle's top surface
        // Allow a small tolerance for landing detection
        const verticalContact = playerBottom >= this.y && playerBottom <= this.y + this.height + 10;

        return horizontalOverlap && verticalContact;
    }
}

// ==================== STAGE 2 PHASE CONFIGURATION ====================

/**
 * Stage 2 choreographed phases based on music timestamps.
 * Each phase defines spawn interval, warning time, fall speed, shake intensity, and visual settings.
 * Requirements: 5.2, 5.3, 5.4
 */
const STAGE2_PHASES = [
    { name: 'CALM_INTRO', start: 0, end: 10, spawnInterval: 1200, warningTime: 1800, fallSpeed: 5, shake: 0, glowIntensity: 0.5, colorPalette: 'calm' },
    { name: 'BUILD', start: 10, end: 12, spawnInterval: 600, warningTime: 1200, fallSpeed: 7, shake: 1, glowIntensity: 0.7, colorPalette: 'calm' },
    { name: 'DROP_1', start: 12, end: 22, spawnInterval: 220, warningTime: 450, fallSpeed: 13, shake: 4, glowIntensity: 1.0, colorPalette: 'drop' },
    { name: 'QUICK_RELEASE', start: 22, end: 24, spawnInterval: 900, warningTime: 1500, fallSpeed: 6, shake: 0, glowIntensity: 0.6, colorPalette: 'calm' },
    { name: 'BREAKDOWN', start: 24, end: 28, spawnInterval: 800, warningTime: 1400, fallSpeed: 6, shake: 0, glowIntensity: 0.5, colorPalette: 'calm' },
    { name: 'DROP_2', start: 28, end: 34, spawnInterval: 250, warningTime: 500, fallSpeed: 12, shake: 3, glowIntensity: 1.0, colorPalette: 'drop' },
    { name: 'BRIDGE', start: 34, end: 40, spawnInterval: 400, warningTime: 800, fallSpeed: 9, shake: 2, glowIntensity: 0.7, colorPalette: 'calm' },
    { name: 'PEAK_HIT', start: 40, end: 42, spawnInterval: 150, warningTime: 300, fallSpeed: 15, shake: 5, glowIntensity: 1.0, colorPalette: 'drop' },
    { name: 'REBUILD', start: 42, end: 46, spawnInterval: 300, warningTime: 600, fallSpeed: 10, shake: 2, glowIntensity: 0.8, colorPalette: 'drop' },
    { name: 'FINAL_DROP', start: 46, end: 50, spawnInterval: 130, warningTime: 280, fallSpeed: 17, shake: 5, glowIntensity: 1.0, colorPalette: 'drop' },
    { name: 'COOLDOWN', start: 50, end: 52, spawnInterval: 1200, warningTime: 1800, fallSpeed: 5, shake: 0, glowIntensity: 0.4, colorPalette: 'calm' },
    { name: 'OUTRO', start: 52, end: 58.6, spawnInterval: 9999, warningTime: 2000, fallSpeed: 0, shake: 0, glowIntensity: 0.3, colorPalette: 'calm' }
];

/**
 * Impact trigger timestamps for visual effects (shake/flash).
 * These correspond to major beat drops in the Stage 2 music.
 */
const IMPACT_TRIGGERS = [12, 28, 40, 46];

/**
 * Color palettes for different phase types.
 * Calm phases use blue/white colors, DROP phases use multicolor neon.
 * Requirements: 5.2, 5.3
 */
const COLOR_PALETTES = {
    calm: [
        { ray: '#4FC3FF', rayGlow: '#0af', block: '#4FC3FF' },   // blue
        { ray: '#FFFFFF', rayGlow: '#fff', block: '#FFFFFF' },   // white
        { ray: '#88CCFF', rayGlow: '#6bf', block: '#88CCFF' }    // light blue
    ],
    drop: [
        { ray: '#FF5A5A', rayGlow: '#f55', block: '#FF5A5A' },   // red
        { ray: '#C77DFF', rayGlow: '#a5f', block: '#C77DFF' },   // neon purple
        { ray: '#FFD700', rayGlow: '#fc0', block: '#FFD700' },   // gold
        { ray: '#00FF88', rayGlow: '#0f8', block: '#00FF88' },   // neon green
        { ray: '#FF00FF', rayGlow: '#f0f', block: '#FF00FF' },   // magenta
        { ray: '#4FC3FF', rayGlow: '#0af', block: '#4FC3FF' }    // blue
    ]
};

/**
 * Checks if an impact trigger timestamp falls within a time range.
 * Used to trigger screen shake and flash effects at specific music moments.
 * 
 * @param {number} currentTime - Current elapsed time in seconds
 * @param {number} lastCheckedTime - Last time this was checked in seconds
 * @returns {boolean} True if an impact trigger falls within (lastCheckedTime, currentTime]
 */
function isImpactTrigger(currentTime, lastCheckedTime) {
    // Ensure currentTime > lastCheckedTime for valid range
    if (currentTime <= lastCheckedTime) {
        return false;
    }
    
    // Check if any impact timestamp falls within the interval (lastCheckedTime, currentTime]
    for (const trigger of IMPACT_TRIGGERS) {
        if (trigger > lastCheckedTime && trigger <= currentTime) {
            return true;
        }
    }
    
    return false;
}

/**
 * Gets the phase configuration for Stage 2 based on elapsed time.
 * Returns the correct PhaseConfig for any elapsed time 0-58.6s.
 * Includes visual effect settings (glowIntensity, colorPalette).
 * 
 * @param {number} elapsed - Elapsed time in seconds
 * @returns {PhaseConfig} Phase configuration object with name, spawnInterval, warningTime, fallSpeed, shake, glowIntensity, colorPalette
 */
function getStage2Phase(elapsed) {
    // Find the phase that contains the elapsed time
    for (const phase of STAGE2_PHASES) {
        if (elapsed >= phase.start && elapsed < phase.end) {
            return {
                name: phase.name,
                spawnInterval: phase.spawnInterval,
                warningTime: phase.warningTime,
                fallSpeed: phase.fallSpeed,
                shake: phase.shake,
                glowIntensity: phase.glowIntensity || 0.5,
                colorPalette: phase.colorPalette || 'calm'
            };
        }
    }
    // Default to OUTRO for times >= 58.6s or return last phase
    const lastPhase = STAGE2_PHASES[STAGE2_PHASES.length - 1];
    return {
        name: lastPhase.name,
        spawnInterval: lastPhase.spawnInterval,
        warningTime: lastPhase.warningTime,
        fallSpeed: lastPhase.fallSpeed,
        shake: lastPhase.shake,
        glowIntensity: lastPhase.glowIntensity || 0.3,
        colorPalette: lastPhase.colorPalette || 'calm'
    };
}

// ==================== ADMIN MENU CLASS ====================

/**
 * AdminMenu class - Password-protected cheat menu system.
 * Allows stage selection and viewing the ending screen for debugging.
 * Requirements: 6.1, 6.3, 6.4, 6.5, 6.6
 */
class AdminMenu {
    /**
     * Creates a new AdminMenu instance.
     * @param {Game} game - Reference to the main game instance
     */
    constructor(game) {
        this.game = game;
        this.isOpen = false;
        this.isAuthenticated = false;
        
        // DOM elements
        this.overlay = document.getElementById('admin-overlay');
        this.passwordModal = document.getElementById('admin-password-modal');
        this.cheatMenu = document.getElementById('admin-cheat-menu');
        this.codeInput = document.getElementById('admin-code-input');
        this.errorDiv = document.getElementById('admin-error');
        
        this.bindEvents();
    }

    /**
     * Binds event listeners for admin menu interactions.
     */
    bindEvents() {
        // Settings button click
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.promptForCode());
        }

        // Submit button
        const submitBtn = document.getElementById('admin-submit-btn');
        if (submitBtn) {
            submitBtn.addEventListener('click', () => this.handleSubmit());
        }

        // Cancel button
        const cancelBtn = document.getElementById('admin-cancel-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.close());
        }

        // Close button
        const closeBtn = document.getElementById('admin-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        // Enter key in password input
        if (this.codeInput) {
            this.codeInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.handleSubmit();
                }
            });
        }

        // Stage selection buttons
        document.querySelectorAll('.admin-stage-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const stage = parseInt(btn.dataset.stage);
                this.selectStage(stage);
            });
        });

        // Ending screen button
        const endingBtn = document.getElementById('admin-ending-btn');
        if (endingBtn) {
            endingBtn.addEventListener('click', () => this.showEndingScreen());
        }

        // 3D Arena button
        const arena3DBtn = document.getElementById('admin-3d-arena-btn');
        if (arena3DBtn) {
            arena3DBtn.addEventListener('click', () => this.skipTo3DArena());
        }

        // Rest screen button
        const restScreenBtn = document.getElementById('admin-rest-screen-btn');
        if (restScreenBtn) {
            restScreenBtn.addEventListener('click', () => this.showRestScreen());
        }

        // Preview Boss Death button - Requirements: 10.1
        const previewBossDeathBtn = document.getElementById('admin-preview-boss-death-btn');
        if (previewBossDeathBtn) {
            previewBossDeathBtn.addEventListener('click', () => this.previewBossDeath());
        }

        // View scores button
        const viewScoresBtn = document.getElementById('admin-view-scores-btn');
        if (viewScoresBtn) {
            viewScoresBtn.addEventListener('click', () => this.showScoresModal());
        }

        // Clear daily leaderboard button
        const clearDailyBtn = document.getElementById('admin-clear-daily-btn');
        if (clearDailyBtn) {
            clearDailyBtn.addEventListener('click', () => this.clearDailyLeaderboard());
        }

        // View flagged players button
        const viewFlagsBtn = document.getElementById('admin-view-flags-btn');
        if (viewFlagsBtn) {
            viewFlagsBtn.addEventListener('click', () => this.showFlagsModal());
        }

        // Flags modal back button
        const flagsBackBtn = document.getElementById('admin-flags-back-btn');
        if (flagsBackBtn) {
            flagsBackBtn.addEventListener('click', () => this.hideFlagsModal());
        }

        // Scores modal back button
        const scoresBackBtn = document.getElementById('admin-scores-back-btn');
        if (scoresBackBtn) {
            scoresBackBtn.addEventListener('click', () => this.hideScoresModal());
        }

        // Manage rewards button
        const manageRewardsBtn = document.getElementById('admin-manage-rewards-btn');
        if (manageRewardsBtn) {
            manageRewardsBtn.addEventListener('click', () => this.showRewardsModal());
        }

        // Rewards modal back button
        const rewardsBackBtn = document.getElementById('admin-rewards-back-btn');
        if (rewardsBackBtn) {
            rewardsBackBtn.addEventListener('click', () => this.hideRewardsModal());
        }

        // Add reward button
        const addRewardBtn = document.getElementById('add-reward-btn');
        if (addRewardBtn) {
            addRewardBtn.addEventListener('click', () => this.addReward());
        }

        // Click outside to close
        if (this.overlay) {
            this.overlay.addEventListener('click', (e) => {
                if (e.target === this.overlay) {
                    this.close();
                }
            });
        }
    }

    /**
     * Stores the admin code for API calls.
     */
    storeAdminCode(code) {
        this.adminCode = code;
    }

    /**
     * Shows the password prompt modal.
     * Requirements: 6.1
     */
    promptForCode() {
        if (!this.overlay) return;
        
        this.isOpen = true;
        this.overlay.classList.remove('hidden');
        this.passwordModal.classList.remove('hidden');
        this.cheatMenu.classList.add('hidden');
        this.errorDiv.classList.add('hidden');
        
        // Clear and focus input
        if (this.codeInput) {
            this.codeInput.value = '';
            this.codeInput.focus();
        }
    }

    /**
     * Handles the submit button click - validates the entered code.
     */
    async handleSubmit() {
        const code = this.codeInput ? this.codeInput.value : '';
        const isValid = await this.validateCode(code);
        
        if (isValid) {
            this.isAuthenticated = true;
            this.storeAdminCode(code); // Store for API calls
            this.open();
        } else {
            // Show error message
            // Requirements: 6.6
            if (this.errorDiv) {
                this.errorDiv.classList.remove('hidden');
                this.errorDiv.textContent = 'Access Denied';
            }
            // Clear input
            if (this.codeInput) {
                this.codeInput.value = '';
                this.codeInput.focus();
            }
        }
    }

    /**
     * Validates the admin code against the server.
     * Requirements: 6.2
     * @param {string} code - The code entered by the user
     * @returns {Promise<boolean>} True if code is valid
     */
    async validateCode(code) {
        try {
            const response = await fetch('/api/admin/validate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ code })
            });
            
            const data = await response.json();
            return data.valid === true;
        } catch (error) {
            console.error('Admin validation error:', error);
            // Show server error
            if (this.errorDiv) {
                this.errorDiv.classList.remove('hidden');
                this.errorDiv.textContent = 'Server unavailable';
            }
            return false;
        }
    }

    /**
     * Opens the cheat menu after successful authentication.
     * Requirements: 6.3
     */
    open() {
        if (!this.isAuthenticated) {
            this.promptForCode();
            return;
        }
        
        this.isOpen = true;
        if (this.overlay) this.overlay.classList.remove('hidden');
        if (this.passwordModal) this.passwordModal.classList.add('hidden');
        if (this.cheatMenu) this.cheatMenu.classList.remove('hidden');
    }

    /**
     * Closes the admin menu overlay.
     */
    close() {
        this.isOpen = false;
        if (this.overlay) this.overlay.classList.add('hidden');
        if (this.passwordModal) this.passwordModal.classList.add('hidden');
        if (this.cheatMenu) this.cheatMenu.classList.add('hidden');
        if (this.errorDiv) this.errorDiv.classList.add('hidden');
    }

    /**
     * Selects and starts a specific stage.
     * Requirements: 6.4
     * @param {number} stageNum - The stage number to start (1, 2, or 3)
     */
    selectStage(stageNum) {
        this.close();
        
        // Hide all screens first
        document.getElementById('start-screen').classList.remove('active');
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('game-over-screen').classList.add('hidden');
        document.getElementById('win-screen').classList.add('hidden');
        document.getElementById('hud').classList.remove('hidden');
        
        // Reset game state
        this.game.gameState = 'PLAYING';
        this.game.startTime = Date.now();
        this.game.lastTime = Date.now();
        this.game.obstacles.reset();
        this.game.player.reset();
        
        // Initialize audio analysis
        this.game.initAudioAnalysis();
        
        // Reset stage manager to the selected stage
        if (this.game.stageManager) {
            this.game.stageManager.currentStage = stageNum;
        }
        
        // Check if selecting boss phase (Stage 3)
        if (stageNum === 3) {
            // Initialize BossPhaseManager if not already created
            if (!this.game.bossPhaseManager) {
                this.game.bossPhaseManager = new BossPhaseManager(this.game);
            }
            
            // Set game state to boss phase
            this.game.gameState = 'BOSS_PHASE';
            
            // Start the boss phase with countdown
            this.game.bossPhaseManager.start();
        } else {
            // Set the correct music for the stage
            const musicUrl = this.game.stageManager.getMusicUrl();
            console.log('Loading stage music:', musicUrl);
            this.game.audio.src = musicUrl;
            this.game.audio.currentTime = 0;
            this.game.audio.volume = 1.0;
            this.game.audio.load();
            
            // Play audio after it's loaded
            const playAudio = () => {
                this.game.audio.play().catch(e => console.error('Audio play failed:', e));
            };
            
            if (this.game.audio.readyState >= 3) {
                playAudio();
            } else {
                this.game.audio.addEventListener('canplaythrough', playAudio, { once: true });
            }
        }
        
        // Start the game loop
        requestAnimationFrame(this.game.loop);
    }

    /**
     * Shows the ending/victory screen directly.
     * Requirements: 6.5
     */
    showEndingScreen() {
        this.close();
        
        // Set a mock survival time for display
        this.game.lastSurvivalTime = 180.00;
        
        // Show victory screen
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('start-screen').classList.remove('active');
        document.getElementById('win-screen').classList.remove('hidden');
        document.getElementById('win-screen').classList.add('active');
        document.getElementById('win-score').innerText = 'TIME: 180.00s';
    }

    /**
     * Skips directly to the 3D arena.
     */
    skipTo3DArena() {
        this.close();
        
        // Hide all screens
        document.getElementById('start-screen').classList.remove('active');
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('game-over-screen').classList.add('hidden');
        document.getElementById('win-screen').classList.add('hidden');
        document.getElementById('hud').classList.remove('hidden');
        
        // Reset game state
        this.game.startTime = Date.now();
        this.game.lastTime = Date.now();
        
        // Initialize and start the 3D arena directly
        if (!this.game.arena3D) {
            this.game.arena3D = new Arena3DManager(this.game);
        }
        
        this.game.gameState = 'ARENA_3D';
        this.game.arena3D.start();
        
        // Start the game loop
        requestAnimationFrame(this.game.loop);
    }

    /**
     * Shows the rest/repose screen between stages.
     */
    showRestScreen() {
        this.close();
        
        // Hide all screens
        document.getElementById('start-screen').classList.remove('active');
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('game-over-screen').classList.add('hidden');
        document.getElementById('win-screen').classList.add('hidden');
        document.getElementById('hud').classList.add('hidden');
        
        // Show stage complete screen
        document.getElementById('stage-complete-screen').classList.remove('hidden');
        document.getElementById('stage-complete-screen').classList.add('active');
        
        // Play relaxation music
        if (this.game.stageManager) {
            const relaxUrl = this.game.stageManager.getRelaxationMusicUrl();
            this.game.audio.src = relaxUrl;
            this.game.audio.currentTime = 0;
            this.game.audio.volume = 1.0;
            this.game.audio.play().catch(e => console.error('Audio play failed:', e));
        }
    }

    /**
     * Previews the boss death sequence directly.
     * Requirements: 10.1, 10.2, 10.3, 10.4
     */
    previewBossDeath() {
        this.close();
        
        // Hide all screens
        document.getElementById('start-screen').classList.remove('active');
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('game-over-screen').classList.add('hidden');
        document.getElementById('win-screen').classList.add('hidden');
        document.getElementById('hud').classList.remove('hidden');
        
        // Initialize 3D arena if not already created
        if (!this.game.arena3D) {
            this.game.arena3D = new Arena3DManager(this.game);
        }
        
        // Set game state to arena 3D
        this.game.gameState = 'ARENA_3D';
        this.game.startTime = Date.now();
        this.game.lastTime = Date.now();
        
        // Start the arena and immediately trigger defeat sequence
        this.game.arena3D.start();
        
        // Set shard count to 15 to trigger defeat sequence
        this.game.arena3D.shardCount = 15;
        
        // Create and start the defeat sequence controller
        if (!this.game.arena3D.defeatSequenceController) {
            this.game.arena3D.defeatSequenceController = new DefeatSequenceController(
                this.game.arena3D,
                () => this.onPreviewComplete()
            );
        }
        
        // Start the defeat sequence
        this.game.arena3D.defeatSequenceController.start();
        this.game.arena3D.phase2State = 'DEFEAT_SEQUENCE';
        
        // Start the game loop
        requestAnimationFrame(this.game.loop);
    }

    /**
     * Called when the boss death preview completes.
     * Returns to the admin panel.
     * Requirements: 10.4
     */
    onPreviewComplete() {
        // Cleanup the 3D arena
        if (this.game.arena3D) {
            this.game.arena3D.cleanup();
        }
        
        // Reset game state
        this.game.gameState = 'MENU';
        
        // Show start screen
        document.getElementById('start-screen').classList.remove('hidden');
        document.getElementById('start-screen').classList.add('active');
        document.getElementById('hud').classList.add('hidden');
        
        // Reopen admin menu
        this.open();
    }

    /**
     * Shows the scores management modal.
     */
    async showScoresModal() {
        const scoresModal = document.getElementById('admin-scores-modal');
        const scoresList = document.getElementById('admin-scores-list');
        
        if (!scoresModal || !scoresList) return;
        
        // Check if authenticated
        if (!this.adminCode) {
            alert('Please authenticate first');
            return;
        }
        
        // Hide cheat menu, show scores modal
        if (this.cheatMenu) this.cheatMenu.classList.add('hidden');
        scoresModal.classList.remove('hidden');
        
        // Show loading
        scoresList.innerHTML = '<p class="loading-text">Loading scores...</p>';
        
        try {
            const response = await fetch(`/api/admin/scores?code=${encodeURIComponent(this.adminCode)}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.scores) {
                this.renderScoresList(data.scores);
            } else {
                scoresList.innerHTML = `<p class="loading-text">Failed to load scores: ${data.error || 'Unknown error'}</p>`;
            }
        } catch (error) {
            console.error('Error loading scores:', error);
            scoresList.innerHTML = `<p class="loading-text">Error loading scores: ${error.message}</p>`;
        }
    }

    /**
     * Renders the scores list in the admin modal.
     */
    renderScoresList(scores) {
        const scoresList = document.getElementById('admin-scores-list');
        if (!scoresList) return;
        
        if (scores.length === 0) {
            scoresList.innerHTML = '<p class="loading-text">No scores found</p>';
            return;
        }
        
        scoresList.innerHTML = scores.map(score => `
            <div class="admin-score-item ${score.is_flagged ? 'admin-score-flagged' : ''}" data-id="${score.id}">
                <div class="admin-score-info">
                    <span class="admin-score-username">${this.escapeHtml(score.username)}</span>
                    <span class="admin-score-details">
                        ${score.discord ? this.escapeHtml(score.discord) + ' • ' : ''}
                        ${new Date(score.created_at).toLocaleDateString()}
                    </span>
                    <span class="admin-score-ip">IP: ${score.ip_hash || 'N/A'}</span>
                </div>
                <div>
                    <span class="admin-score-value">${parseFloat(score.score).toFixed(2)}s</span>
                    ${score.is_flagged ? '<span style="color: #ff4444; margin-left: 5px;">⚠️</span>' : ''}
                    <span class="admin-score-delete">🗑️ Click to delete</span>
                </div>
            </div>
        `).join('');
        
        // Add click handlers for deletion
        scoresList.querySelectorAll('.admin-score-item').forEach(item => {
            item.addEventListener('click', () => {
                const scoreId = item.dataset.id;
                this.confirmDeleteScore(scoreId);
            });
        });
    }

    /**
     * Confirms and deletes a score.
     */
    async confirmDeleteScore(scoreId) {
        if (!confirm('Are you sure you want to delete this score? This cannot be undone.')) {
            return;
        }
        
        // Check if authenticated
        if (!this.adminCode) {
            alert('Please authenticate first');
            return;
        }
        
        try {
            const response = await fetch(`/api/admin/score/${scoreId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ code: this.adminCode })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                // Refresh the scores list
                this.showScoresModal();
                // Also refresh the main leaderboards
                if (this.game) {
                    this.game.loadLeaderboards();
                }
            } else {
                alert('Failed to delete score: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error deleting score:', error);
            alert('Error deleting score: ' + error.message);
        }
    }

    /**
     * Hides the scores modal and shows the cheat menu.
     */
    hideScoresModal() {
        const scoresModal = document.getElementById('admin-scores-modal');
        if (scoresModal) scoresModal.classList.add('hidden');
        if (this.cheatMenu) this.cheatMenu.classList.remove('hidden');
    }

    /**
     * Clears the daily leaderboard.
     */
    async clearDailyLeaderboard() {
        if (!confirm('Are you sure you want to clear the entire daily leaderboard? This cannot be undone.')) {
            return;
        }
        
        // Check if authenticated
        if (!this.adminCode) {
            alert('Please authenticate first');
            return;
        }
        
        try {
            const response = await fetch('/api/admin/scores/clear-daily', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ code: this.adminCode })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                alert('Daily leaderboard cleared successfully!');
                // Refresh the main leaderboards
                if (this.game) {
                    this.game.loadLeaderboards();
                }
            } else {
                alert('Failed to clear daily leaderboard: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error clearing daily leaderboard:', error);
            alert('Error clearing daily leaderboard: ' + error.message);
        }
    }

    /**
     * Escapes HTML to prevent XSS.
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Shows the flagged players modal.
     */
    async showFlagsModal() {
        const flagsModal = document.getElementById('admin-flags-modal');
        const flagsList = document.getElementById('admin-flags-list');
        
        if (!flagsModal || !flagsList) return;
        
        // Check if authenticated
        if (!this.adminCode) {
            alert('Please authenticate first');
            return;
        }
        
        // Hide cheat menu, show flags modal
        if (this.cheatMenu) this.cheatMenu.classList.add('hidden');
        flagsModal.classList.remove('hidden');
        
        // Show loading
        flagsList.innerHTML = '<p class="loading-text">Loading flagged players...</p>';
        
        try {
            const response = await fetch(`/api/admin/flags?code=${encodeURIComponent(this.adminCode)}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.flaggedPlayers) {
                this.renderFlagsList(data.flaggedPlayers);
            } else {
                flagsList.innerHTML = `<p class="loading-text">Failed to load flagged players: ${data.error || 'Unknown error'}</p>`;
            }
        } catch (error) {
            console.error('Error loading flags:', error);
            flagsList.innerHTML = `<p class="loading-text">Error loading flagged players: ${error.message}</p>`;
        }
    }

    /**
     * Renders the flagged players list.
     */
    renderFlagsList(flaggedPlayers) {
        const flagsList = document.getElementById('admin-flags-list');
        if (!flagsList) return;
        
        if (flaggedPlayers.length === 0) {
            flagsList.innerHTML = '<p class="loading-text">No flagged players found 🎉</p>';
            return;
        }
        
        flagsList.innerHTML = flaggedPlayers.map(player => `
            <div class="admin-flagged-item" data-ip="${player.ip_hash}">
                <div class="admin-flagged-info">
                    <span class="admin-flagged-ip">IP: ${player.ip_hash}</span>
                    <span class="admin-flagged-count">${player.flags.length} flag(s)</span>
                </div>
                <div class="admin-flagged-details">
                    ${player.flags.slice(0, 3).map(f => `
                        <span class="admin-flagged-reason">${this.escapeHtml(f.reason)}</span>
                    `).join('')}
                    ${player.flags.length > 3 ? `<span class="admin-flagged-reason">+${player.flags.length - 3} more</span>` : ''}
                </div>
                <div class="admin-flagged-scores">
                    ${player.scores.length > 0 
                        ? `<span style="color: #888; font-size: 0.75rem;">${player.scores.length} score(s): ${player.scores.slice(0, 2).map(s => s.username).join(', ')}${player.scores.length > 2 ? '...' : ''}</span>`
                        : '<span style="color: #666; font-size: 0.75rem;">No scores</span>'
                    }
                </div>
            </div>
        `).join('');
        
        // Add click handlers for clearing flags
        flagsList.querySelectorAll('.admin-flagged-item').forEach(item => {
            item.addEventListener('click', () => {
                const ipHash = item.dataset.ip;
                this.confirmClearFlags(ipHash);
            });
        });
    }

    /**
     * Confirms and clears flags for an IP.
     */
    async confirmClearFlags(ipHash) {
        if (!confirm(`Clear all flags for IP ${ipHash}? This will also unflag their scores.`)) {
            return;
        }
        
        // Check if authenticated
        if (!this.adminCode) {
            alert('Please authenticate first');
            return;
        }
        
        try {
            const response = await fetch(`/api/admin/flag/${encodeURIComponent(ipHash)}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ code: this.adminCode })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                // Refresh the flags list
                this.showFlagsModal();
            } else {
                alert('Failed to clear flags: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error clearing flags:', error);
            alert('Error clearing flags: ' + error.message);
        }
    }

    /**
     * Hides the flags modal and shows the cheat menu.
     */
    hideFlagsModal() {
        const flagsModal = document.getElementById('admin-flags-modal');
        if (flagsModal) flagsModal.classList.add('hidden');
        if (this.cheatMenu) this.cheatMenu.classList.remove('hidden');
    }

    // ==================== REWARD MANAGEMENT METHODS ====================

    /**
     * Shows the rewards management modal.
     */
    async showRewardsModal() {
        const rewardsModal = document.getElementById('admin-rewards-modal');
        const rewardsList = document.getElementById('rewards-list');
        
        if (!rewardsModal || !rewardsList) return;
        
        if (!this.adminCode) {
            alert('Please authenticate first');
            return;
        }
        
        // Hide cheat menu, show rewards modal
        if (this.cheatMenu) this.cheatMenu.classList.add('hidden');
        rewardsModal.classList.remove('hidden');
        
        // Show loading
        rewardsList.innerHTML = '<p class="loading-text">Loading rewards...</p>';
        
        try {
            const response = await fetch(`/api/admin/rewards?code=${encodeURIComponent(this.adminCode)}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.rewards) {
                this.renderRewardsList(data.rewards);
            } else {
                rewardsList.innerHTML = `<p class="loading-text">Failed to load rewards: ${data.error || 'Unknown error'}</p>`;
            }
        } catch (error) {
            console.error('Error loading rewards:', error);
            rewardsList.innerHTML = `<p class="loading-text">Error loading rewards: ${error.message}</p>`;
        }
    }

    /**
     * Hides the rewards modal and shows the cheat menu.
     */
    hideRewardsModal() {
        const rewardsModal = document.getElementById('admin-rewards-modal');
        if (rewardsModal) rewardsModal.classList.add('hidden');
        if (this.cheatMenu) this.cheatMenu.classList.remove('hidden');
    }

    /**
     * Adds a new reward via API.
     */
    async addReward() {
        const thresholdInput = document.getElementById('reward-threshold-input');
        const messageInput = document.getElementById('reward-message-input');
        const codeInput = document.getElementById('reward-code-input');
        const oneTimeInput = document.getElementById('reward-onetime-input');
        
        const threshold = parseInt(thresholdInput?.value);
        const message = messageInput?.value.trim();
        const rewardCode = codeInput?.value.trim();
        const oneTimeUse = oneTimeInput?.checked !== false;
        
        if (!threshold || threshold < 1) {
            alert('Please enter a valid threshold (seconds)');
            return;
        }
        
        if (!message) {
            alert('Please enter a message for the player');
            return;
        }
        
        if (!rewardCode) {
            alert('Please enter a reward code');
            return;
        }
        
        if (!this.adminCode) {
            alert('Please authenticate first');
            return;
        }
        
        try {
            const response = await fetch('/api/admin/rewards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: this.adminCode,
                    threshold,
                    message,
                    rewardCode,
                    oneTimeUse
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Clear form
                if (thresholdInput) thresholdInput.value = '';
                if (messageInput) messageInput.value = '';
                if (codeInput) codeInput.value = '';
                if (oneTimeInput) oneTimeInput.checked = true;
                
                // Refresh list
                this.showRewardsModal();
            } else {
                alert('Failed to add reward: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error adding reward:', error);
            alert('Error adding reward: ' + error.message);
        }
    }

    /**
     * Deletes a reward via API.
     */
    async deleteReward(rewardId) {
        if (!confirm('Are you sure you want to delete this reward?')) {
            return;
        }
        
        if (!this.adminCode) {
            alert('Please authenticate first');
            return;
        }
        
        try {
            const response = await fetch(`/api/admin/rewards/${rewardId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: this.adminCode })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showRewardsModal();
            } else {
                alert('Failed to delete reward: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error deleting reward:', error);
            alert('Error deleting reward: ' + error.message);
        }
    }

    /**
     * Resets claims for a reward (allows players to earn it again).
     */
    async resetRewardClaims(rewardId) {
        if (!confirm('Reset all claims for this reward? Players who already claimed it will be able to earn it again.')) {
            return;
        }
        
        if (!this.adminCode) {
            alert('Please authenticate first');
            return;
        }
        
        try {
            const response = await fetch(`/api/admin/rewards/${rewardId}/reset-claims`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: this.adminCode })
            });
            
            const data = await response.json();
            
            if (data.success) {
                alert(data.message || 'Claims reset successfully');
                this.showRewardsModal();
            } else {
                alert('Failed to reset claims: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error resetting claims:', error);
            alert('Error resetting claims: ' + error.message);
        }
    }

    /**
     * Renders the rewards list in the admin modal.
     */
    renderRewardsList(rewards) {
        const rewardsList = document.getElementById('rewards-list');
        if (!rewardsList) return;
        
        if (rewards.length === 0) {
            rewardsList.innerHTML = '<p class="loading-text">No rewards configured yet</p>';
            return;
        }
        
        rewardsList.innerHTML = rewards.map(reward => `
            <div class="reward-item" data-id="${reward.id}">
                <div class="reward-item-header">
                    <span class="reward-threshold">${reward.threshold_seconds}s</span>
                    <span class="reward-claims">${reward.claim_count || 0} claims</span>
                </div>
                <div class="reward-item-message">${this.escapeHtml(reward.message)}</div>
                <div class="reward-item-code">${this.escapeHtml(reward.reward_code.substring(0, 20))}${reward.reward_code.length > 20 ? '...' : ''}</div>
                <div class="reward-item-meta">
                    ${reward.one_time_use ? '🔒 One-time' : '♾️ Unlimited'} • 
                    ${reward.is_active ? '✅ Active' : '❌ Inactive'}
                </div>
                <div class="reward-item-actions">
                    <button class="reward-action-btn reward-reset-btn" data-id="${reward.id}">🔄 Reset Claims</button>
                    <button class="reward-action-btn reward-delete-btn" data-id="${reward.id}">🗑️ Delete</button>
                </div>
            </div>
        `).join('');
        
        // Add click handlers
        rewardsList.querySelectorAll('.reward-reset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.resetRewardClaims(btn.dataset.id);
            });
        });
        
        rewardsList.querySelectorAll('.reward-delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteReward(btn.dataset.id);
            });
        });
    }
}

// ==================== TRANSITION PORTAL CLASS ====================

/**
 * TransitionPortal class - Blue portal for transitioning to 3D arena.
 * Displays on the far right side of the screen with arrow and "ENTER" text.
 * Requirements: 3.1, 3.2
 */
class TransitionPortal {
    /**
     * Creates a new TransitionPortal instance.
     * @param {Game} game - Reference to the main game instance
     */
    constructor(game) {
        this.game = game;
        this.x = window.innerWidth - 100;
        this.y = game.floorY - 80;
        this.width = 60;
        this.height = 100;
        this.color = '#00BFFF'; // Deep sky blue
        this.pulsePhase = 0;
        this.active = false;
        
        // Visual properties
        this.arrowBlink = 0;
        this.portalRotation = 0;
    }

    /**
     * Starts the portal animation.
     */
    start() {
        this.active = true;
        this.pulsePhase = 0;
    }

    /**
     * Updates the portal animation state.
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        if (!this.active) return;

        this.pulsePhase += dt * 3;
        this.arrowBlink += dt * 5;
        this.portalRotation += dt * 2;
    }

    /**
     * Checks if the player has entered the portal.
     * Requirements: 3.3
     * @param {Player} player - The player object
     * @returns {boolean} True if player is inside the portal
     */
    checkPlayerEntry(player) {
        if (!this.active) return false;

        const px = player.x;
        const py = player.y;
        const ps = player.size / 2;

        // Check if player center is within portal bounds
        const inX = px + ps > this.x && px - ps < this.x + this.width;
        const inY = py + ps > this.y && py - ps < this.y + this.height;

        return inX && inY;
    }

    /**
     * Draws the transition portal with arrow and "ENTER" text.
     * Requirements: 3.1, 3.2
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    draw(ctx) {
        if (!this.active) return;

        ctx.save();

        const pulse = 1 + Math.sin(this.pulsePhase) * 0.1;
        const currentWidth = this.width * pulse;
        const currentHeight = this.height * pulse;
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;

        // Outer glow
        ctx.globalAlpha = 0.4;
        ctx.shadowBlur = 50;
        ctx.shadowColor = this.color;
        
        const outerGradient = ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, currentWidth
        );
        outerGradient.addColorStop(0, 'rgba(0, 191, 255, 0.8)');
        outerGradient.addColorStop(0.5, 'rgba(0, 100, 200, 0.5)');
        outerGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = outerGradient;
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, currentWidth, currentHeight * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Main portal ring
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 4;
        ctx.shadowBlur = 30;
        ctx.shadowColor = this.color;
        
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, currentWidth * 0.7, currentHeight * 0.4, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Inner swirl effect
        ctx.globalAlpha = 0.7;
        const innerGradient = ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, currentWidth * 0.5
        );
        innerGradient.addColorStop(0, '#FFFFFF');
        innerGradient.addColorStop(0.3, '#00BFFF');
        innerGradient.addColorStop(1, '#004080');
        
        ctx.fillStyle = innerGradient;
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, currentWidth * 0.5, currentHeight * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Rotating particles inside portal
        ctx.globalAlpha = 0.8;
        for (let i = 0; i < 6; i++) {
            const angle = this.portalRotation + (i / 6) * Math.PI * 2;
            const radius = currentWidth * 0.3;
            const px = centerX + Math.cos(angle) * radius;
            const py = centerY + Math.sin(angle) * radius * 0.5;
            
            ctx.fillStyle = '#FFFFFF';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(px, py, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Arrow pointing at portal (to the left of portal)
        const arrowX = this.x - 80;
        const arrowY = centerY;
        const arrowAlpha = 0.5 + Math.sin(this.arrowBlink) * 0.5;
        
        ctx.globalAlpha = arrowAlpha;
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00BFFF';
        
        // Draw arrow shape pointing right
        ctx.beginPath();
        ctx.moveTo(arrowX, arrowY - 15);
        ctx.lineTo(arrowX + 30, arrowY);
        ctx.lineTo(arrowX, arrowY + 15);
        ctx.lineTo(arrowX + 10, arrowY);
        ctx.closePath();
        ctx.fill();

        // "ENTER" text above arrow
        ctx.globalAlpha = arrowAlpha;
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#00BFFF';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00BFFF';
        ctx.fillText('ENTER', arrowX + 15, arrowY - 25);

        ctx.restore();
    }

    /**
     * Resets the portal to initial state.
     */
    reset() {
        this.active = false;
        this.pulsePhase = 0;
        this.arrowBlink = 0;
        this.portalRotation = 0;
    }
}

// ==================== BOSS EMERGENCE CONTROLLER CLASS ====================

/**
 * BossEmergenceController class - Manages the boss emergence animation from the portal.
 * Handles the state machine for portal opening, boss emerging, and blocks appearing.
 * Requirements: 1.1, 1.2, 1.4
 */
class BossEmergenceController {
    /**
     * State constants for the emergence sequence.
     */
    static STATES = {
        WAITING: 'WAITING',
        PORTAL_OPENING: 'PORTAL_OPENING',
        EMERGING: 'EMERGING',
        BLOCKS_APPEARING: 'BLOCKS_APPEARING',
        COMPLETE: 'COMPLETE'
    };

    /**
     * Timing constants for each phase (in seconds).
     * Total emergence time: 2s + 1.5s + 1s = 4.5s
     */
    static TIMING = {
        PORTAL_DURATION: 2.0,      // Portal tearing animation
        EMERGENCE_DURATION: 1.5,   // Boss scaling up from portal
        BLOCKS_FADE_DURATION: 1.0  // Orbiting blocks fade in
    };

    /**
     * Creates a new BossEmergenceController instance.
     * @param {CentralBlock} boss - Reference to the boss (CentralBlock)
     * @param {VoidPortal} portal - Reference to the void portal
     */
    constructor(boss, portal) {
        this.boss = boss;
        this.portal = portal;
        this.state = BossEmergenceController.STATES.WAITING;
        
        // Progress trackers for each phase
        this.portalProgress = 0;      // 0-1 for portal opening
        this.emergenceProgress = 0;   // 0-1 for boss emergence
        this.blockFadeProgress = 0;   // 0-1 for blocks fade-in
        
        // Timer for current state
        this.stateTimer = 0;
        
        // Boss scale during emergence (0 to 1)
        this.bossScale = 0;
        
        // Blocks opacity during fade-in (0 to 1)
        this.blocksOpacity = 0;
        
        // Particle effects for emergence
        this.emergenceParticles = [];
    }

    /**
     * Starts the emergence sequence.
     * Transitions from WAITING to PORTAL_OPENING state.
     */
    start() {
        if (this.state !== BossEmergenceController.STATES.WAITING) return;
        
        this.state = BossEmergenceController.STATES.PORTAL_OPENING;
        this.stateTimer = 0;
        this.portalProgress = 0;
        
        // Start the portal animation
        if (this.portal) {
            this.portal.start();
        }
    }

    /**
     * Updates the emergence sequence based on current state.
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        if (this.state === BossEmergenceController.STATES.WAITING ||
            this.state === BossEmergenceController.STATES.COMPLETE) {
            return;
        }

        this.stateTimer += dt;

        switch (this.state) {
            case BossEmergenceController.STATES.PORTAL_OPENING:
                this.updatePortalOpening(dt);
                break;
            case BossEmergenceController.STATES.EMERGING:
                this.updateEmerging(dt);
                break;
            case BossEmergenceController.STATES.BLOCKS_APPEARING:
                this.updateBlocksAppearing(dt);
                break;
        }

        // Update portal animation
        if (this.portal) {
            this.portal.update(dt);
        }

        // Update emergence particles
        this.updateEmergenceParticles(dt);
    }

    /**
     * Updates the portal opening phase.
     * @param {number} dt - Delta time in seconds
     */
    updatePortalOpening(dt) {
        const duration = BossEmergenceController.TIMING.PORTAL_DURATION;
        this.portalProgress = Math.min(1, this.stateTimer / duration);

        // Transition to EMERGING when portal is fully open
        if (this.stateTimer >= duration) {
            this.state = BossEmergenceController.STATES.EMERGING;
            this.stateTimer = 0;
            this.emergenceProgress = 0;
            this.bossScale = 0;
            
            // Start boss (but keep it scaled to 0 initially)
            if (this.boss) {
                this.boss.start();
            }
            
            // Spawn initial emergence particles
            this.spawnEmergenceParticles();
        }
    }

    /**
     * Updates the boss emerging phase with scale animation.
     * @param {number} dt - Delta time in seconds
     */
    updateEmerging(dt) {
        const duration = BossEmergenceController.TIMING.EMERGENCE_DURATION;
        this.emergenceProgress = Math.min(1, this.stateTimer / duration);
        
        // Ease-out scale animation (starts fast, slows down)
        this.bossScale = this.easeOutCubic(this.emergenceProgress);

        // Spawn particles during emergence
        if (Math.random() < 0.3) {
            this.spawnEmergenceParticles();
        }

        // Transition to BLOCKS_APPEARING when emergence is complete
        if (this.stateTimer >= duration) {
            this.state = BossEmergenceController.STATES.BLOCKS_APPEARING;
            this.stateTimer = 0;
            this.blockFadeProgress = 0;
            this.blocksOpacity = 0;
            this.bossScale = 1; // Ensure boss is fully scaled
        }
    }

    /**
     * Updates the blocks fade-in phase.
     * @param {number} dt - Delta time in seconds
     */
    updateBlocksAppearing(dt) {
        const duration = BossEmergenceController.TIMING.BLOCKS_FADE_DURATION;
        this.blockFadeProgress = Math.min(1, this.stateTimer / duration);
        
        // Linear fade-in for blocks
        this.blocksOpacity = this.blockFadeProgress;

        // Transition to COMPLETE when blocks are fully visible
        if (this.stateTimer >= duration) {
            this.state = BossEmergenceController.STATES.COMPLETE;
            this.blocksOpacity = 1;
        }
    }

    /**
     * Spawns particle effects around the portal during emergence.
     */
    spawnEmergenceParticles() {
        if (!this.portal) return;

        const numParticles = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < numParticles; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 60 + Math.random() * 40;
            
            this.emergenceParticles.push({
                x: this.portal.x + Math.cos(angle) * distance,
                y: this.portal.y + Math.sin(angle) * distance,
                vx: Math.cos(angle) * (50 + Math.random() * 50),
                vy: Math.sin(angle) * (50 + Math.random() * 50),
                size: 3 + Math.random() * 4,
                life: 1.0,
                decay: 0.8 + Math.random() * 0.4,
                color: Math.random() > 0.5 ? '#FF00FF' : '#00FFFF'
            });
        }
    }

    /**
     * Updates emergence particle effects.
     * @param {number} dt - Delta time in seconds
     */
    updateEmergenceParticles(dt) {
        for (let i = this.emergenceParticles.length - 1; i >= 0; i--) {
            const p = this.emergenceParticles[i];
            
            // Update position
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            
            // Decay velocity
            p.vx *= 0.98;
            p.vy *= 0.98;
            
            // Decay life
            p.life -= p.decay * dt;
            
            // Remove dead particles
            if (p.life <= 0) {
                this.emergenceParticles.splice(i, 1);
            }
        }
    }

    /**
     * Draws emergence particle effects.
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    drawEmergenceParticles(ctx) {
        for (const p of this.emergenceParticles) {
            ctx.save();
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.shadowBlur = 10;
            ctx.shadowColor = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    /**
     * Cubic ease-out function for smooth animation.
     * @param {number} t - Progress value (0-1)
     * @returns {number} Eased value (0-1)
     */
    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    /**
     * Checks if the emergence sequence is complete.
     * @returns {boolean} True if emergence is complete
     */
    isComplete() {
        return this.state === BossEmergenceController.STATES.COMPLETE;
    }

    /**
     * Gets the current state of the emergence sequence.
     * @returns {string} Current state
     */
    getState() {
        return this.state;
    }

    /**
     * Gets the current boss scale (0-1).
     * @returns {number} Boss scale value
     */
    getBossScale() {
        return this.bossScale;
    }

    /**
     * Gets the current blocks opacity (0-1).
     * @returns {number} Blocks opacity value
     */
    getBlocksOpacity() {
        return this.blocksOpacity;
    }

    /**
     * Gets the total elapsed time since emergence started.
     * @returns {number} Total elapsed time in seconds
     */
    getTotalElapsedTime() {
        const TIMING = BossEmergenceController.TIMING;
        
        switch (this.state) {
            case BossEmergenceController.STATES.WAITING:
                return 0;
            case BossEmergenceController.STATES.PORTAL_OPENING:
                return this.stateTimer;
            case BossEmergenceController.STATES.EMERGING:
                return TIMING.PORTAL_DURATION + this.stateTimer;
            case BossEmergenceController.STATES.BLOCKS_APPEARING:
                return TIMING.PORTAL_DURATION + TIMING.EMERGENCE_DURATION + this.stateTimer;
            case BossEmergenceController.STATES.COMPLETE:
                return TIMING.PORTAL_DURATION + TIMING.EMERGENCE_DURATION + TIMING.BLOCKS_FADE_DURATION;
            default:
                return 0;
        }
    }

    /**
     * Resets the emergence controller to initial state.
     */
    reset() {
        this.state = BossEmergenceController.STATES.WAITING;
        this.portalProgress = 0;
        this.emergenceProgress = 0;
        this.blockFadeProgress = 0;
        this.stateTimer = 0;
        this.bossScale = 0;
        this.blocksOpacity = 0;
        this.emergenceParticles = [];
    }
}

// ==================== BOSS PHASE MANAGER CLASS ====================

/**
 * BossPhaseManager class - Manages the 2D boss phase before the 3D arena transition.
 * Handles state machine, countdown, hazard spawning, and portal transition.
 * Requirements: 1.1, 1.3, 1.4
 */
class BossPhaseManager {
    /**
     * Creates a new BossPhaseManager instance.
     * @param {Game} game - Reference to the main game instance
     */
    constructor(game) {
        this.game = game;
        
        // State machine: INACTIVE, COUNTDOWN, EMERGENCE, ACTIVE, TRANSITIONING, TRANSITION_SCREEN
        this.state = 'INACTIVE';
        
        // Countdown properties
        this.countdownValue = 3;
        this.countdownTimer = 0;
        this.countdownDuration = 1; // 1 second per number
        
        // Boss phase components
        this.voidPortal = null;
        this.centralBlock = null;
        this.transitionPortal = null;
        this.portalActivated = false; // Portal activates after 30 seconds
        
        // Center portal for transition (Requirements: 3.1, 3.2)
        this.centerPortal = null;
        
        // Transition screen for typewriter effect (Requirements: 3.3, 3.4, 3.5, 4.1-4.5)
        this.transitionScreen = null;
        
        // Emergence controller for boss emergence animation
        this.emergenceController = null;
        
        // Block projectiles array (Requirements: 2.1, 2.2, 2.3, 2.5)
        this.blockProjectiles = [];
        
        // Hazard spawn timing (HARDER - faster spawns)
        this.laserSpawnInterval = 2000; // ms between laser spawns (was 3000)
        this.boulderSpawnInterval = 1200; // ms between boulder spawns (was 2000)
        this.homingProjectileInterval = 1800; // ms between homing projectiles (was 2500)
        this.lastLaserSpawnTime = 0;
        this.lastBoulderSpawnTime = 0;
        this.lastHomingProjectileTime = 0;
        
        // Homing projectiles array
        this.homingProjectiles = [];
        
        // Phase timing
        this.phaseStartTime = 0;
        this.activeTime = 0;
        
        // Difficulty scaling
        this.difficultyMultiplier = 1.0;
    }

    /**
     * Initializes and starts the boss phase with emergence sequence.
     * Requirements: 1.1, 1.2, 1.3
     */
    start() {
        this.state = 'EMERGENCE';
        this.phaseStartTime = Date.now();
        this.activeTime = 0;
        
        // Initialize void portal in upper-middle screen
        const portalX = window.innerWidth / 2;
        const portalY = 150;
        this.voidPortal = new VoidPortal(portalX, portalY);
        
        // Initialize central block with orbiting blocks (but don't start yet - emergence controller will handle it)
        const blockCount = 8 + Math.floor(Math.random() * 5); // 8-12 blocks
        this.centralBlock = new CentralBlock(portalX, portalY + 50, blockCount);
        
        // Initialize emergence controller and start the emergence sequence
        this.emergenceController = new BossEmergenceController(this.centralBlock, this.voidPortal);
        this.emergenceController.start();
        
        // Initialize transition portal on far right (but don't activate yet)
        this.transitionPortal = new TransitionPortal(this.game);
        // Portal will be activated after 30 seconds
        this.portalActivated = false;
        
        // Initialize center portal for transition (Requirements: 3.1, 3.2)
        this.centerPortal = null;
        
        // Initialize transition screen (Requirements: 3.3, 3.4, 3.5, 4.1-4.5)
        this.transitionScreen = new TransitionScreen(this.game);
        
        // Reset hazard spawn times (will be set when emergence completes)
        this.lastLaserSpawnTime = 0;
        this.lastBoulderSpawnTime = 0;
        this.lastHomingProjectileTime = 0;
        this.homingProjectiles = [];
        
        // Reset block projectiles (Requirements: 2.1)
        this.blockProjectiles = [];
    }

    /**
     * Updates the countdown timer and transitions to ACTIVE state.
     * Requirements: 1.3, 1.4
     * @param {number} dt - Delta time in seconds
     */
    updateCountdown(dt) {
        this.countdownTimer += dt;
        
        if (this.countdownTimer >= this.countdownDuration) {
            this.countdownTimer = 0;
            this.countdownValue--;
            
            if (this.countdownValue <= 0) {
                // Countdown complete - enable gameplay
                this.state = 'ACTIVE';
                this.activeTime = 0;
            }
        }
        
        // Update visual components during countdown
        if (this.voidPortal) this.voidPortal.update(dt);
        if (this.centralBlock) this.centralBlock.update(dt);
        if (this.transitionPortal) this.transitionPortal.update(dt);
    }

    /**
     * Updates the emergence sequence.
     * Requirements: 1.1, 1.2, 1.4
     * @param {number} dt - Delta time in seconds
     */
    updateEmergence(dt) {
        if (!this.emergenceController) return;
        
        // Update the emergence controller
        this.emergenceController.update(dt);
        
        // Apply boss scale from emergence controller
        if (this.centralBlock) {
            const scale = this.emergenceController.getBossScale();
            this.centralBlock.emergenceScale = scale;
        }
        
        // Apply blocks opacity from emergence controller
        if (this.centralBlock && this.centralBlock.orbitingBlocks) {
            const opacity = this.emergenceController.getBlocksOpacity();
            this.centralBlock.blocksOpacity = opacity;
        }
        
        // Update transition portal (but don't activate yet)
        if (this.transitionPortal) this.transitionPortal.update(dt);
        
        // Check if emergence is complete
        if (this.emergenceController.isComplete()) {
            // Transition to ACTIVE state
            this.state = 'ACTIVE';
            this.activeTime = 0;
            
            // Reset hazard spawn times to now
            const now = Date.now();
            this.lastLaserSpawnTime = now;
            this.lastBoulderSpawnTime = now;
            this.lastHomingProjectileTime = now;
        }
    }

    /**
     * Main update loop for the boss phase.
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        if (this.state === 'INACTIVE') return;
        
        if (this.state === 'COUNTDOWN') {
            this.updateCountdown(dt);
            return;
        }
        
        if (this.state === 'EMERGENCE') {
            this.updateEmergence(dt);
            return;
        }
        
        if (this.state === 'TRANSITIONING') {
            // Handle transition animation if needed
            return;
        }
        
        if (this.state === 'TRANSITION_SCREEN') {
            // Update transition screen (Requirements: 3.3, 3.4, 3.5, 4.1-4.5)
            if (this.transitionScreen) {
                this.transitionScreen.update(dt);
            }
            return;
        }
        
        // ACTIVE state - full boss phase gameplay
        this.activeTime += dt;
        
        // Increase difficulty over time (spawn faster as time goes on)
        this.difficultyMultiplier = 1.0 + (this.activeTime / 60); // Gets harder every minute
        
        // Activate center portal after 30 seconds (Requirements: 3.1)
        if (!this.portalActivated && this.activeTime >= 30) {
            // Create VoidPortal at screen center
            const centerX = window.innerWidth / 2;
            const centerY = this.game.floorY - 100; // Above the floor
            this.centerPortal = new VoidPortal(centerX, centerY);
            this.centerPortal.start();
            this.portalActivated = true;
            
            // Also start the old transition portal for visual variety
            this.transitionPortal.start();
        }
        
        // Update visual components
        if (this.voidPortal) this.voidPortal.update(dt);
        if (this.centralBlock) {
            this.centralBlock.update(dt);
            // Track time since emergence for block throwing (Requirements: 2.1)
            this.centralBlock.updateTimeSinceEmergence(dt);
            
            // Check if boss should throw a block (30 seconds since emergence)
            if (this.centralBlock.shouldThrowBlock() && this.game.player) {
                this.throwBlockAtPlayer();
            }
        }
        if (this.transitionPortal && this.portalActivated) this.transitionPortal.update(dt);
        if (this.centerPortal && this.portalActivated) this.centerPortal.update(dt);
        
        // Spawn hazards
        this.spawnHazards();
        
        // Update homing projectiles
        this.updateHomingProjectiles(dt);
        
        // Update block projectiles (Requirements: 2.1, 2.2, 2.3, 2.5)
        this.updateBlockProjectiles(dt);
        
        // Check if player entered center portal (Requirements: 3.2)
        if (this.checkCenterPortal()) {
            this.state = 'TRANSITION_SCREEN';
            // Start transition screen with typewriter effect
            this.startTransitionScreen();
        }
        
        // Also check old transition portal for backwards compatibility
        if (this.checkTransitionPortal()) {
            this.state = 'TRANSITION_SCREEN';
            // Start transition screen with typewriter effect
            this.startTransitionScreen();
        }
    }

    /**
     * Throws a block from the boss toward the player.
     * Requirements: 2.1, 2.4
     */
    throwBlockAtPlayer() {
        if (!this.centralBlock || !this.game.player) return;
        
        const projectile = this.centralBlock.throwBlock(
            this.game.player.x,
            this.game.player.y
        );
        
        if (projectile) {
            this.blockProjectiles.push(projectile);
            this.centralBlock.markBlockThrown();
        }
    }

    /**
     * Updates all block projectiles.
     * Requirements: 2.1, 2.2, 2.3, 2.5
     * @param {number} dt - Delta time in seconds
     */
    updateBlockProjectiles(dt) {
        for (let i = this.blockProjectiles.length - 1; i >= 0; i--) {
            const proj = this.blockProjectiles[i];
            
            // Update projectile
            proj.update(dt);
            
            // Remove if exited
            if (proj.hasExited()) {
                this.blockProjectiles.splice(i, 1);
                continue;
            }
            
            // Check collision with player (Requirements: 2.5)
            if (this.game.player && proj.checkCollision(this.game.player)) {
                this.game.shake(8);
                this.game.gameOver();
                return;
            }
        }
    }

    /**
     * Spawns corner lasers, boulders, and homing projectiles based on timing.
     */
    spawnHazards() {
        const now = Date.now();
        
        // Apply difficulty multiplier to spawn intervals
        const laserInterval = this.laserSpawnInterval / this.difficultyMultiplier;
        const boulderInterval = this.boulderSpawnInterval / this.difficultyMultiplier;
        const homingInterval = this.homingProjectileInterval / this.difficultyMultiplier;
        
        // Spawn corner lasers
        if (now - this.lastLaserSpawnTime > laserInterval) {
            this.spawnCornerLaser();
            this.lastLaserSpawnTime = now;
            
            // Sometimes spawn double lasers when difficulty is high
            if (this.difficultyMultiplier > 1.3 && Math.random() < 0.3) {
                setTimeout(() => this.spawnCornerLaser(), 300);
            }
        }
        
        // Spawn boulders
        if (now - this.lastBoulderSpawnTime > boulderInterval) {
            this.spawnBoulder();
            this.lastBoulderSpawnTime = now;
            
            // Spawn multiple boulders when difficulty is high
            if (this.difficultyMultiplier > 1.2 && Math.random() < 0.4) {
                setTimeout(() => this.spawnBoulder(), 200);
            }
        }
        
        // Spawn homing projectiles
        if (now - this.lastHomingProjectileTime > homingInterval) {
            this.spawnHomingProjectile();
            this.lastHomingProjectileTime = now;
        }
    }

    /**
     * Spawns a homing projectile that targets the player's current position.
     * The projectile takes 2 seconds to reach the target and doesn't change direction.
     */
    spawnHomingProjectile() {
        if (!this.game.player) return;
        
        // Spawn from random edge of screen
        const side = Math.random();
        let startX, startY;
        
        if (side < 0.33) {
            // From top
            startX = Math.random() * window.innerWidth;
            startY = -30;
        } else if (side < 0.66) {
            // From left
            startX = -30;
            startY = 100 + Math.random() * (this.game.floorY - 200);
        } else {
            // From right
            startX = window.innerWidth + 30;
            startY = 100 + Math.random() * (this.game.floorY - 200);
        }
        
        // Target player's current position
        const targetX = this.game.player.x;
        const targetY = this.game.player.y;
        
        // Calculate velocity to reach target in 2 seconds
        const travelTime = 2; // seconds
        const vx = (targetX - startX) / travelTime;
        const vy = (targetY - startY) / travelTime;
        
        this.homingProjectiles.push({
            x: startX,
            y: startY,
            vx: vx,
            vy: vy,
            size: 15,
            color: '#FF00FF', // Magenta
            lifetime: 0,
            maxLifetime: 3 // Disappear after 3 seconds
        });
    }

    /**
     * Updates all homing projectiles.
     * @param {number} dt - Delta time in seconds
     */
    updateHomingProjectiles(dt) {
        for (let i = this.homingProjectiles.length - 1; i >= 0; i--) {
            const proj = this.homingProjectiles[i];
            
            // Update position
            proj.x += proj.vx * dt;
            proj.y += proj.vy * dt;
            proj.lifetime += dt;
            
            // Remove if expired
            if (proj.lifetime > proj.maxLifetime) {
                this.homingProjectiles.splice(i, 1);
                continue;
            }
            
            // Check collision with player
            if (this.game.player) {
                const px = this.game.player.x;
                const py = this.game.player.y;
                const ps = this.game.player.size;
                
                const dx = proj.x - px;
                const dy = proj.y - py;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < (proj.size + ps) / 2) {
                    this.game.shake(5);
                    this.game.gameOver();
                    return;
                }
            }
        }
    }

    /**
     * Draws all homing projectiles.
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    drawHomingProjectiles(ctx) {
        for (const proj of this.homingProjectiles) {
            ctx.save();
            ctx.translate(proj.x, proj.y);
            
            // Pulsing glow effect
            const pulse = 0.5 + 0.5 * Math.sin(proj.lifetime * 10);
            ctx.shadowBlur = 15 + pulse * 10;
            ctx.shadowColor = proj.color;
            
            // Draw projectile as a diamond shape
            ctx.fillStyle = proj.color;
            ctx.beginPath();
            ctx.moveTo(0, -proj.size);
            ctx.lineTo(proj.size * 0.6, 0);
            ctx.lineTo(0, proj.size);
            ctx.lineTo(-proj.size * 0.6, 0);
            ctx.closePath();
            ctx.fill();
            
            // Inner glow
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(0, 0, proj.size * 0.3, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        }
    }

    /**
     * Spawns a corner laser targeting the player.
     * Requirements: 2.1
     */
    spawnCornerLaser() {
        const corner = Math.random() > 0.5 ? 'left' : 'right';
        if (this.game.obstacles) {
            this.game.obstacles.spawnCornerLaser(corner);
        }
    }

    /**
     * Spawns a boulder at a random position.
     * Requirements: 2.2, 2.3
     */
    spawnBoulder() {
        if (this.game.obstacles) {
            this.game.obstacles.spawnBoulder();
        }
    }

    /**
     * Checks if the player has entered the transition portal.
     * Requirements: 3.3
     * @returns {boolean} True if player entered the portal
     */
    checkTransitionPortal() {
        if (!this.portalActivated || !this.transitionPortal || !this.game.player) return false;
        return this.transitionPortal.checkPlayerEntry(this.game.player);
    }

    /**
     * Checks if the player has entered the center portal.
     * Requirements: 3.1, 3.2
     * @returns {boolean} True if player entered the center portal
     */
    checkCenterPortal() {
        if (!this.portalActivated || !this.centerPortal || !this.game.player) return false;
        return this.centerPortal.checkPlayerCollision(this.game.player);
    }

    /**
     * Starts the transition screen with typewriter effect.
     * Requirements: 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5
     */
    startTransitionScreen() {
        console.log('Starting transition screen...');
        
        // Pause the game audio
        if (this.game.audio) {
            this.game.audio.pause();
        }
        
        // Start the transition screen with callback to trigger 3D arena
        if (this.transitionScreen) {
            this.transitionScreen.start(() => {
                this.state = 'TRANSITIONING';
                this.triggerTransition();
            });
        } else {
            // Fallback if transition screen not available
            this.state = 'TRANSITIONING';
            this.triggerTransition();
        }
    }

    /**
     * Triggers the transition to the 3D arena.
     * Requirements: 3.3, 9.2
     */
    triggerTransition() {
        console.log('Transitioning to 3D arena...');
        
        // Hide the transition screen if it exists
        if (this.transitionScreen) {
            this.transitionScreen.active = false;
            if (this.transitionScreen.container) {
                this.transitionScreen.container.classList.add('hidden');
                this.transitionScreen.container.classList.remove('active');
                this.transitionScreen.container.style.display = 'none';
            }
        }
        
        // Also hide any transition-screen element by ID (fallback)
        const transitionScreenEl = document.getElementById('transition-screen');
        if (transitionScreenEl) {
            transitionScreenEl.classList.add('hidden');
            transitionScreenEl.classList.remove('active');
            transitionScreenEl.style.display = 'none';
        }
        
        // 3D Arena is still in development - show message and trigger win
        this.show3DDevMessage();
    }
    
    /**
     * Shows a "still in development" message for the 3D arena and triggers win.
     */
    show3DDevMessage() {
        // Create dev message overlay
        let devOverlay = document.getElementById('dev-message-overlay');
        if (!devOverlay) {
            devOverlay = document.createElement('div');
            devOverlay.id = 'dev-message-overlay';
            devOverlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.9);
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                font-family: 'Courier New', monospace;
            `;
            devOverlay.innerHTML = `
                <div style="text-align: center; color: #00ffff; text-shadow: 0 0 20px #00ffff;">
                    <h1 style="font-size: 3rem; margin-bottom: 1rem;">🚧 3D ARENA 🚧</h1>
                    <p style="font-size: 1.5rem; color: #ffaa00; margin-bottom: 2rem;">Still in development for optimization</p>
                    <p style="font-size: 1.2rem; color: #aaa;">You've completed the 2D stages!</p>
                    <p style="font-size: 1rem; color: #888; margin-top: 1rem;">Redirecting to victory...</p>
                </div>
            `;
            document.body.appendChild(devOverlay);
        }
        devOverlay.style.display = 'flex';
        
        // After 3 seconds, trigger victory
        setTimeout(() => {
            devOverlay.style.display = 'none';
            this.game.victory();
        }, 3000);
    }

    /**
     * Draws all boss phase elements.
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    draw(ctx) {
        if (this.state === 'INACTIVE') return;
        
        // Don't draw game elements during transition screen
        if (this.state === 'TRANSITION_SCREEN') return;
        
        // Draw void portal
        if (this.voidPortal) this.voidPortal.draw(ctx);
        
        // Draw emergence particles during emergence phase
        if (this.emergenceController && this.state === 'EMERGENCE') {
            this.emergenceController.drawEmergenceParticles(ctx);
        }
        
        // Draw central block with orbiting blocks
        if (this.centralBlock) this.centralBlock.draw(ctx);
        
        // Draw transition portal (only when activated after 30 seconds)
        if (this.transitionPortal && this.portalActivated) this.transitionPortal.draw(ctx);
        
        // Draw center portal (Requirements: 3.1)
        if (this.centerPortal && this.portalActivated) this.centerPortal.draw(ctx);
        
        // Draw homing projectiles
        this.drawHomingProjectiles(ctx);
        
        // Draw block projectiles (Requirements: 2.1, 2.2, 2.3)
        this.drawBlockProjectiles(ctx);
        
        // Draw countdown if in countdown state
        if (this.state === 'COUNTDOWN') {
            this.drawCountdown(ctx);
        }
    }

    /**
     * Draws all block projectiles.
     * Requirements: 2.1, 2.2, 2.3
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    drawBlockProjectiles(ctx) {
        for (const proj of this.blockProjectiles) {
            proj.draw(ctx);
        }
    }

    /**
     * Draws the 3-2-1 countdown display.
     * Requirements: 1.3
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    drawCountdown(ctx) {
        if (this.countdownValue <= 0) return;
        
        ctx.save();
        
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        
        // Calculate scale animation (starts big, shrinks)
        const progress = this.countdownTimer / this.countdownDuration;
        const scale = 1.5 - progress * 0.5;
        const alpha = 1 - progress * 0.3;
        
        // Draw countdown number
        ctx.globalAlpha = alpha;
        ctx.font = `bold ${120 * scale}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Glow effect
        ctx.shadowBlur = 40;
        ctx.shadowColor = '#FF0000';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(this.countdownValue.toString(), centerX, centerY);
        
        // Inner text
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#FFFFFF';
        ctx.fillStyle = '#FF4444';
        ctx.fillText(this.countdownValue.toString(), centerX, centerY);
        
        ctx.restore();
    }

    /**
     * Gets the current state of the boss phase.
     * @returns {string} Current state: INACTIVE, COUNTDOWN, ACTIVE, or TRANSITIONING
     */
    getState() {
        return this.state;
    }

    /**
     * Checks if the boss phase is currently active (not inactive).
     * @returns {boolean} True if boss phase is running
     */
    isActive() {
        return this.state !== 'INACTIVE';
    }

    /**
     * Resets the boss phase to initial state.
     */
    reset() {
        this.state = 'INACTIVE';
        this.countdownValue = 3;
        this.countdownTimer = 0;
        this.activeTime = 0;
        
        if (this.voidPortal) this.voidPortal.reset();
        if (this.centralBlock) this.centralBlock.reset();
        if (this.transitionPortal) this.transitionPortal.reset();
        if (this.emergenceController) this.emergenceController.reset();
        
        this.voidPortal = null;
        this.centralBlock = null;
        this.transitionPortal = null;
        this.emergenceController = null;
        
        // Reset projectiles (Requirements: 2.1)
        this.homingProjectiles = [];
        this.blockProjectiles = [];
    }
}

// ==================== STAGE MANAGER ====================

/**
 * StageManager class manages stage progression, configuration, and transitions.
 * Handles multi-stage gameplay with different music, durations, and difficulty settings.
 */
class StageManager {
    constructor(game) {
        this.game = game;
        this.currentStage = 1;
        
        // Background URLs for each stage (Hollow Knight themed)
        this.backgroundUrls = {
            menu: 'https://66.media.tumblr.com/a39fda9404dedfd07b7389557d896d86/91e436d4558c63e3-af/s1280x1920/1e2d3840f021beba58dd85f4245c76d5b02cca55.png',
            1: 'https://wallpapercave.com/wp/wp4265399.jpg', // Stage 1 - Hollow Knight themed
            2: 'https://i.pinimg.com/736x/62/89/49/6289497a9dd32675327fa329a072258a.jpg', // Stage 2
            3: 'https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/e98cffce-5eb7-438b-a225-767cde3b087c/df2887e-8c929c25-e860-4ff2-9bc6-cab10fa7c598.png/v1/fill/w_1280,h_720,q_80,strp/hollow_knight_wallpaper___void_by_brightdarknessxx_df2887e-fullview.jpg?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOjdlMGQxODg5ODIyNjQzNzNhNWYwZDQxNWVhMGQyNmUwIiwiaXNzIjoidXJuOmFwcDo3ZTBkMTg4OTgyMjY0MzczYTVmMGQ0MTVlYTBkMjZlMCIsIm9iaiI6W1t7ImhlaWdodCI6Ijw9NzIwIiwicGF0aCI6Ii9mL2U5OGNmZmNlLTVlYjctNDM4Yi1hMjI1LTc2N2NkZTNiMDg3Yy9kZjI4ODdlLThjOTI5YzI1LWU4NjAtNGZmMi05YmM2LWNhYjEwZmE3YzU5OC5wbmciLCJ3aWR0aCI6Ijw9MTI4MCJ9XV0sImF1ZCI6WyJ1cm46c2VydmljZTppbWFnZS5vcGVyYXRpb25zIl19.bzYLBH-vndx4_aHlATXgtB4Zrkmwnd_L5pYXc-VKqH0' // Boss Phase 1 - Void themed
        };
        
        // Stage configurations
        this.stageConfigs = {
            1: {
                stageNumber: 1,
                musicUrl: 'https://cdn.jsdelivr.net/gh/Anosvolde-d/grimm@c73fbff5b21060333c7f1b7c82e00e8e04380814/Grimm%20(1).mp3',
                duration: 180, // 3 minutes
                blockSize: 40,
                enableFloatingIsles: false,
                isBossPhase: false,
                phaseFunction: (elapsed) => this.getStage1Phase(elapsed)
            },
            2: {
                stageNumber: 2,
                musicUrl: 'https://cdn.jsdelivr.net/gh/Anosvolde-d/phqse2@991eccc152f42a3c54f94f6ffbb5dc3be137df25/Moi.mp3',
                duration: 58.6, // ~1 minute based on track length
                blockSize: 50, // Larger blocks for Stage 2
                enableFloatingIsles: true,
                isBossPhase: false,
                phaseFunction: getStage2Phase
            },
            3: {
                stageNumber: 3,
                musicUrl: 'https://cdn.jsdelivr.net/gh/Anosvolde-d/grimm@c73fbff5b21060333c7f1b7c82e00e8e04380814/Grimm%20(1).mp3', // Boss phase music
                duration: Infinity, // Boss phase has no time limit - ends when player enters portal
                blockSize: 40,
                enableFloatingIsles: false,
                isBossPhase: true, // Flag to indicate this is the boss phase
                phaseFunction: (elapsed) => this.getBossPhase(elapsed)
            }
        };
        
        // Relaxation music URL for between stages
        this.relaxationMusicUrl = 'https://cdn.jsdelivr.net/gh/Anosvolde-d/phqse2@a384186c18e74af1fbcec6c4572e5094426574d9/02.%20Dirtmouth.mp3';
    }

    /**
     * Sets the background image for the current stage.
     * @param {number|string} stage - Stage number or 'menu' for menu background
     */
    setBackground(stage) {
        const backgroundLayer = document.getElementById('background-layer');
        if (!backgroundLayer) return;
        
        const url = this.backgroundUrls[stage] || this.backgroundUrls.menu;
        backgroundLayer.style.backgroundImage = `url('${url}')`;
        console.log(`Background set for stage: ${stage}`);
    }

    /**
     * Get current stage configuration
     * @returns {StageConfig} Current stage configuration object
     */
    getConfig() {
        return this.stageConfigs[this.currentStage] || this.stageConfigs[1];
    }

    /**
     * Get phase based on elapsed time for current stage
     * @param {number} elapsed - Elapsed time in seconds
     * @returns {PhaseConfig} Phase configuration for current time
     */
    getPhase(elapsed) {
        const config = this.getConfig();
        return config.phaseFunction(elapsed);
    }

    /**
     * Stage 1 phase function - uses existing ObstacleManager phases
     * @param {number} elapsed - Elapsed time in seconds
     * @returns {PhaseConfig} Phase configuration
     */
    getStage1Phase(elapsed) {
        // Reuse existing phase logic from ObstacleManager
        let phaseName;
        if (elapsed < 3) phaseName = 'INTRO';
        else if (elapsed < 7) phaseName = 'FIRST_PULSE';
        else if (elapsed < 45) phaseName = 'CALM';
        else if (elapsed < 56) phaseName = 'BUILD';
        else if (elapsed < 60) phaseName = 'MINI_DROP';
        else if (elapsed < 118) phaseName = 'CORE';
        else if (elapsed < 122) phaseName = 'BREAK';
        else phaseName = 'FINAL';

        // Map phase names to configs
        const phaseConfigs = {
            'INTRO': { name: 'INTRO', spawnInterval: 9999, warningTime: 2500, fallSpeed: 0, shake: 0 },
            'FIRST_PULSE': { name: 'FIRST_PULSE', spawnInterval: 1500, warningTime: 2000, fallSpeed: 4, shake: 0 },
            'CALM': { name: 'CALM', spawnInterval: 800, warningTime: 1500, fallSpeed: 5, shake: 0 },
            'BUILD': { name: 'BUILD', spawnInterval: 500, warningTime: 1200, fallSpeed: 6, shake: 2 },
            'MINI_DROP': { name: 'MINI_DROP', spawnInterval: 350, warningTime: 800, fallSpeed: 8, shake: 5 },
            'CORE': { name: 'CORE', spawnInterval: 300, warningTime: 700, fallSpeed: 9, shake: 3 },
            'BREAK': { name: 'BREAK', spawnInterval: 9999, warningTime: 2000, fallSpeed: 0, shake: 0 },
            'FINAL': { name: 'FINAL', spawnInterval: 200, warningTime: 500, fallSpeed: 12, shake: 8 }
        };

        return phaseConfigs[phaseName] || phaseConfigs['CALM'];
    }

    /**
     * Transition to next stage
     */
    nextStage() {
        const maxStage = Object.keys(this.stageConfigs).length;
        if (this.currentStage < maxStage) {
            this.currentStage++;
        }
    }

    /**
     * Check if current stage is complete
     * @param {number} elapsed - Elapsed time in seconds
     * @returns {boolean} True if stage duration exceeded
     */
    isStageComplete(elapsed) {
        const config = this.getConfig();
        return elapsed >= config.duration;
    }

    /**
     * Get music URL for current stage
     * @returns {string} Music URL
     */
    getMusicUrl() {
        return this.getConfig().musicUrl;
    }

    /**
     * Get relaxation music URL for between stages
     * @returns {string} Relaxation music URL
     */
    getRelaxationMusicUrl() {
        return this.relaxationMusicUrl;
    }

    /**
     * Get block size for current stage
     * @returns {number} Block size in pixels
     */
    getBlockSize() {
        return this.getConfig().blockSize;
    }

    /**
     * Check if floating isles are enabled for current stage
     * @returns {boolean} True if floating isles should spawn
     */
    areFloatingIslesEnabled() {
        return this.getConfig().enableFloatingIsles;
    }

    /**
     * Check if current stage is the boss phase
     * Requirements: 1.1
     * @returns {boolean} True if current stage is boss phase
     */
    isBossPhase() {
        return this.getConfig().isBossPhase || false;
    }

    /**
     * Boss phase function - returns phase config for boss stage
     * Requirements: 1.1
     * @param {number} elapsed - Elapsed time in seconds
     * @returns {PhaseConfig} Phase configuration for boss phase
     */
    getBossPhase(elapsed) {
        // Boss phase has consistent difficulty - no phases
        return {
            name: 'BOSS',
            spawnInterval: 9999, // Hazards are managed by BossPhaseManager
            warningTime: 0,
            fallSpeed: 0,
            shake: 0
        };
    }

    /**
     * Reset to stage 1
     */
    reset() {
        this.currentStage = 1;
    }
}

// ==================== SHARD CLASS ====================

/**
 * Shard class - Collectible white shard in the 3D arena.
 * Creates a white glowing mesh with hover animation, rotation, and vertical oscillation.
 * Requirements: 5.2, 5.3, 5.4
 */
class Shard {
    /**
     * Creates a new Shard instance.
     * @param {Object} position - Initial position {x, y, z}
     */
    constructor(position) {
        this.mesh = null;
        this.glowMesh = null;
        this.position = { ...position };
        this.baseY = position.y;
        this.rotationSpeed = 2; // radians per second
        this.hoverAmplitude = 0.3; // units
        this.hoverSpeed = 2; // oscillations per second
        this.collected = false;
        this.collectionRadius = 2; // units for collection detection
        this.time = Math.random() * Math.PI * 2; // Random start phase for hover
    }

    /**
     * Creates the shard mesh and adds it to the scene.
     * Requirements: 5.2
     * @param {THREE.Scene} scene - The Three.js scene
     */
    create(scene) {
        if (typeof THREE === 'undefined') return;

        // Create octahedron geometry for shard shape
        const geometry = new THREE.OctahedronGeometry(0.5, 0);
        
        // Create glowing white material
        const material = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 0.8,
            metalness: 0.3,
            roughness: 0.2,
            transparent: true,
            opacity: 0.95
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(this.position.x, this.position.y, this.position.z);
        this.mesh.castShadow = true;
        
        // Add outer glow effect
        const glowGeometry = new THREE.OctahedronGeometry(0.7, 0);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.3,
            side: THREE.BackSide
        });
        this.glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        this.mesh.add(this.glowMesh);

        // Add point light for glow effect
        const light = new THREE.PointLight(0xffffff, 0.5, 5);
        light.position.set(0, 0, 0);
        this.mesh.add(light);

        scene.add(this.mesh);
    }

    /**
     * Updates the shard animation (rotation and hover).
     * Requirements: 5.2
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        if (!this.mesh || this.collected) return;

        this.time += dt;

        // Rotation animation
        this.mesh.rotation.y += this.rotationSpeed * dt;
        this.mesh.rotation.x += this.rotationSpeed * 0.5 * dt;

        // Vertical oscillation (hover)
        const hoverOffset = Math.sin(this.time * this.hoverSpeed * Math.PI * 2) * this.hoverAmplitude;
        this.mesh.position.y = this.baseY + hoverOffset;

        // Pulse glow effect
        if (this.glowMesh) {
            const pulse = 0.25 + Math.sin(this.time * 3) * 0.1;
            this.glowMesh.material.opacity = pulse;
        }
    }

    /**
     * Checks if the player is close enough to collect the shard.
     * Requirements: 5.3
     * @param {Object} playerPosition - Player position {x, y, z}
     * @returns {boolean} True if player can collect the shard
     */
    checkCollection(playerPosition) {
        if (this.collected || !this.mesh) return false;

        const dx = playerPosition.x - this.mesh.position.x;
        const dy = playerPosition.y - this.mesh.position.y;
        const dz = playerPosition.z - this.mesh.position.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        return distance < this.collectionRadius;
    }

    /**
     * Plays the collection particle effect and sound.
     * Requirements: 5.4
     * @param {THREE.Scene} scene - The Three.js scene
     */
    playCollectionEffect(scene) {
        if (!this.mesh || typeof THREE === 'undefined') return;

        // Create particle burst effect
        const particleCount = 20;
        const particles = [];
        
        for (let i = 0; i < particleCount; i++) {
            const particleGeometry = new THREE.SphereGeometry(0.1, 8, 8);
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 1
            });
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            
            // Position at shard location
            particle.position.copy(this.mesh.position);
            
            // Random velocity
            particle.userData.velocity = {
                x: (Math.random() - 0.5) * 10,
                y: Math.random() * 5 + 2,
                z: (Math.random() - 0.5) * 10
            };
            particle.userData.life = 1.0;
            
            scene.add(particle);
            particles.push(particle);
        }

        // Animate particles (will be cleaned up by arena manager)
        const animateParticles = () => {
            let allDead = true;
            particles.forEach(p => {
                if (p.userData.life > 0) {
                    allDead = false;
                    p.position.x += p.userData.velocity.x * 0.016;
                    p.position.y += p.userData.velocity.y * 0.016;
                    p.position.z += p.userData.velocity.z * 0.016;
                    p.userData.velocity.y -= 15 * 0.016; // Gravity
                    p.userData.life -= 0.016 * 2;
                    p.material.opacity = p.userData.life;
                    
                    if (p.userData.life <= 0) {
                        scene.remove(p);
                        p.geometry.dispose();
                        p.material.dispose();
                    }
                }
            });
            
            if (!allDead) {
                requestAnimationFrame(animateParticles);
            }
        };
        animateParticles();

        // Play collection sound
        this.playCollectionSound();
    }

    /**
     * Plays the collection sound effect.
     * Requirements: 5.4
     */
    playCollectionSound() {
        try {
            // Create a simple collection sound using Web Audio API
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // High-pitched chime sound
            oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(1760, audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (e) {
            // Audio not available, continue silently
            console.warn('Collection sound failed:', e);
        }
    }

    /**
     * Marks the shard as collected and removes it from the scene.
     * Requirements: 5.3
     * @param {THREE.Scene} scene - The Three.js scene
     */
    collect(scene) {
        if (this.collected) return;
        
        this.collected = true;
        this.playCollectionEffect(scene);
        
        // Remove mesh from scene
        if (this.mesh) {
            scene.remove(this.mesh);
            if (this.mesh.geometry) this.mesh.geometry.dispose();
            if (this.mesh.material) this.mesh.material.dispose();
            if (this.glowMesh) {
                if (this.glowMesh.geometry) this.glowMesh.geometry.dispose();
                if (this.glowMesh.material) this.glowMesh.material.dispose();
            }
        }
    }

    /**
     * Checks if the shard has been collected.
     * @returns {boolean} True if collected
     */
    isCollected() {
        return this.collected;
    }

    /**
     * Gets the shard's current position.
     * @returns {Object} Position {x, y, z}
     */
    getPosition() {
        if (this.mesh) {
            return {
                x: this.mesh.position.x,
                y: this.mesh.position.y,
                z: this.mesh.position.z
            };
        }
        return this.position;
    }
}

// ==================== PILLAR CLASS ====================

/**
 * Pillar class - Black pillar that spawns around the boss and produces tracking projectiles.
 * Three pillars emerge from the ground around the boss after Phase 2 trigger.
 * Requirements: 6.6, 7.1
 */
class Pillar {
    /**
     * Creates a new Pillar instance.
     * @param {Object} position - Initial position {x, y, z}
     * @param {Object} bossPosition - Boss position for reference
     */
    constructor(position, bossPosition) {
        this.mesh = null;
        this.glowMesh = null;
        this.position = { ...position };
        this.bossPosition = { ...bossPosition };
        this.emergeProgress = 0;
        this.emerged = false;
        this.emergeDuration = 1.5; // seconds for emergence animation
        this.targetHeight = 8; // final pillar height
        this.spawnTimer = 0;
        this.spawnInterval = 5; // seconds between nuke ball spawns (Requirements: 7.1)
        this.ballsPerSpawn = 2; // nuke balls per spawn (Requirements: 7.1)
        this.active = false;
    }

    /**
     * Creates the pillar mesh and adds it to the scene.
     * Requirements: 6.6
     * @param {THREE.Scene} scene - The Three.js scene
     */
    create(scene) {
        if (typeof THREE === 'undefined') return;

        // Create black pillar geometry (cylinder)
        const geometry = new THREE.CylinderGeometry(0.8, 1.0, this.targetHeight, 8);
        
        // Create dark material with subtle glow
        const material = new THREE.MeshStandardMaterial({
            color: 0x111111,
            emissive: 0x220022,
            emissiveIntensity: 0.3,
            metalness: 0.8,
            roughness: 0.3
        });

        this.mesh = new THREE.Mesh(geometry, material);
        // Start below ground for emergence animation
        this.mesh.position.set(this.position.x, -this.targetHeight / 2, this.position.z);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        // Add outer glow effect (purple/dark)
        const glowGeometry = new THREE.CylinderGeometry(1.0, 1.2, this.targetHeight + 0.5, 8);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x440044,
            transparent: true,
            opacity: 0.2,
            side: THREE.BackSide
        });
        this.glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        this.mesh.add(this.glowMesh);

        // Add point light at top for glow effect
        const light = new THREE.PointLight(0x660066, 0.5, 10);
        light.position.set(0, this.targetHeight / 2, 0);
        this.mesh.add(light);

        scene.add(this.mesh);
    }

    /**
     * Starts the emergence animation.
     * Requirements: 6.6
     */
    startEmergence() {
        this.emergeProgress = 0;
        this.emerged = false;
    }

    /**
     * Updates the pillar (emergence animation and spawn timer).
     * Requirements: 6.6, 7.1
     * @param {number} dt - Delta time in seconds
     * @returns {boolean} True if nuke balls should be spawned this frame
     */
    update(dt) {
        if (!this.mesh) return false;

        // Handle emergence animation
        if (!this.emerged) {
            this.emergeProgress += dt / this.emergeDuration;
            
            if (this.emergeProgress >= 1) {
                this.emergeProgress = 1;
                this.emerged = true;
                this.active = true;
            }

            // Ease-out animation for emergence
            const t = this.easeOutCubic(this.emergeProgress);
            const targetY = this.targetHeight / 2;
            const startY = -this.targetHeight / 2;
            this.mesh.position.y = startY + (targetY - startY) * t;

            // Shake effect during emergence
            if (this.emergeProgress < 1) {
                this.mesh.position.x = this.position.x + (Math.random() - 0.5) * 0.1 * (1 - this.emergeProgress);
                this.mesh.position.z = this.position.z + (Math.random() - 0.5) * 0.1 * (1 - this.emergeProgress);
            }
            
            return false;
        }

        // Pulse glow effect when active
        if (this.glowMesh) {
            const pulse = 0.15 + Math.sin(Date.now() * 0.003) * 0.1;
            this.glowMesh.material.opacity = pulse;
        }

        // Handle spawn timer - Requirements: 7.1
        if (this.active) {
            this.spawnTimer += dt;
            
            if (this.spawnTimer >= this.spawnInterval) {
                this.spawnTimer = 0;
                return true; // Signal to spawn nuke balls
            }
        }

        return false;
    }

    /**
     * Gets the spawn position for nuke balls (top of pillar).
     * @returns {Object} Position {x, y, z}
     */
    getSpawnPosition() {
        if (this.mesh) {
            return {
                x: this.mesh.position.x,
                y: this.mesh.position.y + this.targetHeight / 2 + 0.5,
                z: this.mesh.position.z
            };
        }
        return {
            x: this.position.x,
            y: this.targetHeight + 0.5,
            z: this.position.z
        };
    }

    /**
     * Gets the number of nuke balls to spawn per interval.
     * Requirements: 7.1
     * @returns {number} Number of balls to spawn
     */
    getBallsPerSpawn() {
        return this.ballsPerSpawn;
    }

    /**
     * Checks if the pillar has fully emerged.
     * @returns {boolean} True if emerged
     */
    hasEmerged() {
        return this.emerged;
    }

    /**
     * Checks if the pillar is active (spawning nuke balls).
     * @returns {boolean} True if active
     */
    isActive() {
        return this.active;
    }

    /**
     * Easing function: ease-out cubic.
     * @param {number} t - Progress (0 to 1)
     * @returns {number} Eased value
     */
    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    /**
     * Cleans up pillar resources.
     * @param {THREE.Scene} scene - The Three.js scene
     */
    cleanup(scene) {
        if (this.mesh) {
            scene.remove(this.mesh);
            if (this.mesh.geometry) this.mesh.geometry.dispose();
            if (this.mesh.material) this.mesh.material.dispose();
            if (this.glowMesh) {
                if (this.glowMesh.geometry) this.glowMesh.geometry.dispose();
                if (this.glowMesh.material) this.glowMesh.material.dispose();
            }
        }
        this.mesh = null;
        this.glowMesh = null;
        this.active = false;
    }
}

// ==================== NUKEBALL CLASS ====================

/**
 * NukeBall class - Green tracking projectile that follows the player.
 * Spawned by pillars, tracks toward player position, has 5-second lifetime.
 * Requirements: 7.2, 7.3, 7.4, 7.5
 */
class NukeBall {
    /**
     * Creates a new NukeBall instance.
     * @param {Object} startPosition - Initial position {x, y, z}
     * @param {Function} targetGetter - Function that returns player position
     */
    constructor(startPosition, targetGetter) {
        this.mesh = null;
        this.glowMesh = null;
        this.position = { ...startPosition };
        this.targetGetter = targetGetter;
        this.speed = 8; // units per second (moderate speed - Requirements: 7.3)
        this.lifetime = 5; // seconds (Requirements: 7.4)
        this.age = 0;
        this.active = true;
        this.hitRadius = 1.2; // collision radius for player hit detection
    }

    /**
     * Creates the nuke ball mesh and adds it to the scene.
     * Requirements: 7.2
     * @param {THREE.Scene} scene - The Three.js scene
     */
    create(scene) {
        if (typeof THREE === 'undefined') return;

        // Create green glowing sphere
        const geometry = new THREE.SphereGeometry(0.5, 16, 16);
        
        // Create glowing green material
        const material = new THREE.MeshStandardMaterial({
            color: 0x00ff00,
            emissive: 0x00ff00,
            emissiveIntensity: 0.8,
            metalness: 0.2,
            roughness: 0.3,
            transparent: true,
            opacity: 0.9
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(this.position.x, this.position.y, this.position.z);
        this.mesh.castShadow = true;

        // Add outer glow effect
        const glowGeometry = new THREE.SphereGeometry(0.8, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.3,
            side: THREE.BackSide
        });
        this.glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        this.mesh.add(this.glowMesh);

        // Add point light for glow effect
        const light = new THREE.PointLight(0x00ff00, 0.8, 8);
        light.position.set(0, 0, 0);
        this.mesh.add(light);

        scene.add(this.mesh);
    }

    /**
     * Updates the nuke ball (tracking and lifetime).
     * Requirements: 7.3, 7.4
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        if (!this.active || !this.mesh) return;

        // Update age and check lifetime - Requirements: 7.4
        this.age += dt;
        if (this.age >= this.lifetime) {
            this.active = false;
            return;
        }

        // Get target position (player)
        const target = this.targetGetter();
        if (!target) return;

        // Calculate direction to player - Requirements: 7.3
        const dx = target.x - this.mesh.position.x;
        const dy = target.y - this.mesh.position.y;
        const dz = target.z - this.mesh.position.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (distance > 0.1) {
            // Normalize and apply speed
            const vx = (dx / distance) * this.speed * dt;
            const vy = (dy / distance) * this.speed * dt;
            const vz = (dz / distance) * this.speed * dt;

            this.mesh.position.x += vx;
            this.mesh.position.y += vy;
            this.mesh.position.z += vz;
        }

        // Pulse glow effect
        if (this.glowMesh) {
            const pulse = 0.25 + Math.sin(this.age * 10) * 0.15;
            this.glowMesh.material.opacity = pulse;
        }

        // Fade out near end of lifetime
        if (this.age > this.lifetime - 1) {
            const fadeProgress = (this.age - (this.lifetime - 1)) / 1;
            this.mesh.material.opacity = 0.9 * (1 - fadeProgress);
            if (this.glowMesh) {
                this.glowMesh.material.opacity *= (1 - fadeProgress);
            }
        }
    }

    /**
     * Checks collision with player.
     * Requirements: 7.5
     * @param {Object} playerPosition - Player position {x, y, z}
     * @returns {boolean} True if collision detected
     */
    checkCollision(playerPosition) {
        if (!this.active || !this.mesh) return false;

        const dx = playerPosition.x - this.mesh.position.x;
        const dy = playerPosition.y - this.mesh.position.y;
        const dz = playerPosition.z - this.mesh.position.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        return distance < this.hitRadius;
    }

    /**
     * Checks if the nuke ball is still active.
     * @returns {boolean} True if active
     */
    isActive() {
        return this.active;
    }

    /**
     * Gets the current age of the nuke ball.
     * @returns {number} Age in seconds
     */
    getAge() {
        return this.age;
    }

    /**
     * Gets the nuke ball's current position.
     * @returns {Object} Position {x, y, z}
     */
    getPosition() {
        if (this.mesh) {
            return {
                x: this.mesh.position.x,
                y: this.mesh.position.y,
                z: this.mesh.position.z
            };
        }
        return this.position;
    }

    /**
     * Destroys the nuke ball and removes it from the scene.
     * @param {THREE.Scene} scene - The Three.js scene
     */
    destroy(scene) {
        this.active = false;
        
        if (this.mesh) {
            scene.remove(this.mesh);
            if (this.mesh.geometry) this.mesh.geometry.dispose();
            if (this.mesh.material) this.mesh.material.dispose();
            if (this.glowMesh) {
                if (this.glowMesh.geometry) this.glowMesh.geometry.dispose();
                if (this.glowMesh.material) this.glowMesh.material.dispose();
            }
        }
        this.mesh = null;
        this.glowMesh = null;
    }
}

// ==================== BOSS MUSIC CONTROLLER CLASS ====================

/**
 * BossMusicController class - Manages phase-specific music with bass analysis for screen shake.
 * Handles audio playback for boss phase 1 (2D) and phase 2 (3D arena), with real-time
 * bass frequency analysis to drive visual effects.
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */
class BossMusicController {
    /**
     * Creates a new BossMusicController instance.
     * @param {Game} game - Reference to the main game instance
     */
    constructor(game) {
        this.game = game;
        
        // Music URLs - Requirements: 9.5, 9.6
        this.phase1Url = 'https://cdn.jsdelivr.net/gh/Anosvolde-d/phqse2@084c8be6e5119cef8d24c72aa305d9a0986ec0a6/boss-battle-music-285748.mp3';
        this.phase2Url = 'https://cdn.jsdelivr.net/gh/Anosvolde-d/phqse2@084c8be6e5119cef8d24c72aa305d9a0986ec0a6/the-final-boss-battle-158700.mp3';
        
        // Audio elements
        this.audioElement = null;
        
        // Audio context and analyser for bass detection - Requirements: 9.3
        this.audioContext = null;
        this.analyser = null;
        this.source = null;
        this.dataArray = null;
        
        // Bass detection configuration
        this.bassThreshold = 200; // Threshold for bass intensity to trigger shake
        this.bassMinFreq = 20;    // Minimum frequency for bass (Hz)
        this.bassMaxFreq = 150;   // Maximum frequency for bass (Hz)
        
        // Current state
        this.currentPhase = 0; // 0 = not playing, 1 = phase 1, 2 = phase 2
        this.isPlaying = false;
        
        // Shake state
        this.lastBassIntensity = 0;
        this.shakeAmount = 0;
    }

    /**
     * Initializes the audio context and analyser.
     * Must be called after user interaction due to browser autoplay policies.
     * @returns {boolean} True if initialization successful
     */
    initAudioContext() {
        if (this.audioContext) {
            // Resume if suspended
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            return true;
        }
        
        try {
            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create analyser node for frequency analysis
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256; // Smaller FFT for faster analysis
            this.analyser.smoothingTimeConstant = 0.8;
            
            // Create data array for frequency data
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            
            console.log('BossMusicController: Audio context initialized');
            return true;
        } catch (e) {
            console.error('BossMusicController: Failed to initialize audio context:', e);
            return false;
        }
    }

    /**
     * Creates and configures the audio element for a given URL.
     * @param {string} url - The music URL to load
     * @returns {HTMLAudioElement} The configured audio element
     */
    createAudioElement(url) {
        const audio = new Audio();
        audio.crossOrigin = 'anonymous';
        audio.preload = 'auto';
        audio.loop = true;
        audio.src = url;
        return audio;
    }

    /**
     * Connects the audio element to the analyser for bass detection.
     * @param {HTMLAudioElement} audioElement - The audio element to connect
     */
    connectToAnalyser(audioElement) {
        if (!this.audioContext || !this.analyser) {
            if (!this.initAudioContext()) {
                return;
            }
        }
        
        try {
            // Disconnect previous source if exists
            if (this.source) {
                try {
                    this.source.disconnect();
                } catch (e) {
                    // Ignore disconnect errors
                }
            }
            
            // Create new media element source
            this.source = this.audioContext.createMediaElementSource(audioElement);
            
            // Connect: source -> analyser -> destination
            this.source.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);
            
            console.log('BossMusicController: Audio connected to analyser');
        } catch (e) {
            console.error('BossMusicController: Failed to connect audio to analyser:', e);
        }
    }

    /**
     * Plays the phase 1 (2D boss phase) music.
     * Requirements: 9.1
     */
    playPhase1() {
        console.log('BossMusicController: Starting phase 1 music');
        
        // Stop any currently playing music
        this.stop();
        
        // Initialize audio context if needed
        this.initAudioContext();
        
        // Create audio element for phase 1
        this.audioElement = this.createAudioElement(this.phase1Url);
        
        // Connect to analyser for bass detection
        this.connectToAnalyser(this.audioElement);
        
        // Play the music
        this.audioElement.play()
            .then(() => {
                this.isPlaying = true;
                this.currentPhase = 1;
                console.log('BossMusicController: Phase 1 music playing');
            })
            .catch(e => {
                console.error('BossMusicController: Failed to play phase 1 music:', e);
                this.handleAudioError('Failed to load boss phase 1 music');
            });
    }

    /**
     * Plays the phase 2 (3D arena) music.
     * Requirements: 9.2
     */
    playPhase2() {
        console.log('BossMusicController: Starting phase 2 music');
        
        // Stop any currently playing music
        this.stop();
        
        // Initialize audio context if needed
        this.initAudioContext();
        
        // Create audio element for phase 2
        this.audioElement = this.createAudioElement(this.phase2Url);
        
        // Connect to analyser for bass detection
        this.connectToAnalyser(this.audioElement);
        
        // Play the music
        this.audioElement.play()
            .then(() => {
                this.isPlaying = true;
                this.currentPhase = 2;
                console.log('BossMusicController: Phase 2 music playing');
            })
            .catch(e => {
                console.error('BossMusicController: Failed to play phase 2 music:', e);
                this.handleAudioError('Failed to load boss phase 2 music');
            });
    }

    /**
     * Handles audio loading errors by showing toast notification.
     * @param {string} message - Error message to display
     */
    handleAudioError(message) {
        // Use game's audio error handling if available
        if (this.game && this.game.handleAudioError) {
            this.game.handleAudioError(message);
        } else {
            console.error('BossMusicController:', message);
        }
    }

    /**
     * Stops the currently playing music.
     */
    stop() {
        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.currentTime = 0;
            this.audioElement = null;
        }
        
        this.isPlaying = false;
        this.currentPhase = 0;
        this.lastBassIntensity = 0;
        this.shakeAmount = 0;
    }

    /**
     * Pauses the currently playing music.
     */
    pause() {
        if (this.audioElement && this.isPlaying) {
            this.audioElement.pause();
        }
    }

    /**
     * Resumes the paused music.
     */
    resume() {
        if (this.audioElement && this.currentPhase > 0) {
            this.audioElement.play().catch(e => {
                console.error('BossMusicController: Failed to resume:', e);
            });
        }
    }

    /**
     * Gets the current bass intensity from the audio.
     * Analyzes low frequencies (20-150Hz) for bass detection.
     * Requirements: 9.3
     * @returns {number} Bass intensity value (0-255)
     */
    getBassIntensity() {
        if (!this.analyser || !this.dataArray || !this.isPlaying) {
            return 0;
        }
        
        // Get frequency data
        this.analyser.getByteFrequencyData(this.dataArray);
        
        // Calculate frequency resolution
        const sampleRate = this.audioContext.sampleRate;
        const binCount = this.analyser.frequencyBinCount;
        const freqPerBin = sampleRate / (binCount * 2);
        
        // Find bin indices for bass frequency range (20-150Hz)
        const minBin = Math.floor(this.bassMinFreq / freqPerBin);
        const maxBin = Math.min(Math.ceil(this.bassMaxFreq / freqPerBin), binCount - 1);
        
        // Calculate average bass intensity
        let bassSum = 0;
        let bassCount = 0;
        
        for (let i = minBin; i <= maxBin; i++) {
            bassSum += this.dataArray[i];
            bassCount++;
        }
        
        const bassIntensity = bassCount > 0 ? bassSum / bassCount : 0;
        this.lastBassIntensity = bassIntensity;
        
        return bassIntensity;
    }

    /**
     * Gets the screen shake amount based on bass intensity.
     * Returns proportional shake when bass exceeds threshold.
     * Requirements: 9.4
     * @returns {number} Shake amount (0-10)
     */
    getShakeAmount() {
        const bassIntensity = this.getBassIntensity();
        
        // Only shake if bass exceeds threshold
        if (bassIntensity < this.bassThreshold) {
            this.shakeAmount = 0;
            return 0;
        }
        
        // Calculate proportional shake (0-10 range)
        // Map bass intensity above threshold to shake amount
        const excessBass = bassIntensity - this.bassThreshold;
        const maxExcess = 255 - this.bassThreshold;
        const normalizedShake = excessBass / maxExcess;
        
        // Scale to 0-10 range with some smoothing
        this.shakeAmount = normalizedShake * 10;
        
        return this.shakeAmount;
    }

    /**
     * Updates the music controller (call each frame).
     * Applies bass-driven screen shake to the game camera.
     * Requirements: 9.4
     */
    update() {
        if (!this.isPlaying) return;
        
        // Get shake amount from bass analysis
        const shake = this.getShakeAmount();
        
        // Apply shake to game camera if significant
        if (shake > 0.5 && this.game) {
            // Use game's shake method if available
            if (this.game.shake) {
                this.game.shake(shake * 0.3); // Scale down for subtlety
            } else if (this.game.camera) {
                // Direct camera shake
                this.game.camera.shake = shake * 0.3;
            }
        }
    }

    /**
     * Sets the bass detection threshold.
     * @param {number} threshold - New threshold value (0-255)
     */
    setBassThreshold(threshold) {
        this.bassThreshold = Math.max(0, Math.min(255, threshold));
    }

    /**
     * Gets the current phase number.
     * @returns {number} Current phase (0, 1, or 2)
     */
    getCurrentPhase() {
        return this.currentPhase;
    }

    /**
     * Checks if music is currently playing.
     * @returns {boolean} True if playing
     */
    getIsPlaying() {
        return this.isPlaying;
    }

    /**
     * Cleans up resources.
     */
    cleanup() {
        this.stop();
        
        if (this.source) {
            try {
                this.source.disconnect();
            } catch (e) {
                // Ignore
            }
            this.source = null;
        }
        
        if (this.audioContext) {
            this.audioContext.close().catch(() => {});
            this.audioContext = null;
        }
        
        this.analyser = null;
        this.dataArray = null;
    }
}

// ==================== DEFEAT SEQUENCE CONTROLLER CLASS ====================

/**
 * DefeatSequenceController class - Manages the boss defeat animation sequence.
 * Implements screen shake, flashbang, floor collapse, and boss falling animation.
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 10.2, 10.3
 */
class DefeatSequenceController {
    /**
     * Creates a new DefeatSequenceController instance.
     * @param {Arena3DManager} arena - Reference to the 3D arena manager
     * @param {Function} onComplete - Callback when defeat sequence completes
     */
    constructor(arena, onComplete = null) {
        this.arena = arena;
        this.onComplete = onComplete;
        
        // State machine: IDLE, SHAKING, FLASHBANG, FLOOR_COLLAPSE, FALLING, COMPLETE
        this.state = 'IDLE';
        this.stateTimer = 0;
        
        // Timing constants (Requirements: 8.2, 8.4)
        this.shakeDuration = 1.0; // 1 second intense shake
        this.flashbangDuration = 0.3; // 0.3 seconds white flash
        this.floorCollapseDuration = 1.0; // 1 second floor collapse
        this.fallingDuration = 2.0; // 2 seconds boss falling
        
        // Visual elements
        this.flashOverlay = null;
        this.floorMesh = null;
        this.bossMesh = null;
        this.bossStartY = 0;
        this.bossTargetY = -50; // Fall below view
        
        // Shake parameters
        this.shakeIntensity = 0.25;
        this.originalCameraPosition = null;
        
        // Dialogue bubble for falling boss
        this.dialogueBubble = null;
        this.dialogueShown = false;
        
        this.active = false;
    }

    /**
     * Starts the defeat sequence.
     * Requirements: 8.1
     */
    start() {
        if (this.active) return;
        
        this.active = true;
        this.state = 'SHAKING';
        this.stateTimer = 0;
        
        // Store original camera position for shake
        if (this.arena && this.arena.camera) {
            this.originalCameraPosition = this.arena.camera.position.clone();
        }
        
        // Get references to boss and floor
        if (this.arena) {
            this.bossMesh = this.arena.centerModel || this.arena.pulsingSphere;
            if (this.bossMesh) {
                this.bossStartY = this.bossMesh.position.y;
            }
            
            // Find floor mesh in scene
            if (this.arena.scene) {
                this.arena.scene.traverse((child) => {
                    if (child.name === 'floor' || (child.geometry && child.geometry.type === 'PlaneGeometry')) {
                        this.floorMesh = child;
                    }
                });
            }
        }
        
        // Create flash overlay
        this.createFlashOverlay();
        
        console.log('Defeat sequence started');
    }

    /**
     * Creates the white flashbang overlay element.
     */
    createFlashOverlay() {
        // Remove existing overlay if any
        if (this.flashOverlay && this.flashOverlay.parentNode) {
            this.flashOverlay.parentNode.removeChild(this.flashOverlay);
        }
        
        this.flashOverlay = document.createElement('div');
        this.flashOverlay.id = 'defeat-flash-overlay';
        this.flashOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: white;
            opacity: 0;
            pointer-events: none;
            z-index: 3000;
            transition: opacity 0.1s ease-out;
        `;
        document.body.appendChild(this.flashOverlay);
    }

    /**
     * Updates the defeat sequence state machine.
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        if (!this.active) return;
        
        this.stateTimer += dt;
        
        switch (this.state) {
            case 'SHAKING':
                this.updateShaking(dt);
                break;
            case 'FLASHBANG':
                this.updateFlashbang(dt);
                break;
            case 'FLOOR_COLLAPSE':
                this.updateFloorCollapse(dt);
                break;
            case 'FALLING':
                this.updateFalling(dt);
                break;
            case 'COMPLETE':
                this.complete();
                break;
        }
    }

    /**
     * Updates the screen shake phase.
     * Requirements: 8.1
     * @param {number} dt - Delta time in seconds
     */
    updateShaking(dt) {
        // Apply intense screen shake
        if (this.arena && this.arena.camera && this.originalCameraPosition) {
            const intensity = this.shakeIntensity * (1 - this.stateTimer / this.shakeDuration);
            const shakeX = (Math.random() - 0.5) * intensity * 2;
            const shakeY = (Math.random() - 0.5) * intensity * 2;
            const shakeZ = (Math.random() - 0.5) * intensity * 0.5;
            
            this.arena.camera.position.x = this.originalCameraPosition.x + shakeX;
            this.arena.camera.position.y = this.originalCameraPosition.y + shakeY;
            this.arena.camera.position.z = this.originalCameraPosition.z + shakeZ;
        }
        
        // Transition to flashbang after shake duration
        if (this.stateTimer >= this.shakeDuration) {
            // Reset camera position
            if (this.arena && this.arena.camera && this.originalCameraPosition) {
                this.arena.camera.position.copy(this.originalCameraPosition);
            }
            
            this.state = 'FLASHBANG';
            this.stateTimer = 0;
            
            // Show flash
            if (this.flashOverlay) {
                this.flashOverlay.style.opacity = '1';
            }
        }
    }

    /**
     * Updates the flashbang phase.
     * Requirements: 8.2
     * @param {number} dt - Delta time in seconds
     */
    updateFlashbang(dt) {
        // Fade out flash
        const progress = this.stateTimer / this.flashbangDuration;
        if (this.flashOverlay) {
            this.flashOverlay.style.opacity = String(1 - progress);
        }
        
        // Transition to floor collapse
        if (this.stateTimer >= this.flashbangDuration) {
            if (this.flashOverlay) {
                this.flashOverlay.style.opacity = '0';
            }
            
            this.state = 'FLOOR_COLLAPSE';
            this.stateTimer = 0;
        }
    }

    /**
     * Updates the floor collapse phase.
     * Requirements: 8.3
     * @param {number} dt - Delta time in seconds
     */
    updateFloorCollapse(dt) {
        const progress = this.stateTimer / this.floorCollapseDuration;
        
        // Animate floor disappearing/crumbling
        if (this.floorMesh) {
            // Scale down and fade out the floor
            const scale = 1 - progress;
            this.floorMesh.scale.set(scale, scale, scale);
            
            if (this.floorMesh.material) {
                this.floorMesh.material.opacity = 1 - progress;
                this.floorMesh.material.transparent = true;
            }
        }
        
        // Transition to falling
        if (this.stateTimer >= this.floorCollapseDuration) {
            // Hide floor completely
            if (this.floorMesh) {
                this.floorMesh.visible = false;
            }
            
            this.state = 'FALLING';
            this.stateTimer = 0;
            
            // Show dialogue bubble - Requirements: 8.5
            this.showFallingDialogue();
        }
    }

    /**
     * Updates the boss falling phase.
     * Requirements: 8.4
     * @param {number} dt - Delta time in seconds
     */
    updateFalling(dt) {
        const progress = this.stateTimer / this.fallingDuration;
        
        // Animate boss falling with panicked motion
        if (this.bossMesh) {
            // Ease-in falling (accelerating)
            const easedProgress = progress * progress;
            const newY = this.bossStartY + (this.bossTargetY - this.bossStartY) * easedProgress;
            this.bossMesh.position.y = newY;
            
            // Add panicked rotation
            this.bossMesh.rotation.x += dt * 3;
            this.bossMesh.rotation.z += dt * 2;
        }
        
        // Update dialogue bubble
        if (this.dialogueBubble) {
            this.dialogueBubble.update(dt);
        }
        
        // Transition to complete when boss exits view
        if (this.stateTimer >= this.fallingDuration) {
            this.state = 'COMPLETE';
            this.stateTimer = 0;
        }
    }

    /**
     * Shows the falling dialogue bubble.
     * Requirements: 8.5
     */
    showFallingDialogue() {
        if (this.dialogueShown) return;
        this.dialogueShown = true;
        
        // Create dialogue bubble
        this.dialogueBubble = new DialogueBubble();
        this.dialogueBubble.show("I WILL COME BACK!!!");
    }

    /**
     * Completes the defeat sequence.
     * Requirements: 8.6, 10.4
     */
    complete() {
        this.active = false;
        
        // Clean up dialogue bubble
        if (this.dialogueBubble) {
            this.dialogueBubble.hide();
            this.dialogueBubble = null;
        }
        
        // Clean up flash overlay
        if (this.flashOverlay && this.flashOverlay.parentNode) {
            this.flashOverlay.parentNode.removeChild(this.flashOverlay);
            this.flashOverlay = null;
        }
        
        // Call completion callback
        if (this.onComplete) {
            this.onComplete();
        } else {
            // Default behavior: show victory screen
            this.showVictoryScreen();
        }
        
        console.log('Defeat sequence complete');
    }

    /**
     * Shows the victory screen.
     * Requirements: 8.6
     */
    showVictoryScreen() {
        // Hide HUD
        document.getElementById('hud').classList.add('hidden');
        
        // Show boss victory screen
        const victoryScreen = document.getElementById('boss-victory-screen');
        if (victoryScreen) {
            victoryScreen.classList.remove('hidden');
            victoryScreen.classList.add('active');
        }
    }

    /**
     * Checks if the defeat sequence is complete.
     * @returns {boolean} True if sequence is complete
     */
    isComplete() {
        return this.state === 'COMPLETE' || !this.active;
    }

    /**
     * Resets the defeat sequence controller.
     */
    reset() {
        this.state = 'IDLE';
        this.stateTimer = 0;
        this.active = false;
        this.dialogueShown = false;
        
        // Clean up
        if (this.flashOverlay && this.flashOverlay.parentNode) {
            this.flashOverlay.parentNode.removeChild(this.flashOverlay);
            this.flashOverlay = null;
        }
        
        if (this.dialogueBubble) {
            this.dialogueBubble.hide();
            this.dialogueBubble = null;
        }
    }
}

// ==================== DIALOGUE BUBBLE CLASS ====================

/**
 * DialogueBubble class - UI component for boss dialogue with typewriter effect.
 * Creates an HTML overlay positioned relative to the boss in 3D space.
 * Requirements: 6.2, 6.3, 6.4
 */
class DialogueBubble {
    /**
     * Creates a new DialogueBubble instance.
     */
    constructor() {
        this.active = false;
        this.text = '';
        this.displayedChars = 0;
        this.charDelay = 40; // ms per character (Requirements: 6.4)
        this.lastCharTime = 0;
        this.element = null;
        this.textElement = null;
        this.complete = false;
        this.onComplete = null;
    }

    /**
     * Creates the HTML overlay element for the dialogue bubble.
     * Requirements: 6.2
     */
    createOverlay() {
        // Remove existing element if any
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }

        // Create dialogue bubble container
        this.element = document.createElement('div');
        this.element.id = 'dialogue-bubble';
        this.element.className = 'dialogue-bubble';
        this.element.style.cssText = `
            position: fixed;
            top: 30%;
            left: 50%;
            transform: translateX(-50%);
            max-width: 600px;
            padding: 20px 30px;
            background: rgba(0, 0, 0, 0.85);
            border: 2px solid #ff4444;
            border-radius: 15px;
            font-family: 'Orbitron', sans-serif;
            font-size: 18px;
            color: #ffffff;
            text-align: center;
            z-index: 2000;
            box-shadow: 0 0 30px rgba(255, 68, 68, 0.5), inset 0 0 20px rgba(255, 68, 68, 0.1);
            opacity: 0;
            transition: opacity 0.3s ease-in-out;
        `;

        // Create text element
        this.textElement = document.createElement('span');
        this.textElement.className = 'dialogue-text';
        this.textElement.style.cssText = `
            text-shadow: 0 0 10px rgba(255, 68, 68, 0.8);
            line-height: 1.5;
        `;
        this.element.appendChild(this.textElement);

        document.body.appendChild(this.element);
    }

    /**
     * Shows the dialogue bubble with the specified text.
     * Requirements: 6.2, 6.3
     * @param {string} text - The dialogue text to display
     * @param {Function} onComplete - Callback when typewriter effect completes
     */
    show(text, onComplete = null) {
        this.text = text;
        this.displayedChars = 0;
        this.complete = false;
        this.active = true;
        this.lastCharTime = Date.now();
        this.onComplete = onComplete;

        this.createOverlay();

        // Fade in
        requestAnimationFrame(() => {
            if (this.element) {
                this.element.style.opacity = '1';
            }
        });
    }

    /**
     * Updates the typewriter effect.
     * Requirements: 6.4
     * @param {number} dt - Delta time in seconds (unused, uses real time)
     */
    update(dt) {
        if (!this.active || this.complete || !this.textElement) return;

        const now = Date.now();
        
        // Check if it's time to show the next character
        if (now - this.lastCharTime >= this.charDelay) {
            this.displayedChars++;
            this.lastCharTime = now;

            // Update displayed text
            this.textElement.textContent = this.text.substring(0, this.displayedChars);

            // Check if complete
            if (this.displayedChars >= this.text.length) {
                this.complete = true;
                if (this.onComplete) {
                    this.onComplete();
                }
            }
        }
    }

    /**
     * Checks if the typewriter effect is complete.
     * @returns {boolean} True if all text has been displayed
     */
    isComplete() {
        return this.complete;
    }

    /**
     * Checks if the dialogue bubble is currently active.
     * @returns {boolean} True if active
     */
    isActive() {
        return this.active;
    }

    /**
     * Hides and removes the dialogue bubble.
     */
    hide() {
        this.active = false;
        
        if (this.element) {
            this.element.style.opacity = '0';
            
            // Remove after fade out
            setTimeout(() => {
                if (this.element && this.element.parentNode) {
                    this.element.parentNode.removeChild(this.element);
                }
                this.element = null;
                this.textElement = null;
            }, 300);
        }
    }

    /**
     * Cleans up resources.
     */
    cleanup() {
        this.active = false;
        this.complete = false;
        
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        this.element = null;
        this.textElement = null;
    }
}

// ==================== 3D ARENA MANAGER CLASS ====================

/**
 * Arena3DManager class - Manages the 3D dome arena using Three.js.
 * Creates a circular dome room with starry ceiling, red-tinted floor,
 * pulsing center sphere, and handles 3D player controls and hazards.
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
 */
class Arena3DManager {
    /**
     * Creates a new Arena3DManager instance.
     * @param {Game} game - Reference to the main game instance
     */
    constructor(game) {
        this.game = game;
        
        // Three.js core components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        
        // 3D player
        this.player = null;
        this.playerModel = null; // GLTF player model
        this.playerMixer = null; // Player animation mixer
        this.playerVelocity = { x: 0, y: 0, z: 0 };
        this.playerOnGround = true;
        
        // Hazards
        this.hazards = [];
        this.lastHazardSpawnTime = 0;
        this.hazardSpawnInterval = 800; // ms between hazard spawns
        
        // Timer
        this.timer = 0;
        this.survivalTime = 30; // 30 seconds to win
        this.active = false;
        
        // Arena properties
        this.domeRadius = 50;
        this.floorY = 0;
        
        // Visual elements
        this.pulsingSphere = null;
        this.centerModel = null; // GLTF model
        this.domeModel = null; // Sci-fi dome model
        this.mixer = null; // Animation mixer for GLTF
        this.stars = [];
        this.particles = []; // Particle systems
        
        // Input state for 3D controls
        this.keys3D = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            jump: false,
            rotateLeft: false,
            rotateRight: false
        };
        
        // Player movement config
        this.playerSpeed = 15;
        this.jumpForce = 20;
        this.gravity = 40;
        
        // Camera rotation
        this.cameraAngle = 0; // Horizontal rotation angle
        this.cameraRotationSpeed = 2.5; // Radians per second
        
        // Shard system - Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
        this.shards = [];
        this.shardCount = 0;
        this.maxShards = 15;
        this.lastShardSpawnTime = 0;
        this.shardSpawnInterval = 2000; // 2 seconds between spawns
        this.shardUIElement = null;
        
        // Phase 2 Trigger System - Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
        this.phase2State = 'COLLECTING'; // COLLECTING, CAMERA_PAN, DIALOGUE, BOSS_GROWING, PILLARS_EMERGING, PHASE2_ACTIVE
        this.phase2Triggered = false;
        this.phase2TriggerShardCount = 10;
        this.dialogueBubble = null;
        this.cameraPanProgress = 0;
        this.cameraPanDuration = 1.5; // seconds for camera pan
        this.savedCameraState = null;
        this.bossGrowthProgress = 0;
        this.bossGrowthDuration = 1; // 1 second for boss growth (Requirements: 6.5)
        this.bossOriginalScale = 0.015; // Original scale from loadCenterModel
        this.bossTargetScale = 0.015 * 1.5; // 1.5x size (Requirements: 6.5)
        this.playerControlsPaused = false;
        
        // Pillar and NukeBall System - Requirements: 6.6, 7.1, 7.2, 7.3, 7.4, 7.5
        this.pillars = [];
        this.nukeBalls = [];
        this.pillarCount = 3; // 3 pillars around boss (Requirements: 6.6)
        this.pillarDistance = 8; // Distance from boss center
        
        // Loading state
        this.isLoading = false;
        this.loadingProgress = 0;
        this.assetsToLoad = 3; // dome, center model, player model
        this.assetsLoaded = 0;
    }

    /**
     * Shows the loading screen.
     */
    showLoadingScreen() {
        const loadingScreen = document.getElementById('arena-loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.remove('hidden');
            loadingScreen.classList.add('active');
        }
        this.updateLoadingProgress(0, 'Initializing...');
    }

    /**
     * Hides the loading screen.
     */
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('arena-loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
            loadingScreen.classList.remove('active');
        }
    }

    /**
     * Updates the loading progress bar and status.
     * @param {number} progress - Progress percentage (0-100)
     * @param {string} status - Status message to display
     */
    updateLoadingProgress(progress, status) {
        const loadingBar = document.getElementById('loading-bar');
        const loadingStatus = document.getElementById('loading-status');
        const loadingTip = document.getElementById('loading-tip');
        
        if (loadingBar) {
            loadingBar.style.width = `${progress}%`;
        }
        if (loadingStatus) {
            loadingStatus.textContent = status;
        }
        
        // Random tips
        const tips = [
            'Prepare for the final confrontation',
            'Collect shards to weaken the void',
            'Dodge the hazards to survive',
            'The void awaits your challenge',
            'Stay focused, stay alive'
        ];
        if (loadingTip && progress === 0) {
            loadingTip.textContent = tips[Math.floor(Math.random() * tips.length)];
        }
    }

    /**
     * Called when an asset finishes loading.
     * @param {string} assetName - Name of the loaded asset
     */
    onAssetLoaded(assetName) {
        this.assetsLoaded++;
        const progress = Math.round((this.assetsLoaded / this.assetsToLoad) * 100);
        this.updateLoadingProgress(progress, `Loading ${assetName}...`);
        
        // Check if all assets are loaded
        if (this.assetsLoaded >= this.assetsToLoad) {
            this.updateLoadingProgress(100, 'Ready!');
            setTimeout(() => {
                this.hideLoadingScreen();
                this.onAllAssetsLoaded();
            }, 500);
        }
    }

    /**
     * Called when all assets are loaded.
     */
    onAllAssetsLoaded() {
        console.log('Arena3D: All assets loaded');
        this.isLoading = false;
        
        // Clear the loading timeout
        if (this.loadingTimeout) {
            clearTimeout(this.loadingTimeout);
            this.loadingTimeout = null;
        }
    }

    /**
     * Initializes the Three.js scene, camera, and renderer.
     * Requirements: 4.1
     */
    init() {
        // Check if Three.js is available
        if (typeof THREE === 'undefined') {
            console.error('Three.js not loaded');
            return false;
        }

        // Create scene with dark space background
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000008); // Very dark blue-black
        
        // Add subtle fog for depth
        this.scene.fog = new THREE.FogExp2(0x000022, 0.008);

        // Create camera (third-person perspective)
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 2, 20);
        this.camera.lookAt(0, 2, 0);

        // Create renderer with optimized settings for performance
        this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Cap at 1.5 for performance
        this.renderer.shadowMap.enabled = false; // Disable shadows for performance
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        
        // Add renderer to DOM
        const container = document.getElementById('three-container');
        if (container) {
            container.innerHTML = '';
            container.appendChild(this.renderer.domElement);
        }

        // Add soft ambient light (moonlight feel)
        const ambientLight = new THREE.AmbientLight(0x334466, 0.4);
        this.scene.add(ambientLight);

        // Add directional light (moonlight)
        const moonLight = new THREE.DirectionalLight(0x8899bb, 0.6);
        moonLight.position.set(10, 30, 10);
        moonLight.castShadow = true;
        this.scene.add(moonLight);

        // Add soft cyan point light at center
        const centerLight = new THREE.PointLight(0x44aaff, 1.5, 80);
        centerLight.position.set(0, 10, 0);
        this.scene.add(centerLight);
        
        // Add subtle colored accent lights
        const blueLight = new THREE.PointLight(0x2266ff, 0.6, 50);
        blueLight.position.set(-25, 8, -25);
        this.scene.add(blueLight);
        
        const purpleLight = new THREE.PointLight(0x6644aa, 0.6, 50);
        purpleLight.position.set(25, 8, 25);
        this.scene.add(purpleLight);

        // Create arena elements
        this.createStarryNightSky();
        this.loadSciFiDome(); // Load sci-fi dome model
        this.createFloor();
        this.loadCenterModel(); // Load center sphere model (smaller)
        this.loadPlayerModel(); // Load energy sphere player model
        this.createParticleEffects(); // Add particle effects

        // Bind 3D input events
        this.bind3DEvents();

        return true;
    }

    /**
     * Creates a beautiful starry night sky.
     * Requirements: 4.2
     */
    createStarryNightSky() {
        // Create large sky sphere with reduced geometry for performance
        const skyGeometry = new THREE.SphereGeometry(200, 32, 16); // Reduced from 64, 32
        
        // Create gradient sky texture
        const skyCanvas = document.createElement('canvas');
        skyCanvas.width = 256; // Reduced from 512 for performance
        skyCanvas.height = 256;
        const skyCtx = skyCanvas.getContext('2d');
        
        // Night sky gradient (dark blue to black)
        const gradient = skyCtx.createLinearGradient(0, 0, 0, 512);
        gradient.addColorStop(0, '#000011');
        gradient.addColorStop(0.3, '#000022');
        gradient.addColorStop(0.6, '#001133');
        gradient.addColorStop(1, '#002244');
        skyCtx.fillStyle = gradient;
        skyCtx.fillRect(0, 0, 512, 512);
        
        const skyTexture = new THREE.CanvasTexture(skyCanvas);
        
        const skyMaterial = new THREE.MeshBasicMaterial({
            map: skyTexture,
            side: THREE.BackSide
        });
        
        const sky = new THREE.Mesh(skyGeometry, skyMaterial);
        this.scene.add(sky);

        // Create many stars with different sizes and colors (reduced for performance)
        this.createStarField(150, 0.3, 0.9); // Small bright stars (was 500)
        this.createStarField(60, 0.5, 0.7); // Medium stars (was 200)
        this.createStarField(20, 0.8, 1.0); // Large bright stars (was 50)
        
        // Add some twinkling star clusters (reduced)
        this.createStarCluster(new THREE.Vector3(50, 80, -50), 15);
        this.createStarCluster(new THREE.Vector3(-60, 70, 40), 12);
    }

    /**
     * Creates a field of stars.
     */
    createStarField(count, size, brightness) {
        const starGeometry = new THREE.BufferGeometry();
        const starPositions = [];
        const starColors = [];

        for (let i = 0; i < count; i++) {
            // Random position on sky sphere
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI * 0.6; // Upper hemisphere mostly
            const r = 150 + Math.random() * 40;

            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = r * Math.cos(phi) + 20;
            const z = r * Math.sin(phi) * Math.sin(theta);

            starPositions.push(x, y, z);

            // Star colors (white, light blue, light yellow)
            const colorChoice = Math.random();
            if (colorChoice < 0.6) {
                // White stars
                starColors.push(brightness, brightness, brightness);
            } else if (colorChoice < 0.8) {
                // Light blue stars
                starColors.push(brightness * 0.8, brightness * 0.9, brightness);
            } else {
                // Light yellow stars
                starColors.push(brightness, brightness * 0.95, brightness * 0.8);
            }
        }

        starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
        starGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));

        const starMaterial = new THREE.PointsMaterial({
            size: size,
            vertexColors: true,
            transparent: true,
            opacity: 0.9,
            sizeAttenuation: true
        });

        const starField = new THREE.Points(starGeometry, starMaterial);
        this.scene.add(starField);
        this.stars.push(starField);
    }

    /**
     * Creates a cluster of stars at a position.
     */
    createStarCluster(center, count) {
        const clusterGeometry = new THREE.BufferGeometry();
        const positions = [];
        const colors = [];

        for (let i = 0; i < count; i++) {
            const offset = new THREE.Vector3(
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 20
            );
            
            positions.push(
                center.x + offset.x,
                center.y + offset.y,
                center.z + offset.z
            );
            
            const b = 0.7 + Math.random() * 0.3;
            colors.push(b, b, b + 0.1);
        }

        clusterGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        clusterGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        const clusterMaterial = new THREE.PointsMaterial({
            size: 0.4,
            vertexColors: true,
            transparent: true,
            opacity: 0.8
        });

        const cluster = new THREE.Points(clusterGeometry, clusterMaterial);
        this.scene.add(cluster);
        this.stars.push(cluster);
    }

    /**
     * Loads the sci-fi dome model.
     */
    loadSciFiDome() {
        if (typeof THREE.GLTFLoader === 'undefined') {
            console.warn('GLTFLoader not available for dome');
            this.onAssetLoaded('Dome (fallback)');
            return;
        }

        this.updateLoadingProgress(10, 'Loading arena dome...');
        const loader = new THREE.GLTFLoader();
        
        loader.load(
            'sci-_fi__future_building_2_simple_dome/scene.gltf',
            (gltf) => {
                this.domeModel = gltf.scene;
                
                // Scale and position the dome
                this.domeModel.scale.set(0.15, 0.15, 0.15);
                this.domeModel.position.set(0, -5, 0);
                
                // Make materials slightly transparent/glowing
                this.domeModel.traverse((child) => {
                    if (child.isMesh && child.material) {
                        child.material.transparent = true;
                        child.material.opacity = 0.7;
                        child.material.emissive = new THREE.Color(0x112233);
                        child.material.emissiveIntensity = 0.3;
                    }
                });
                
                this.scene.add(this.domeModel);
                console.log('Sci-fi dome loaded');
                this.onAssetLoaded('Arena Dome');
            },
            (progress) => {
                if (progress.total > 0) {
                    const percent = Math.round((progress.loaded / progress.total) * 30);
                    this.updateLoadingProgress(10 + percent, 'Loading arena dome...');
                }
            },
            (error) => {
                console.error('Error loading dome model:', error);
                this.onAssetLoaded('Dome (error)');
            }
        );
    }

    /**
     * Creates the dome geometry with starry ceiling.
     * Requirements: 4.2
     */
    createDome() {
        // Create dome (half sphere)
        const domeGeometry = new THREE.SphereGeometry(
            this.domeRadius,
            32,
            16,
            0,
            Math.PI * 2,
            0,
            Math.PI / 2
        );
        
        // Invert the dome so we see it from inside
        domeGeometry.scale(-1, 1, -1);
        
        const domeMaterial = new THREE.MeshBasicMaterial({
            color: 0x000011,
            side: THREE.BackSide
        });
        
        const dome = new THREE.Mesh(domeGeometry, domeMaterial);
        dome.position.y = 0;
        this.scene.add(dome);

        // Create stars on the ceiling
        this.createStars();
    }

    /**
     * Creates star particles on the dome ceiling.
     * Requirements: 4.2
     */
    createStars() {
        const starCount = 200;
        const starGeometry = new THREE.BufferGeometry();
        const starPositions = [];
        const starColors = [];

        for (let i = 0; i < starCount; i++) {
            // Random position on dome surface
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI / 2;
            const r = this.domeRadius * 0.95;

            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = r * Math.cos(phi);
            const z = r * Math.sin(phi) * Math.sin(theta);

            starPositions.push(x, y, z);

            // Random star color (white to light blue)
            const brightness = 0.7 + Math.random() * 0.3;
            starColors.push(brightness, brightness, brightness + Math.random() * 0.2);
        }

        starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
        starGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));

        const starMaterial = new THREE.PointsMaterial({
            size: 0.5,
            vertexColors: true,
            transparent: true,
            opacity: 0.8
        });

        const starField = new THREE.Points(starGeometry, starMaterial);
        this.scene.add(starField);
        this.stars.push(starField);
    }

    /**
     * Creates a sci-fi steel floor with glowing circles pattern.
     * Requirements: 4.3
     */
    createFloor() {
        // Create circular floor
        const floorGeometry = new THREE.CircleGeometry(this.domeRadius, 64);
        
        // Create steel texture with circles programmatically
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');
        
        // Steel base with metallic gradient
        const steelGradient = ctx.createRadialGradient(512, 512, 0, 512, 512, 600);
        steelGradient.addColorStop(0, '#4a4a5a');
        steelGradient.addColorStop(0.3, '#3a3a48');
        steelGradient.addColorStop(0.6, '#2a2a38');
        steelGradient.addColorStop(1, '#1a1a28');
        ctx.fillStyle = steelGradient;
        ctx.fillRect(0, 0, 1024, 1024);
        
        // Add brushed steel texture effect
        ctx.globalAlpha = 0.15;
        for (let i = 0; i < 400; i++) {
            const x = Math.random() * 1024;
            const y = Math.random() * 1024;
            const length = 30 + Math.random() * 80;
            const angle = Math.random() * Math.PI * 2;
            ctx.strokeStyle = Math.random() > 0.5 ? '#6a6a7a' : '#2a2a3a';
            ctx.lineWidth = 0.5 + Math.random() * 1;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
        
        // Draw steel plate panels (large squares)
        ctx.strokeStyle = '#222230';
        ctx.lineWidth = 3;
        const panelSize = 128;
        for (let px = 0; px < 1024; px += panelSize) {
            for (let py = 0; py < 1024; py += panelSize) {
                ctx.strokeRect(px + 2, py + 2, panelSize - 4, panelSize - 4);
                
                // Add corner rivets
                ctx.fillStyle = '#555565';
                const rivetSize = 4;
                ctx.beginPath();
                ctx.arc(px + 12, py + 12, rivetSize, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(px + panelSize - 12, py + 12, rivetSize, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(px + 12, py + panelSize - 12, rivetSize, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(px + panelSize - 12, py + panelSize - 12, rivetSize, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Draw glowing concentric circles (cyan/blue)
        const circleColors = [
            { radius: 60, color: '#00ffff', width: 5, glow: 20 },
            { radius: 130, color: '#00ddff', width: 4, glow: 15 },
            { radius: 200, color: '#00bbff', width: 3, glow: 12 },
            { radius: 280, color: '#0099dd', width: 3, glow: 10 },
            { radius: 360, color: '#0077bb', width: 2, glow: 8 },
            { radius: 450, color: '#005599', width: 2, glow: 6 },
        ];
        
        circleColors.forEach(circle => {
            // Glow effect
            ctx.shadowBlur = circle.glow;
            ctx.shadowColor = circle.color;
            ctx.strokeStyle = circle.color;
            ctx.lineWidth = circle.width;
            ctx.beginPath();
            ctx.arc(512, 512, circle.radius, 0, Math.PI * 2);
            ctx.stroke();
        });
        
        // Add bright center glow
        ctx.shadowBlur = 40;
        ctx.shadowColor = '#00ffff';
        const centerGlow = ctx.createRadialGradient(512, 512, 0, 512, 512, 100);
        centerGlow.addColorStop(0, 'rgba(0, 255, 255, 0.5)');
        centerGlow.addColorStop(0.4, 'rgba(0, 200, 255, 0.3)');
        centerGlow.addColorStop(0.7, 'rgba(0, 150, 255, 0.1)');
        centerGlow.addColorStop(1, 'rgba(0, 100, 200, 0)');
        ctx.fillStyle = centerGlow;
        ctx.beginPath();
        ctx.arc(512, 512, 100, 0, Math.PI * 2);
        ctx.fill();
        
        // Add radial lines from center
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#0088aa';
        ctx.strokeStyle = '#0066aa';
        ctx.lineWidth = 1;
        for (let i = 0; i < 16; i++) {
            const angle = (i / 16) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(512 + Math.cos(angle) * 70, 512 + Math.sin(angle) * 70);
            ctx.lineTo(512 + Math.cos(angle) * 480, 512 + Math.sin(angle) * 480);
            ctx.stroke();
        }
        
        ctx.shadowBlur = 0;

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;

        const floorMaterial = new THREE.MeshStandardMaterial({
            map: texture,
            side: THREE.DoubleSide,
            metalness: 0.7,
            roughness: 0.4,
            emissive: new THREE.Color(0x001122),
            emissiveIntensity: 0.15
        });

        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = this.floorY;
        floor.receiveShadow = true;
        this.scene.add(floor);
    }

    /**
     * Helper function to draw a hexagon.
     */
    drawHexagon(ctx, x, y, size) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3;
            const px = x + size * Math.cos(angle);
            const py = y + size * Math.sin(angle);
            if (i === 0) {
                ctx.moveTo(px, py);
            } else {
                ctx.lineTo(px, py);
            }
        }
        ctx.closePath();
        ctx.stroke();
    }

    /**
     * Loads the GLTF model for the center sphere with rotating rings (smaller).
     * Requirements: 4.4
     */
    loadCenterModel() {
        // Check if GLTFLoader is available
        if (typeof THREE.GLTFLoader === 'undefined') {
            console.warn('GLTFLoader not available, falling back to simple sphere');
            this.createFallbackSphere();
            this.onAssetLoaded('Boss (fallback)');
            return;
        }

        this.updateLoadingProgress(40, 'Loading boss entity...');
        const loader = new THREE.GLTFLoader();
        
        loader.load(
            'sphere_and_rotated_rings/scene.gltf',
            (gltf) => {
                this.centerModel = gltf.scene;
                
                // Scale SMALLER and position the model
                this.centerModel.scale.set(0.015, 0.015, 0.015); // Much smaller
                this.centerModel.position.set(0, 6, 0);
                
                // Create stainless steel texture
                const steelTexture = this.createStainlessSteelTexture();
                
                // Apply stainless steel material to the model
                this.centerModel.traverse((child) => {
                    if (child.isMesh) {
                        // Create stainless steel material
                        child.material = new THREE.MeshStandardMaterial({
                            map: steelTexture,
                            metalness: 0.95,
                            roughness: 0.15,
                            envMapIntensity: 1.0,
                            emissive: new THREE.Color(0x111122),
                            emissiveIntensity: 0.1
                        });
                        child.material.needsUpdate = true;
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                
                this.scene.add(this.centerModel);
                
                // Setup animation mixer if the model has animations
                if (gltf.animations && gltf.animations.length > 0) {
                    this.mixer = new THREE.AnimationMixer(this.centerModel);
                    gltf.animations.forEach((clip) => {
                        const action = this.mixer.clipAction(clip);
                        action.play();
                    });
                }
                
                console.log('Center model loaded with stainless steel texture');
                this.onAssetLoaded('Boss Entity');
            },
            (progress) => {
                if (progress.total > 0) {
                    const percent = Math.round((progress.loaded / progress.total) * 30);
                    this.updateLoadingProgress(40 + percent, 'Loading boss entity...');
                }
            },
            (error) => {
                console.error('Error loading GLTF model:', error);
                this.createFallbackSphere();
                this.onAssetLoaded('Boss (error)');
            }
        );
    }

    /**
     * Creates a stainless steel texture programmatically.
     */
    createStainlessSteelTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Base steel color gradient
        const baseGradient = ctx.createLinearGradient(0, 0, 512, 512);
        baseGradient.addColorStop(0, '#c8c8d0');
        baseGradient.addColorStop(0.25, '#a8a8b8');
        baseGradient.addColorStop(0.5, '#d0d0d8');
        baseGradient.addColorStop(0.75, '#b0b0c0');
        baseGradient.addColorStop(1, '#c0c0c8');
        ctx.fillStyle = baseGradient;
        ctx.fillRect(0, 0, 512, 512);
        
        // Add brushed steel lines (horizontal)
        ctx.globalAlpha = 0.3;
        for (let i = 0; i < 300; i++) {
            const y = Math.random() * 512;
            const length = 50 + Math.random() * 200;
            const x = Math.random() * 512;
            ctx.strokeStyle = Math.random() > 0.5 ? '#e0e0e8' : '#909098';
            ctx.lineWidth = 0.5 + Math.random() * 1;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + length, y + (Math.random() - 0.5) * 2);
            ctx.stroke();
        }
        
        // Add some vertical variation
        ctx.globalAlpha = 0.15;
        for (let i = 0; i < 100; i++) {
            const x = Math.random() * 512;
            const length = 30 + Math.random() * 100;
            const y = Math.random() * 512;
            ctx.strokeStyle = Math.random() > 0.5 ? '#d8d8e0' : '#888890';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + (Math.random() - 0.5) * 3, y + length);
            ctx.stroke();
        }
        
        // Add subtle highlights
        ctx.globalAlpha = 0.2;
        const highlightGradient = ctx.createRadialGradient(200, 150, 0, 200, 150, 300);
        highlightGradient.addColorStop(0, '#ffffff');
        highlightGradient.addColorStop(0.5, 'rgba(255,255,255,0.3)');
        highlightGradient.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = highlightGradient;
        ctx.fillRect(0, 0, 512, 512);
        
        ctx.globalAlpha = 1;
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    }

    /**
     * Loads the energy sphere model for the player.
     */
    loadPlayerModel() {
        // Create player group first
        this.player = new THREE.Group();
        this.player.position.set(0, 1, 15);
        this.scene.add(this.player);
        
        // Add a point light to player
        const playerLight = new THREE.PointLight(0x44aaff, 0.8, 15);
        playerLight.position.set(0, 0, 0);
        this.player.add(playerLight);

        if (typeof THREE.GLTFLoader === 'undefined') {
            console.warn('GLTFLoader not available for player');
            this.createFallbackPlayer();
            this.onAssetLoaded('Player (fallback)');
            return;
        }

        this.updateLoadingProgress(70, 'Loading player model...');
        const loader = new THREE.GLTFLoader();
        
        loader.load(
            'energy_sphere_game_prop/scene.gltf',
            (gltf) => {
                this.playerModel = gltf.scene;
                
                // Scale the player model
                this.playerModel.scale.set(0.8, 0.8, 0.8);
                this.playerModel.position.set(0, 0, 0);
                
                // Make it glow
                this.playerModel.traverse((child) => {
                    if (child.isMesh && child.material) {
                        child.material.emissive = new THREE.Color(0x44aaff);
                        child.material.emissiveIntensity = 0.5;
                    }
                });
                
                this.player.add(this.playerModel);
                
                // Setup animation mixer
                if (gltf.animations && gltf.animations.length > 0) {
                    this.playerMixer = new THREE.AnimationMixer(this.playerModel);
                    gltf.animations.forEach((clip) => {
                        const action = this.playerMixer.clipAction(clip);
                        action.play();
                    });
                }
                
                console.log('Player energy sphere loaded');
                this.onAssetLoaded('Player Model');
            },
            (progress) => {
                if (progress.total > 0) {
                    const percent = Math.round((progress.loaded / progress.total) * 30);
                    this.updateLoadingProgress(70 + percent, 'Loading player model...');
                }
            },
            (error) => {
                console.error('Error loading player model:', error);
                this.createFallbackPlayer();
                this.onAssetLoaded('Player (error)');
            }
        );
        
        // Camera settings
        this.cameraRotation = { x: 0, y: 0 };
        this.cameraDistance = 8;
        this.cameraHeight = 4;
    }

    /**
     * Creates a fallback player if GLTF loading fails.
     */
    createFallbackPlayer() {
        // Main player sphere
        const playerGeometry = new THREE.SphereGeometry(0.6, 32, 32);
        const playerMaterial = new THREE.MeshPhongMaterial({
            color: 0x44aaff,
            emissive: 0x112244,
            shininess: 100,
            transparent: true,
            opacity: 0.9
        });
        const playerMesh = new THREE.Mesh(playerGeometry, playerMaterial);
        this.player.add(playerMesh);

        // Add glow
        const glowGeometry = new THREE.SphereGeometry(0.8, 32, 32);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x44aaff,
            transparent: true,
            opacity: 0.2,
            side: THREE.BackSide
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        this.player.add(glow);

        // Add rings
        this.playerRing = new THREE.Mesh(
            new THREE.TorusGeometry(1.0, 0.06, 8, 32),
            new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.6 })
        );
        this.playerRing.rotation.x = Math.PI / 2;
        this.player.add(this.playerRing);
        
        this.playerRing2 = new THREE.Mesh(
            new THREE.TorusGeometry(0.9, 0.04, 8, 32),
            new THREE.MeshBasicMaterial({ color: 0xaaddff, transparent: true, opacity: 0.4 })
        );
        this.player.add(this.playerRing2);
    }

    /**
     * Creates particle effects around the arena.
     */
    createParticleEffects() {
        // Floating dust particles
        this.createDustParticles();
        
        // Energy particles around center
        this.createEnergyParticles();
        
        // Ambient sparkles
        this.createSparkles();
    }

    /**
     * Creates floating dust particles.
     */
    createDustParticles() {
        const particleCount = 40; // Reduced from 100 for performance
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const colors = [];

        for (let i = 0; i < particleCount; i++) {
            positions.push(
                (Math.random() - 0.5) * 80,
                Math.random() * 30,
                (Math.random() - 0.5) * 80
            );
            
            const c = 0.3 + Math.random() * 0.2;
            colors.push(c, c + 0.1, c + 0.2);
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.15,
            vertexColors: true,
            transparent: true,
            opacity: 0.5
        });

        const dust = new THREE.Points(geometry, material);
        dust.userData.type = 'dust';
        this.scene.add(dust);
        this.particles.push(dust);
    }

    /**
     * Creates energy particles around the center.
     */
    createEnergyParticles() {
        const particleCount = 20; // Reduced from 50 for performance
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const colors = [];

        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 3 + Math.random() * 5;
            const height = 4 + Math.random() * 6;
            
            positions.push(
                Math.cos(angle) * radius,
                height,
                Math.sin(angle) * radius
            );
            
            colors.push(0.2, 0.6 + Math.random() * 0.4, 1.0);
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.25,
            vertexColors: true,
            transparent: true,
            opacity: 0.7
        });

        const energy = new THREE.Points(geometry, material);
        energy.userData.type = 'energy';
        this.scene.add(energy);
        this.particles.push(energy);
    }

    /**
     * Creates ambient sparkle particles.
     */
    createSparkles() {
        const particleCount = 30;
        const geometry = new THREE.BufferGeometry();
        const positions = [];

        for (let i = 0; i < particleCount; i++) {
            positions.push(
                (Math.random() - 0.5) * 60,
                2 + Math.random() * 15,
                (Math.random() - 0.5) * 60
            );
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            size: 0.3,
            color: 0xffffff,
            transparent: true,
            opacity: 0.8
        });

        const sparkles = new THREE.Points(geometry, material);
        sparkles.userData.type = 'sparkles';
        sparkles.userData.baseOpacity = [];
        for (let i = 0; i < particleCount; i++) {
            sparkles.userData.baseOpacity.push(Math.random());
        }
        this.scene.add(sparkles);
        this.particles.push(sparkles);
    }

    /**
     * Creates a fallback pulsing sphere if GLTF loading fails.
     */
    createFallbackSphere() {
        const sphereGeometry = new THREE.SphereGeometry(2, 32, 32); // Smaller
        
        const sphereMaterial = new THREE.MeshBasicMaterial({
            color: 0x44aaff,
            transparent: true,
            opacity: 0.8
        });

        this.pulsingSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        this.pulsingSphere.position.set(0, 6, 0);
        this.scene.add(this.pulsingSphere);

        // Add glow effect (outer sphere)
        const glowGeometry = new THREE.SphereGeometry(2.5, 32, 32);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x44aaff,
            transparent: true,
            opacity: 0.3,
            side: THREE.BackSide
        });
        
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        this.pulsingSphere.add(glow);
        
        // Add rotating rings as fallback
        for (let i = 0; i < 3; i++) {
            const ringGeometry = new THREE.TorusGeometry(3 + i * 1, 0.15, 8, 64);
            const ringMaterial = new THREE.MeshBasicMaterial({
                color: 0x88ccff,
                transparent: true,
                opacity: 0.5
            });
            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            ring.rotation.x = Math.PI / 2 + (i * 0.3);
            ring.rotation.y = i * 0.5;
            this.pulsingSphere.add(ring);
        }
    }

    /**
     * Creates the pulsing sphere in the center.
     * Requirements: 4.4
     */
    createPulsingSphere() {
        const sphereGeometry = new THREE.SphereGeometry(2, 32, 32);
        
        const sphereMaterial = new THREE.MeshBasicMaterial({
            color: 0x44aaff,
            transparent: true,
            opacity: 0.8
        });

        this.pulsingSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        this.pulsingSphere.position.set(0, 5, 0);
        this.scene.add(this.pulsingSphere);

        // Add glow effect (outer sphere)
        const glowGeometry = new THREE.SphereGeometry(2.5, 32, 32);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x44aaff,
            transparent: true,
            opacity: 0.3,
            side: THREE.BackSide
        });
        
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        this.pulsingSphere.add(glow);
    }

    /**
     * Creates the 3D player (legacy - now using loadPlayerModel).
     */
    createPlayer() {
        // This is now handled by loadPlayerModel()
        // Keeping for backwards compatibility
        if (!this.player) {
            this.loadPlayerModel();
        }
    }

    /**
     * Binds keyboard and mouse events for 3D player controls.
     * Requirements: 4.7
     */
    bind3DEvents() {
        this.keydownHandler = (e) => {
            if (!this.active) return;
            
            switch (e.code) {
                case 'KeyW':
                    this.keys3D.forward = true;
                    break;
                case 'KeyS':
                    this.keys3D.backward = true;
                    break;
                case 'KeyA':
                    this.keys3D.left = true;
                    break;
                case 'KeyD':
                    this.keys3D.right = true;
                    break;
                case 'ArrowLeft':
                    this.keys3D.rotateLeft = true;
                    break;
                case 'ArrowRight':
                    this.keys3D.rotateRight = true;
                    break;
                case 'ArrowUp':
                    this.keys3D.forward = true;
                    break;
                case 'ArrowDown':
                    this.keys3D.backward = true;
                    break;
                case 'Space':
                    e.preventDefault();
                    if (this.playerOnGround) {
                        this.keys3D.jump = true;
                        this.playerVelocity.y = this.jumpForce;
                        this.playerOnGround = false;
                    }
                    break;
            }
        };

        this.keyupHandler = (e) => {
            switch (e.code) {
                case 'KeyW':
                    this.keys3D.forward = false;
                    break;
                case 'KeyS':
                    this.keys3D.backward = false;
                    break;
                case 'KeyA':
                    this.keys3D.left = false;
                    break;
                case 'KeyD':
                    this.keys3D.right = false;
                    break;
                case 'ArrowLeft':
                    this.keys3D.rotateLeft = false;
                    break;
                case 'ArrowRight':
                    this.keys3D.rotateRight = false;
                    break;
                case 'ArrowUp':
                    this.keys3D.forward = false;
                    break;
                case 'ArrowDown':
                    this.keys3D.backward = false;
                    break;
                case 'Space':
                    this.keys3D.jump = false;
                    break;
            }
        };

        window.addEventListener('keydown', this.keydownHandler);
        window.addEventListener('keyup', this.keyupHandler);
        
        // Setup mobile/touch controls for 3D arena
        this.setupMobile3DControls();
    }

    /**
     * Sets up mobile touch controls for 3D arena.
     */
    setupMobile3DControls() {
        // Check if touch device
        if (!('ontouchstart' in window) && navigator.maxTouchPoints <= 0) return;
        
        // Show 3D mobile controls
        this.showMobile3DControls();
        
        // Setup jump button
        const jumpBtn = document.getElementById('mobile-jump-btn-3d');
        if (jumpBtn) {
            jumpBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (this.playerOnGround) {
                    this.keys3D.jump = true;
                    this.playerVelocity.y = this.jumpForce;
                    this.playerOnGround = false;
                }
            }, { passive: false });
            
            jumpBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.keys3D.jump = false;
            }, { passive: false });
        }
        
        // Setup joystick for movement
        this.setupJoystick();
        
        // Setup camera rotation via screen swipe
        this.setupCameraSwipe();
    }

    /**
     * Shows mobile controls for 3D arena.
     */
    showMobile3DControls() {
        const mobileControls = document.getElementById('mobile-controls');
        const mobileControls3D = document.getElementById('mobile-controls-3d');
        
        if (mobileControls) {
            mobileControls.classList.add('hidden');
            mobileControls.classList.remove('active');
        }
        if (mobileControls3D) {
            mobileControls3D.classList.remove('hidden');
            mobileControls3D.classList.add('active');
        }
    }

    /**
     * Hides mobile controls for 3D arena.
     */
    hideMobile3DControls() {
        const mobileControls3D = document.getElementById('mobile-controls-3d');
        if (mobileControls3D) {
            mobileControls3D.classList.add('hidden');
            mobileControls3D.classList.remove('active');
        }
    }

    /**
     * Sets up the virtual joystick for movement.
     */
    setupJoystick() {
        const joystickBase = document.getElementById('joystick-base');
        const joystickStick = document.getElementById('joystick-stick');
        
        if (!joystickBase || !joystickStick) return;
        
        let joystickActive = false;
        let joystickCenter = { x: 0, y: 0 };
        const maxDistance = 35;
        
        const handleJoystickStart = (e) => {
            e.preventDefault();
            joystickActive = true;
            const rect = joystickBase.getBoundingClientRect();
            joystickCenter = {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            };
        };
        
        const handleJoystickMove = (e) => {
            if (!joystickActive) return;
            e.preventDefault();
            
            const touch = e.touches[0];
            let dx = touch.clientX - joystickCenter.x;
            let dy = touch.clientY - joystickCenter.y;
            
            // Limit to max distance
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > maxDistance) {
                dx = (dx / distance) * maxDistance;
                dy = (dy / distance) * maxDistance;
            }
            
            // Move stick visually
            joystickStick.style.transform = `translate(${dx}px, ${dy}px)`;
            
            // Convert to movement input (normalized -1 to 1)
            const normalizedX = dx / maxDistance;
            const normalizedY = dy / maxDistance;
            
            // Apply dead zone
            const deadZone = 0.2;
            
            // Forward/backward (Y axis inverted)
            if (normalizedY < -deadZone) {
                this.keys3D.forward = true;
                this.keys3D.backward = false;
            } else if (normalizedY > deadZone) {
                this.keys3D.backward = true;
                this.keys3D.forward = false;
            } else {
                this.keys3D.forward = false;
                this.keys3D.backward = false;
            }
            
            // Left/right strafe
            if (normalizedX < -deadZone) {
                this.keys3D.left = true;
                this.keys3D.right = false;
            } else if (normalizedX > deadZone) {
                this.keys3D.right = true;
                this.keys3D.left = false;
            } else {
                this.keys3D.left = false;
                this.keys3D.right = false;
            }
        };
        
        const handleJoystickEnd = (e) => {
            e.preventDefault();
            joystickActive = false;
            joystickStick.style.transform = 'translate(0, 0)';
            
            // Reset all movement
            this.keys3D.forward = false;
            this.keys3D.backward = false;
            this.keys3D.left = false;
            this.keys3D.right = false;
        };
        
        joystickBase.addEventListener('touchstart', handleJoystickStart, { passive: false });
        joystickBase.addEventListener('touchmove', handleJoystickMove, { passive: false });
        joystickBase.addEventListener('touchend', handleJoystickEnd, { passive: false });
        joystickBase.addEventListener('touchcancel', handleJoystickEnd, { passive: false });
    }

    /**
     * Sets up camera rotation via screen swipe.
     */
    setupCameraSwipe() {
        const container = document.getElementById('three-container');
        if (!container) return;
        
        let lastTouchX = 0;
        let isSwiping = false;
        
        const handleTouchStart = (e) => {
            // Only handle single touch that's not on controls
            if (e.touches.length !== 1) return;
            if (e.target.closest('.mobile-controls-3d')) return;
            
            isSwiping = true;
            lastTouchX = e.touches[0].clientX;
        };
        
        const handleTouchMove = (e) => {
            if (!isSwiping || e.touches.length !== 1) return;
            if (e.target.closest('.mobile-controls-3d')) return;
            
            const touchX = e.touches[0].clientX;
            const deltaX = touchX - lastTouchX;
            
            // Rotate camera based on swipe
            this.cameraAngle -= deltaX * 0.01;
            
            lastTouchX = touchX;
        };
        
        const handleTouchEnd = () => {
            isSwiping = false;
        };
        
        container.addEventListener('touchstart', handleTouchStart, { passive: true });
        container.addEventListener('touchmove', handleTouchMove, { passive: true });
        container.addEventListener('touchend', handleTouchEnd, { passive: true });
        container.addEventListener('touchcancel', handleTouchEnd, { passive: true });
    }

    /**
     * Starts the 3D arena with loading screen.
     */
    start() {
        // Hide any transition screen that might be showing
        const transitionScreen = document.getElementById('transition-screen');
        if (transitionScreen) {
            transitionScreen.classList.add('hidden');
            transitionScreen.classList.remove('active');
            transitionScreen.style.display = 'none';
        }
        
        // Show loading screen first
        this.showLoadingScreen();
        this.isLoading = true;
        this.assetsLoaded = 0;
        
        // Fallback timeout to hide loading screen if assets take too long
        this.loadingTimeout = setTimeout(() => {
            if (this.isLoading) {
                console.warn('Arena3D: Loading timeout, forcing start');
                this.hideLoadingScreen();
                this.isLoading = false;
            }
        }, 15000); // 15 second timeout
        
        // Small delay to ensure loading screen is visible
        setTimeout(() => {
            if (!this.init()) {
                console.error('Failed to initialize 3D arena');
                this.hideLoadingScreen();
                clearTimeout(this.loadingTimeout);
                return;
            }

            this.active = true;
            this.timer = 0;
            this.hazards = [];
            this.lastHazardSpawnTime = Date.now();
            this.cameraAngle = 0; // Reset camera angle
            
            // Initialize shard system - Requirements: 5.1, 5.5
            this.shards = [];
            this.shardCount = 0;
            this.lastShardSpawnTime = Date.now();
            this.shardUIElement = null;
            
            // Reset Phase 2 state - Requirements: 6.1
            this.phase2State = 'COLLECTING';
            this.phase2Triggered = false;
            this.playerControlsPaused = false;
            this.cameraPanProgress = 0;
            this.bossGrowthProgress = 0;
            if (this.dialogueBubble) {
                this.dialogueBubble.cleanup();
                this.dialogueBubble = null;
            }
        
            // Reset Pillar and NukeBall system - Requirements: 6.6, 7.1
            this.cleanupPillarsAndNukeBalls();

            // Hide 2D canvas, show 3D
            const canvas2D = document.getElementById('game-canvas');
            if (canvas2D) canvas2D.style.display = 'none';
            
            // Hide 2D background layer - 3D arena has its own environment
            const backgroundLayer = document.getElementById('background-layer');
            if (backgroundLayer) backgroundLayer.style.display = 'none';

            // Show timer UI
            this.updateTimerDisplay();
        
            // Show shard UI - Requirements: 5.5
            this.updateShardUI();
        }, 100); // Small delay for loading screen to appear
    }

    /**
     * Updates the 3D arena game logic.
     * Requirements: 4.5, 4.6, 4.7, 5.1, 5.3, 6.1, 6.2, 6.3, 6.4, 6.5, 9.3, 9.4
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        if (!this.active) return;

        // Update timer
        this.timer += dt;
        this.updateTimerDisplay();
        
        // Update boss music controller for bass-driven shake - Requirements: 9.3, 9.4
        if (this.game && this.game.bossMusicController) {
            this.game.bossMusicController.update();
        }

        // Check victory condition
        if (this.checkVictory()) {
            this.triggerVictory();
            return;
        }

        // Handle Phase 2 state machine - Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
        this.updatePhase2State(dt);

        // Update player movement (only if controls not paused)
        if (!this.playerControlsPaused) {
            this.updatePlayer(dt);
        }

        // Update pulsing sphere
        this.updatePulsingSphere(dt);

        // Spawn hazards (only in normal states)
        if (this.phase2State === 'COLLECTING' || this.phase2State === 'PHASE2_ACTIVE') {
            this.spawnHazards();
        }

        // Update hazards
        this.updateHazards(dt);
        
        // Spawn and update shards - Requirements: 5.1
        if (this.phase2State === 'COLLECTING' || this.phase2State === 'PHASE2_ACTIVE') {
            this.spawnShards();
        }
        this.updateShards(dt);
        
        // Check shard collection - Requirements: 5.3
        if (!this.playerControlsPaused) {
            this.checkShardCollection();
        }

        // Check collisions (only if controls not paused)
        if (!this.playerControlsPaused) {
            this.checkCollisions();
        }

        // Update camera to follow player (or handle camera pan)
        this.updateCamera();
    }

    /**
     * Updates the player position based on input.
     * Requirements: 4.7
     * @param {number} dt - Delta time in seconds
     */
    updatePlayer(dt) {
        if (!this.player) return;

        // Update camera rotation with arrow keys
        if (this.keys3D.rotateLeft) {
            this.cameraAngle += this.cameraRotationSpeed * dt;
        }
        if (this.keys3D.rotateRight) {
            this.cameraAngle -= this.cameraRotationSpeed * dt;
        }

        // Calculate movement direction based on camera angle
        const forward = {
            x: -Math.sin(this.cameraAngle),
            z: -Math.cos(this.cameraAngle)
        };
        const right = {
            x: Math.cos(this.cameraAngle),
            z: -Math.sin(this.cameraAngle)
        };

        // Horizontal movement relative to camera direction
        let moveX = 0;
        let moveZ = 0;

        if (this.keys3D.forward) {
            moveX += forward.x * this.playerSpeed * dt;
            moveZ += forward.z * this.playerSpeed * dt;
        }
        if (this.keys3D.backward) {
            moveX -= forward.x * this.playerSpeed * dt;
            moveZ -= forward.z * this.playerSpeed * dt;
        }
        if (this.keys3D.left) {
            moveX -= right.x * this.playerSpeed * dt;
            moveZ -= right.z * this.playerSpeed * dt;
        }
        if (this.keys3D.right) {
            moveX += right.x * this.playerSpeed * dt;
            moveZ += right.z * this.playerSpeed * dt;
        }

        // Apply movement
        this.player.position.x += moveX;
        this.player.position.z += moveZ;

        // Rolling animation - rotate based on movement
        if (Math.abs(moveX) > 0.001 || Math.abs(moveZ) > 0.001) {
            // Roll in the direction of movement
            this.player.rotation.z -= moveX * 2;
            this.player.rotation.x += moveZ * 2;
        }

        // Apply gravity
        this.playerVelocity.y -= this.gravity * dt;
        this.player.position.y += this.playerVelocity.y * dt;

        // Ground collision
        if (this.player.position.y <= 1) {
            this.player.position.y = 1;
            this.playerVelocity.y = 0;
            this.playerOnGround = true;
        }

        // Keep player within dome bounds
        const distFromCenter = Math.sqrt(
            this.player.position.x * this.player.position.x +
            this.player.position.z * this.player.position.z
        );

        if (distFromCenter > this.domeRadius - 2) {
            const angle = Math.atan2(this.player.position.z, this.player.position.x);
            this.player.position.x = (this.domeRadius - 2) * Math.cos(angle);
            this.player.position.z = (this.domeRadius - 2) * Math.sin(angle);
        }
        
        // Update player ring rotation for visual effect
        if (this.playerRing) {
            this.playerRing.rotation.z += dt * 2;
        }
        if (this.playerRing2) {
            this.playerRing2.rotation.y += dt * 3;
            this.playerRing2.rotation.x += dt * 1.5;
        }
    }

    /**
     * Updates the pulsing sphere/GLTF model animation.
     * Requirements: 4.4
     * @param {number} dt - Delta time in seconds
     */
    updatePulsingSphere(dt) {
        // Update GLTF animation mixer for center model
        if (this.mixer) {
            this.mixer.update(dt);
        }
        
        // Update player animation mixer
        if (this.playerMixer) {
            this.playerMixer.update(dt);
        }
        
        // Animate the center model (smaller)
        if (this.centerModel) {
            // Gentle floating motion
            const floatOffset = Math.sin(this.timer * 1.5) * 0.3;
            this.centerModel.position.y = 6 + floatOffset;
            
            // Slow rotation
            this.centerModel.rotation.y += dt * 0.3;
            
            // Pulse scale (smaller base)
            const pulse = 1 + Math.sin(this.timer * 2) * 0.05;
            this.centerModel.scale.set(0.015 * pulse, 0.015 * pulse, 0.015 * pulse);
        }
        
        // Animate player model
        if (this.playerModel) {
            this.playerModel.rotation.y += dt * 0.5;
        }
        
        // Fallback sphere animation
        if (this.pulsingSphere) {
            const pulse = 1 + Math.sin(this.timer * 3) * 0.15;
            this.pulsingSphere.scale.set(pulse, pulse, pulse);

            // Rotate slowly
            this.pulsingSphere.rotation.y += dt * 0.5;

            // Color pulsing (cyan)
            const intensity = 0.5 + Math.sin(this.timer * 2) * 0.3;
            this.pulsingSphere.material.color.setRGB(intensity * 0.3, intensity * 0.7, 1);
        }
        
        // Update particles
        this.updateParticles(dt);
    }

    /**
     * Updates particle effects.
     * Optimized to reduce GPU buffer updates.
     */
    updateParticles(dt) {
        if (!this.particles) return;
        
        // Throttle dust particle updates (every 3rd frame)
        this.particleUpdateCounter = (this.particleUpdateCounter || 0) + 1;
        const shouldUpdateDust = this.particleUpdateCounter % 3 === 0;
        
        this.particles.forEach(particle => {
            if (!particle.userData) return;
            
            switch (particle.userData.type) {
                case 'dust':
                    // Only update dust positions every 3rd frame for performance
                    if (shouldUpdateDust) {
                        const dustPositions = particle.geometry.attributes.position.array;
                        for (let i = 1; i < dustPositions.length; i += 3) {
                            dustPositions[i] += dt * 1.5; // Compensate for skipped frames
                            if (dustPositions[i] > 30) dustPositions[i] = 0;
                        }
                        particle.geometry.attributes.position.needsUpdate = true;
                    }
                    break;
                    
                case 'energy':
                    // Orbit around center
                    particle.rotation.y += dt * 0.3;
                    break;
                    
                case 'sparkles':
                    // Twinkle effect
                    if (particle.material) {
                        particle.material.opacity = 0.5 + Math.sin(this.timer * 5) * 0.3;
                    }
                    break;
            }
        });
    }

    /**
     * Updates the camera to follow the player with rotation support.
     * Includes bass-driven screen shake support.
     * Requirements: 9.4
     */
    updateCamera() {
        if (!this.player || !this.camera) return;

        // Camera distance and height
        const cameraDistance = 12;
        const cameraHeight = 6;
        
        // Calculate camera position based on angle (orbiting around player)
        const targetX = this.player.position.x + Math.sin(this.cameraAngle) * cameraDistance;
        const targetY = this.player.position.y + cameraHeight;
        const targetZ = this.player.position.z + Math.cos(this.cameraAngle) * cameraDistance;
        
        // Smooth camera follow
        this.camera.position.x += (targetX - this.camera.position.x) * 0.08;
        this.camera.position.y += (targetY - this.camera.position.y) * 0.08;
        this.camera.position.z += (targetZ - this.camera.position.z) * 0.08;
        
        // Apply bass-driven camera shake - Requirements: 9.4
        if (this.game && this.game.camera && this.game.camera.shake > 0) {
            const shakeAmount = this.game.camera.shake;
            this.camera.position.x += (Math.random() - 0.5) * shakeAmount * 0.1;
            this.camera.position.y += (Math.random() - 0.5) * shakeAmount * 0.1;
            this.camera.position.z += (Math.random() - 0.5) * shakeAmount * 0.1;
            
            // Decay shake
            this.game.camera.shake *= 0.9;
            if (this.game.camera.shake < 0.5) this.game.camera.shake = 0;
        }
        
        // Look at player
        this.camera.lookAt(
            this.player.position.x, 
            this.player.position.y + 1, 
            this.player.position.z
        );
    }

    // ==================== SHARD SYSTEM METHODS ====================

    /**
     * Spawns shards at regular intervals.
     * Requirements: 5.1
     */
    spawnShards() {
        const now = Date.now();
        
        // Only spawn if we haven't reached max shards and interval has passed
        if (now - this.lastShardSpawnTime >= this.shardSpawnInterval) {
            this.spawnShard();
            this.lastShardSpawnTime = now;
        }
    }

    /**
     * Spawns a single shard at a random position in the arena.
     * Requirements: 5.1
     */
    spawnShard() {
        if (!this.scene) return;
        
        // Generate random position within arena bounds
        const angle = Math.random() * Math.PI * 2;
        const radius = 5 + Math.random() * (this.domeRadius - 15); // Keep away from center and edges
        
        const position = {
            x: Math.cos(angle) * radius,
            y: 1.5 + Math.random() * 2, // Hover height between 1.5 and 3.5
            z: Math.sin(angle) * radius
        };
        
        const shard = new Shard(position);
        shard.create(this.scene);
        this.shards.push(shard);
    }

    /**
     * Updates all shards (animation).
     * Requirements: 5.2
     * @param {number} dt - Delta time in seconds
     */
    updateShards(dt) {
        this.shards.forEach(shard => {
            if (!shard.isCollected()) {
                shard.update(dt);
            }
        });
    }

    /**
     * Checks if player is close enough to collect any shards.
     * Requirements: 5.3
     */
    checkShardCollection() {
        if (!this.player) return;
        
        const playerPos = {
            x: this.player.position.x,
            y: this.player.position.y,
            z: this.player.position.z
        };
        
        this.shards.forEach(shard => {
            if (!shard.isCollected() && shard.checkCollection(playerPos)) {
                shard.collect(this.scene);
                this.shardCount++;
                this.updateShardUI();
            }
        });
        
        // Clean up collected shards from array
        this.shards = this.shards.filter(s => !s.isCollected());
    }

    /**
     * Updates the shard count UI display.
     * Requirements: 5.5
     */
    updateShardUI() {
        // Create UI element if it doesn't exist
        if (!this.shardUIElement) {
            this.shardUIElement = document.getElementById('shard-counter');
            if (!this.shardUIElement) {
                this.shardUIElement = document.createElement('div');
                this.shardUIElement.id = 'shard-counter';
                this.shardUIElement.className = 'shard-counter';
                this.shardUIElement.style.cssText = `
                    position: fixed;
                    top: 60px;
                    right: 20px;
                    font-family: 'Orbitron', sans-serif;
                    font-size: 24px;
                    color: #ffffff;
                    text-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
                    z-index: 1000;
                    background: rgba(0, 0, 0, 0.5);
                    padding: 10px 20px;
                    border-radius: 5px;
                    border: 1px solid rgba(255, 255, 255, 0.3);
                `;
                document.body.appendChild(this.shardUIElement);
            }
        }
        
        this.shardUIElement.textContent = `Shards: ${this.shardCount}/${this.maxShards}`;
    }

    /**
     * Gets the current shard count.
     * @returns {number} Current shard count
     */
    getShardCount() {
        return this.shardCount;
    }

    /**
     * Gets the maximum shard count needed for victory.
     * @returns {number} Maximum shard count
     */
    getMaxShards() {
        return this.maxShards;
    }

    // ==================== PHASE 2 TRIGGER SYSTEM ====================

    /**
     * Updates the Phase 2 state machine.
     * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
     * @param {number} dt - Delta time in seconds
     */
    updatePhase2State(dt) {
        switch (this.phase2State) {
            case 'COLLECTING':
                // Check if we should trigger Phase 2 - Requirements: 6.1
                if (this.shardCount >= this.phase2TriggerShardCount && !this.phase2Triggered) {
                    this.triggerPhase2();
                }
                break;

            case 'CAMERA_PAN':
                // Update camera pan animation - Requirements: 6.1
                this.updateCameraPan(dt);
                break;

            case 'DIALOGUE':
                // Update dialogue bubble typewriter effect - Requirements: 6.4
                if (this.dialogueBubble) {
                    this.dialogueBubble.update(dt);
                }
                break;

            case 'BOSS_GROWING':
                // Update boss growth animation - Requirements: 6.5
                this.updateBossGrowth(dt);
                break;

            case 'PILLARS_EMERGING':
                // Update pillar emergence - Requirements: 6.6
                this.updatePillarsEmergence(dt);
                break;

            case 'PHASE2_ACTIVE':
                // Normal gameplay with pillars active - Requirements: 7.1
                this.updatePillarsAndNukeBalls(dt);
                
                // Check if player has collected 15 shards to trigger defeat sequence - Requirements: 8.1
                if (this.shardCount >= this.maxShards) {
                    this.triggerDefeatSequence();
                }
                break;

            case 'DEFEAT_SEQUENCE':
                // Update defeat sequence controller - Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
                if (this.defeatSequenceController) {
                    this.defeatSequenceController.update(dt);
                }
                break;
        }
    }

    /**
     * Triggers the Phase 2 sequence when player collects 10 shards.
     * Requirements: 6.1
     */
    triggerPhase2() {
        this.phase2Triggered = true;
        this.phase2State = 'CAMERA_PAN';
        this.playerControlsPaused = true;
        this.cameraPanProgress = 0;

        // Save current camera state for smooth transition
        this.savedCameraState = {
            position: this.camera.position.clone(),
            angle: this.cameraAngle
        };

        console.log('Phase 2 triggered at 10 shards');
    }

    /**
     * Updates the camera pan animation to focus on the boss.
     * Requirements: 6.1
     * @param {number} dt - Delta time in seconds
     */
    updateCameraPan(dt) {
        this.cameraPanProgress += dt / this.cameraPanDuration;

        if (this.cameraPanProgress >= 1) {
            this.cameraPanProgress = 1;
            // Camera pan complete, start dialogue
            this.startBossDialogue();
            return;
        }

        // Smooth easing function (ease-in-out)
        const t = this.easeInOutCubic(this.cameraPanProgress);

        // Calculate target camera position (looking at boss from front)
        const bossPosition = this.centerModel ? this.centerModel.position : new THREE.Vector3(0, 6, 0);
        const targetCameraPos = new THREE.Vector3(
            bossPosition.x,
            bossPosition.y + 2,
            bossPosition.z + 15
        );

        // Interpolate camera position
        if (this.savedCameraState) {
            this.camera.position.lerpVectors(
                this.savedCameraState.position,
                targetCameraPos,
                t
            );
        }

        // Look at boss
        this.camera.lookAt(bossPosition);
    }

    /**
     * Starts the boss dialogue sequence.
     * Requirements: 6.2, 6.3, 6.4
     */
    startBossDialogue() {
        this.phase2State = 'DIALOGUE';

        // Create dialogue bubble
        this.dialogueBubble = new DialogueBubble();
        
        // Boss dialogue text - Requirements: 6.3
        const dialogueText = "you thought i would've died that easily you miserable fool? let me get serious....you wont touch my precious personal key!";
        
        // Show dialogue with callback when complete
        this.dialogueBubble.show(dialogueText, () => {
            // Wait a moment after dialogue completes, then start boss growth
            setTimeout(() => {
                this.startBossGrowth();
            }, 500);
        });
    }

    /**
     * Starts the boss growth animation.
     * Requirements: 6.5
     */
    startBossGrowth() {
        // Hide dialogue
        if (this.dialogueBubble) {
            this.dialogueBubble.hide();
        }

        this.phase2State = 'BOSS_GROWING';
        this.bossGrowthProgress = 0;

        // Add dramatic visual effects
        this.addBossGrowthEffects();
    }

    /**
     * Updates the boss growth animation.
     * Requirements: 6.5
     * @param {number} dt - Delta time in seconds
     */
    updateBossGrowth(dt) {
        this.bossGrowthProgress += dt / this.bossGrowthDuration;

        if (this.bossGrowthProgress >= 1) {
            this.bossGrowthProgress = 1;
            // Growth complete, transition to pillars emerging
            this.phase2State = 'PILLARS_EMERGING';
            
            // Restore camera to follow player
            this.restoreCameraFollow();
            return;
        }

        // Smooth easing for growth
        const t = this.easeOutBack(this.bossGrowthProgress);

        // Interpolate boss scale
        if (this.centerModel) {
            const currentScale = this.bossOriginalScale + (this.bossTargetScale - this.bossOriginalScale) * t;
            this.centerModel.scale.set(currentScale, currentScale, currentScale);
        }

        // Screen shake during growth
        if (this.game && this.game.camera) {
            this.game.camera.shake = Math.sin(this.bossGrowthProgress * Math.PI * 8) * 3 * (1 - this.bossGrowthProgress);
        }
    }

    /**
     * Adds dramatic visual effects during boss growth.
     * Requirements: 6.5
     */
    addBossGrowthEffects() {
        if (!this.scene || typeof THREE === 'undefined') return;

        // Add red glow around boss
        const bossPosition = this.centerModel ? this.centerModel.position : new THREE.Vector3(0, 6, 0);
        
        // Create expanding ring effect
        const ringGeometry = new THREE.RingGeometry(2, 2.5, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0xff4444,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.copy(bossPosition);
        ring.rotation.x = -Math.PI / 2;
        this.scene.add(ring);

        // Animate ring expansion
        const animateRing = () => {
            if (!ring.parent) return;
            
            ring.scale.x += 0.1;
            ring.scale.y += 0.1;
            ring.material.opacity -= 0.02;
            
            if (ring.material.opacity <= 0) {
                this.scene.remove(ring);
                ring.geometry.dispose();
                ring.material.dispose();
            } else {
                requestAnimationFrame(animateRing);
            }
        };
        
        requestAnimationFrame(animateRing);

        // Add red point light flash
        const flashLight = new THREE.PointLight(0xff4444, 3, 50);
        flashLight.position.copy(bossPosition);
        this.scene.add(flashLight);

        // Fade out flash light
        const fadeLight = () => {
            flashLight.intensity -= 0.05;
            if (flashLight.intensity <= 0) {
                this.scene.remove(flashLight);
            } else {
                requestAnimationFrame(fadeLight);
            }
        };
        
        setTimeout(fadeLight, 100);
    }

    /**
     * Restores camera to follow player after Phase 2 trigger sequence.
     */
    restoreCameraFollow() {
        // Camera will naturally follow player in updateCamera()
        // Just need to reset the angle smoothly
        if (this.player) {
            // Calculate angle to look at player from current position
            const dx = this.camera.position.x - this.player.position.x;
            const dz = this.camera.position.z - this.player.position.z;
            this.cameraAngle = Math.atan2(dx, dz);
        }
    }

    // ==================== PILLAR AND NUKEBALL SYSTEM ====================

    /**
     * Spawns pillars around the boss.
     * Requirements: 6.6
     */
    spawnPillars() {
        if (!this.scene) return;

        // Get boss position
        const bossPosition = this.centerModel 
            ? { x: this.centerModel.position.x, y: this.centerModel.position.y, z: this.centerModel.position.z }
            : { x: 0, y: 6, z: 0 };

        // Spawn 3 pillars evenly around boss (120 degrees apart)
        for (let i = 0; i < this.pillarCount; i++) {
            const angle = (i / this.pillarCount) * Math.PI * 2;
            const position = {
                x: bossPosition.x + Math.cos(angle) * this.pillarDistance,
                y: 0,
                z: bossPosition.z + Math.sin(angle) * this.pillarDistance
            };

            const pillar = new Pillar(position, bossPosition);
            pillar.create(this.scene);
            pillar.startEmergence();
            this.pillars.push(pillar);
        }

        console.log(`Spawned ${this.pillarCount} pillars around boss`);
    }

    /**
     * Updates pillar emergence animation.
     * Requirements: 6.6
     * @param {number} dt - Delta time in seconds
     */
    updatePillarsEmergence(dt) {
        // Spawn pillars if not already spawned
        if (this.pillars.length === 0) {
            this.spawnPillars();
        }

        // Update all pillars
        let allEmerged = true;
        this.pillars.forEach(pillar => {
            pillar.update(dt);
            if (!pillar.hasEmerged()) {
                allEmerged = false;
            }
        });

        // Transition to PHASE2_ACTIVE when all pillars have emerged
        if (allEmerged) {
            this.phase2State = 'PHASE2_ACTIVE';
            this.playerControlsPaused = false;
            console.log('All pillars emerged, Phase 2 active');
        }
    }

    /**
     * Updates pillars and nuke balls during Phase 2 active state.
     * Requirements: 7.1, 7.3, 7.4
     * @param {number} dt - Delta time in seconds
     */
    updatePillarsAndNukeBalls(dt) {
        // Update pillars and check for nuke ball spawns
        this.pillars.forEach(pillar => {
            const shouldSpawn = pillar.update(dt);
            if (shouldSpawn) {
                this.spawnNukeBallsFromPillar(pillar);
            }
        });

        // Update nuke balls
        this.updateNukeBalls(dt);

        // Check nuke ball collisions with player
        this.checkNukeBallCollisions();
    }

    /**
     * Spawns nuke balls from a pillar.
     * Requirements: 7.1, 7.2
     * @param {Pillar} pillar - The pillar spawning the nuke balls
     */
    spawnNukeBallsFromPillar(pillar) {
        if (!this.scene) return;
        
        // Limit max active nuke balls for performance
        if (this.nukeBalls.length >= 12) return;

        const spawnPosition = pillar.getSpawnPosition();
        const ballCount = pillar.getBallsPerSpawn();

        // Create target getter function that returns player position
        const targetGetter = () => {
            if (this.player) {
                return {
                    x: this.player.position.x,
                    y: this.player.position.y,
                    z: this.player.position.z
                };
            }
            return null;
        };

        for (let i = 0; i < ballCount; i++) {
            // Slight offset for each ball to avoid overlap
            const offset = {
                x: (Math.random() - 0.5) * 1,
                y: (Math.random() - 0.5) * 0.5,
                z: (Math.random() - 0.5) * 1
            };

            const nukeBall = new NukeBall(
                {
                    x: spawnPosition.x + offset.x,
                    y: spawnPosition.y + offset.y,
                    z: spawnPosition.z + offset.z
                },
                targetGetter
            );
            nukeBall.create(this.scene);
            this.nukeBalls.push(nukeBall);
        }
    }

    /**
     * Updates all nuke balls.
     * Requirements: 7.3, 7.4
     * @param {number} dt - Delta time in seconds
     */
    updateNukeBalls(dt) {
        // Update each nuke ball
        this.nukeBalls.forEach(nukeBall => {
            nukeBall.update(dt);
        });

        // Remove inactive nuke balls (lifetime expired)
        const inactiveNukeBalls = this.nukeBalls.filter(nb => !nb.isActive());
        inactiveNukeBalls.forEach(nb => {
            nb.destroy(this.scene);
        });
        this.nukeBalls = this.nukeBalls.filter(nb => nb.isActive());
    }

    /**
     * Checks nuke ball collisions with player.
     * Requirements: 7.5
     */
    checkNukeBallCollisions() {
        if (!this.player || this.playerControlsPaused) return;

        const playerPos = {
            x: this.player.position.x,
            y: this.player.position.y,
            z: this.player.position.z
        };

        for (const nukeBall of this.nukeBalls) {
            if (nukeBall.checkCollision(playerPos)) {
                // Player hit by nuke ball - game over
                this.triggerGameOver();
                return;
            }
        }
    }

    /**
     * Triggers game over when player is hit.
     * Requirements: 7.5
     */
    triggerGameOver() {
        this.active = false;
        
        // Clean up
        this.cleanupPillarsAndNukeBalls();
        
        // Trigger game over in main game
        if (this.game) {
            this.game.gameState = 'GAME_OVER';
            this.game.showGameOver();
        }
    }

    /**
     * Triggers the boss defeat sequence when player collects 15 shards.
     * Requirements: 8.1, 8.2
     */
    triggerDefeatSequence() {
        // Prevent multiple triggers
        if (this.phase2State === 'DEFEAT_SEQUENCE') return;
        
        console.log('Defeat sequence triggered at 15 shards');
        
        // Pause player controls during defeat sequence
        this.playerControlsPaused = true;
        
        // Clean up pillars and nuke balls
        this.cleanupPillarsAndNukeBalls();
        
        // Create and start the defeat sequence controller
        this.defeatSequenceController = new DefeatSequenceController(
            this,
            () => this.onDefeatSequenceComplete()
        );
        
        // Start the defeat sequence
        this.defeatSequenceController.start();
        this.phase2State = 'DEFEAT_SEQUENCE';
    }

    /**
     * Called when the defeat sequence completes.
     * Requirements: 8.6
     */
    onDefeatSequenceComplete() {
        this.active = false;
        
        // Show victory screen
        if (this.game) {
            this.game.gameState = 'VICTORY';
        }
        
        // Hide HUD
        const hud = document.getElementById('hud');
        if (hud) {
            hud.classList.add('hidden');
        }
        
        // Show boss victory screen
        const victoryScreen = document.getElementById('boss-victory-screen');
        if (victoryScreen) {
            victoryScreen.classList.remove('hidden');
            victoryScreen.classList.add('active');
        }
        
        console.log('Boss defeated! Victory!');
    }

    /**
     * Cleans up all pillars and nuke balls.
     */
    cleanupPillarsAndNukeBalls() {
        // Clean up pillars
        this.pillars.forEach(pillar => {
            pillar.cleanup(this.scene);
        });
        this.pillars = [];

        // Clean up nuke balls
        this.nukeBalls.forEach(nukeBall => {
            nukeBall.destroy(this.scene);
        });
        this.nukeBalls = [];
    }

    /**
     * Gets the current pillar count.
     * @returns {number} Number of pillars
     */
    getPillarCount() {
        return this.pillars.length;
    }

    /**
     * Gets the current nuke ball count.
     * @returns {number} Number of active nuke balls
     */
    getNukeBallCount() {
        return this.nukeBalls.filter(nb => nb.isActive()).length;
    }

    /**
     * Easing function: ease-in-out cubic.
     * @param {number} t - Progress (0 to 1)
     * @returns {number} Eased value
     */
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    /**
     * Easing function: ease-out back (slight overshoot).
     * @param {number} t - Progress (0 to 1)
     * @returns {number} Eased value
     */
    easeOutBack(t) {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }

    /**
     * Gets the current Phase 2 state.
     * @returns {string} Current phase 2 state
     */
    getPhase2State() {
        return this.phase2State;
    }

    /**
     * Checks if Phase 2 has been triggered.
     * @returns {boolean} True if Phase 2 has been triggered
     */
    isPhase2Triggered() {
        return this.phase2Triggered;
    }

    /**
     * Spawns 3D hazards (lasers, bullets, projectiles).
     * Requirements: 4.6
     */
    spawnHazards() {
        const now = Date.now();
        
        // Limit max active hazards for performance
        if (this.hazards.length >= 15) return;
        
        if (now - this.lastHazardSpawnTime > this.hazardSpawnInterval) {
            this.spawnHazard();
            this.lastHazardSpawnTime = now;
            
            // Increase difficulty over time
            this.hazardSpawnInterval = Math.max(300, 800 - this.timer * 15);
        }
    }

    /**
     * Spawns a single 3D hazard.
     * Requirements: 4.6
     */
    spawnHazard() {
        const hazardType = Math.random();
        
        if (hazardType < 0.4) {
            // Laser beam from center
            this.spawnLaser();
        } else if (hazardType < 0.7) {
            // Bullet from random direction
            this.spawnBullet();
        } else {
            // Falling projectile
            this.spawnProjectile();
        }
    }

    /**
     * Spawns a laser beam from the center sphere.
     */
    spawnLaser() {
        const angle = Math.random() * Math.PI * 2;
        const laserGeometry = new THREE.CylinderGeometry(0.2, 0.2, this.domeRadius * 2, 8);
        const laserMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.8
        });

        const laser = new THREE.Mesh(laserGeometry, laserMaterial);
        laser.position.set(0, 2, 0);
        laser.rotation.z = Math.PI / 2;
        laser.rotation.y = angle;

        this.scene.add(laser);
        this.hazards.push({
            type: 'laser',
            mesh: laser,
            angle: angle,
            timer: 0,
            duration: 1.5,
            active: true
        });
    }

    /**
     * Spawns a bullet from a random direction.
     */
    spawnBullet() {
        const angle = Math.random() * Math.PI * 2;
        const startDist = this.domeRadius - 5;

        const bulletGeometry = new THREE.SphereGeometry(0.5, 16, 16);
        const bulletMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0.9
        });

        const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
        bullet.position.set(
            Math.cos(angle) * startDist,
            1 + Math.random() * 3,
            Math.sin(angle) * startDist
        );

        // Velocity toward center (with some randomness)
        const targetX = (Math.random() - 0.5) * 10;
        const targetZ = (Math.random() - 0.5) * 10;
        const dx = targetX - bullet.position.x;
        const dz = targetZ - bullet.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const speed = 20;

        this.scene.add(bullet);
        this.hazards.push({
            type: 'bullet',
            mesh: bullet,
            velocity: {
                x: (dx / dist) * speed,
                y: 0,
                z: (dz / dist) * speed
            },
            active: true
        });
    }

    /**
     * Spawns a falling projectile from above.
     */
    spawnProjectile() {
        const x = (Math.random() - 0.5) * this.domeRadius * 1.5;
        const z = (Math.random() - 0.5) * this.domeRadius * 1.5;

        const projGeometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
        const projMaterial = new THREE.MeshBasicMaterial({
            color: 0xff00ff,
            transparent: true,
            opacity: 0.8
        });

        const projectile = new THREE.Mesh(projGeometry, projMaterial);
        projectile.position.set(x, 30, z);

        this.scene.add(projectile);
        this.hazards.push({
            type: 'projectile',
            mesh: projectile,
            velocity: { x: 0, y: -25, z: 0 },
            rotation: Math.random() * 0.1,
            active: true
        });
    }

    /**
     * Updates all hazards.
     * @param {number} dt - Delta time in seconds
     */
    updateHazards(dt) {
        this.hazards.forEach(hazard => {
            if (!hazard.active) return;

            switch (hazard.type) {
                case 'laser':
                    hazard.timer += dt;
                    if (hazard.timer > hazard.duration) {
                        hazard.active = false;
                        this.scene.remove(hazard.mesh);
                    } else {
                        // Fade out
                        hazard.mesh.material.opacity = 0.8 * (1 - hazard.timer / hazard.duration);
                    }
                    break;

                case 'bullet':
                    hazard.mesh.position.x += hazard.velocity.x * dt;
                    hazard.mesh.position.z += hazard.velocity.z * dt;
                    
                    // Remove if out of bounds
                    const dist = Math.sqrt(
                        hazard.mesh.position.x * hazard.mesh.position.x +
                        hazard.mesh.position.z * hazard.mesh.position.z
                    );
                    if (dist > this.domeRadius + 10) {
                        hazard.active = false;
                        this.scene.remove(hazard.mesh);
                    }
                    break;

                case 'projectile':
                    hazard.mesh.position.y += hazard.velocity.y * dt;
                    hazard.mesh.rotation.x += hazard.rotation;
                    hazard.mesh.rotation.z += hazard.rotation;
                    
                    // Remove if below floor
                    if (hazard.mesh.position.y < -5) {
                        hazard.active = false;
                        this.scene.remove(hazard.mesh);
                    }
                    break;
            }
        });

        // Clean up inactive hazards
        this.hazards = this.hazards.filter(h => h.active);
    }

    /**
     * Checks collisions between player and hazards.
     */
    checkCollisions() {
        if (!this.player) return;

        const playerPos = this.player.position;
        const playerRadius = 0.7;

        for (const hazard of this.hazards) {
            if (!hazard.active) continue;

            let collision = false;

            switch (hazard.type) {
                case 'laser':
                    // Check distance from player to laser line
                    const laserAngle = hazard.angle;
                    const laserDirX = Math.cos(laserAngle);
                    const laserDirZ = Math.sin(laserAngle);
                    
                    // Point-to-line distance in XZ plane
                    const t = playerPos.x * laserDirX + playerPos.z * laserDirZ;
                    const closestX = t * laserDirX;
                    const closestZ = t * laserDirZ;
                    const distToLaser = Math.sqrt(
                        Math.pow(playerPos.x - closestX, 2) +
                        Math.pow(playerPos.z - closestZ, 2)
                    );
                    
                    if (distToLaser < playerRadius + 0.3 && Math.abs(playerPos.y - 2) < 2) {
                        collision = true;
                    }
                    break;

                case 'bullet':
                case 'projectile':
                    const dx = playerPos.x - hazard.mesh.position.x;
                    const dy = playerPos.y - hazard.mesh.position.y;
                    const dz = playerPos.z - hazard.mesh.position.z;
                    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                    
                    const hazardRadius = hazard.type === 'bullet' ? 0.5 : 1;
                    if (dist < playerRadius + hazardRadius) {
                        collision = true;
                    }
                    break;
            }

            if (collision) {
                this.triggerGameOver();
                return;
            }
        }
    }

    /**
     * Updates the timer display on screen.
     * Requirements: 4.5
     */
    updateTimerDisplay() {
        const timerElement = document.getElementById('timer');
        if (timerElement) {
            const remaining = Math.max(0, this.survivalTime - this.timer);
            const seconds = Math.floor(remaining);
            const ms = Math.floor((remaining - seconds) * 100);
            timerElement.innerText = `${seconds.toString().padStart(2, '0')}:${ms.toString().padStart(2, '0')}`;
        }
    }

    /**
     * Gets the current timer value.
     * @returns {number} Current timer in seconds
     */
    getTimer() {
        return this.timer;
    }

    /**
     * Checks if the player has survived 30 seconds.
     * Requirements: 4.5, 5.1
     * @returns {boolean} True if timer >= 30 seconds
     */
    checkVictory() {
        return this.timer >= this.survivalTime;
    }

    /**
     * Triggers victory when player survives 30 seconds.
     */
    triggerVictory() {
        this.active = false;
        this.cleanup();
        
        // Show boss victory screen
        if (this.game) {
            this.game.showBossVictory();
        }
    }

    /**
     * Triggers game over when player is hit.
     */
    triggerGameOver() {
        this.active = false;
        this.cleanup();
        
        if (this.game) {
            this.game.gameOver();
        }
    }

    /**
     * Renders the 3D scene.
     */
    render() {
        if (!this.active || !this.renderer || !this.scene || !this.camera) return;
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Cleans up Three.js resources.
     */
    cleanup() {
        // Remove event listeners
        if (this.keydownHandler) {
            window.removeEventListener('keydown', this.keydownHandler);
        }
        if (this.keyupHandler) {
            window.removeEventListener('keyup', this.keyupHandler);
        }

        // Hide mobile 3D controls
        this.hideMobile3DControls();
        
        // Clean up shard UI
        if (this.shardUIElement && this.shardUIElement.parentNode) {
            this.shardUIElement.parentNode.removeChild(this.shardUIElement);
            this.shardUIElement = null;
        }
        
        // Clean up dialogue bubble - Requirements: 6.2
        if (this.dialogueBubble) {
            this.dialogueBubble.cleanup();
            this.dialogueBubble = null;
        }

        // Dispose of Three.js objects
        if (this.scene) {
            while (this.scene.children.length > 0) {
                const obj = this.scene.children[0];
                this.scene.remove(obj);
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) {
                    if (Array.isArray(obj.material)) {
                        obj.material.forEach(m => m.dispose());
                    } else {
                        obj.material.dispose();
                    }
                }
            }
        }

        if (this.renderer) {
            this.renderer.dispose();
            const container = document.getElementById('three-container');
            if (container) {
                container.innerHTML = '';
            }
        }

        // Show 2D canvas again
        const canvas2D = document.getElementById('game-canvas');
        if (canvas2D) canvas2D.style.display = 'block';
        
        // Show 2D background layer again
        const backgroundLayer = document.getElementById('background-layer');
        if (backgroundLayer) backgroundLayer.style.display = 'block';

        // Reset state
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.player = null;
        this.pulsingSphere = null;
        this.hazards = [];
        this.shards = [];
        this.shardCount = 0;
        this.active = false;
        
        // Reset Phase 2 state
        this.phase2State = 'COLLECTING';
        this.phase2Triggered = false;
        this.playerControlsPaused = false;
    }

    /**
     * Checks if the arena is currently active.
     * @returns {boolean} True if arena is active
     */
    isActive() {
        return this.active;
    }

    /**
     * Resets the arena to initial state.
     */
    reset() {
        this.cleanup();
        this.timer = 0;
        this.hazards = [];
        this.shards = [];
        this.shardCount = 0;
        this.playerVelocity = { x: 0, y: 0, z: 0 };
        this.playerOnGround = true;
    }
}

/**
 * Safely parses leaderboard JSON response.
 * Handles empty responses, invalid JSON, and HTML error pages gracefully.
 * 
 * @param {string} responseText - The raw response text from the server
 * @returns {LeaderboardResult} Object with success flag, leaderboard array, and error message
 */
function safeParseLeaderboard(responseText) {
    // Handle empty response
    if (!responseText || responseText.trim().length === 0) {
        return { success: true, leaderboard: [], error: null };
    }

    // Detect HTML error pages
    const trimmed = responseText.trim();
    if (trimmed.startsWith('<') || trimmed.includes('<!DOCTYPE')) {
        return { success: false, leaderboard: [], error: 'Server returned HTML instead of JSON' };
    }

    // Attempt JSON parse
    try {
        const data = JSON.parse(responseText);
        return { 
            success: true, 
            leaderboard: Array.isArray(data.leaderboard) ? data.leaderboard : [],
            error: null 
        };
    } catch (e) {
        return { success: false, leaderboard: [], error: 'Invalid JSON response' };
    }
}

// ==================== MOBILE SETUP MANAGER ====================

/**
 * MobileSetupManager - Handles mobile device detection, orientation, and fullscreen
 */
class MobileSetupManager {
    constructor() {
        this.overlay = document.getElementById('mobile-setup-overlay');
        this.fullscreenBtn = document.getElementById('fullscreen-btn');
        this.skipBtn = document.getElementById('skip-setup-btn');
        this.landscapeStatus = document.getElementById('landscape-status');
        this.fullscreenStatus = document.getElementById('fullscreen-status');
        this.stepLandscape = document.getElementById('step-landscape');
        this.stepFullscreen = document.getElementById('step-fullscreen');
        
        this.isLandscape = false;
        this.isFullscreen = false;
        this.setupComplete = false;
        
        this.init();
    }
    
    /**
     * Detects if the device is mobile/tablet.
     */
    isMobileDevice() {
        return ('ontouchstart' in window) || 
               (navigator.maxTouchPoints > 0) || 
               (navigator.msMaxTouchPoints > 0) ||
               /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    
    /**
     * Initializes the mobile setup manager.
     */
    init() {
        if (!this.isMobileDevice()) {
            // Not mobile, hide overlay immediately
            if (this.overlay) {
                this.overlay.classList.add('hidden');
            }
            return;
        }
        
        // Show overlay for mobile users
        if (this.overlay) {
            this.overlay.classList.remove('hidden');
        }
        
        // Check initial state
        this.checkOrientation();
        this.checkFullscreen();
        
        // Bind events
        this.bindEvents();
    }
    
    /**
     * Binds event listeners.
     */
    bindEvents() {
        // Fullscreen button
        if (this.fullscreenBtn) {
            this.fullscreenBtn.addEventListener('click', () => this.requestFullscreen());
        }
        
        // Skip button
        if (this.skipBtn) {
            this.skipBtn.addEventListener('click', () => this.skipSetup());
        }
        
        // Orientation change
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.checkOrientation(), 100);
        });
        
        window.addEventListener('resize', () => {
            this.checkOrientation();
        });
        
        // Fullscreen change
        document.addEventListener('fullscreenchange', () => this.checkFullscreen());
        document.addEventListener('webkitfullscreenchange', () => this.checkFullscreen());
        document.addEventListener('mozfullscreenchange', () => this.checkFullscreen());
        document.addEventListener('MSFullscreenChange', () => this.checkFullscreen());
    }
    
    /**
     * Checks if device is in landscape orientation.
     */
    checkOrientation() {
        this.isLandscape = window.innerWidth > window.innerHeight;
        
        if (this.landscapeStatus) {
            this.landscapeStatus.textContent = this.isLandscape ? '✅' : '❌';
        }
        if (this.stepLandscape) {
            this.stepLandscape.classList.toggle('complete', this.isLandscape);
        }
        
        this.checkSetupComplete();
    }
    
    /**
     * Checks if document is in fullscreen mode.
     */
    checkFullscreen() {
        this.isFullscreen = !!(document.fullscreenElement || 
                               document.webkitFullscreenElement || 
                               document.mozFullScreenElement || 
                               document.msFullscreenElement);
        
        if (this.fullscreenStatus) {
            this.fullscreenStatus.textContent = this.isFullscreen ? '✅' : '❌';
        }
        if (this.stepFullscreen) {
            this.stepFullscreen.classList.toggle('complete', this.isFullscreen);
        }
        
        // Update button text
        if (this.fullscreenBtn) {
            this.fullscreenBtn.innerHTML = this.isFullscreen 
                ? '<span class="btn-icon">✓</span> FULLSCREEN ACTIVE'
                : '<span class="btn-icon">⛶</span> GO FULLSCREEN';
        }
        
        this.checkSetupComplete();
    }
    
    /**
     * Requests fullscreen mode.
     */
    requestFullscreen() {
        const elem = document.documentElement;
        
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
        } else if (elem.mozRequestFullScreen) {
            elem.mozRequestFullScreen();
        } else if (elem.msRequestFullscreen) {
            elem.msRequestFullscreen();
        }
        
        // Lock orientation to landscape if supported
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape').catch(() => {
                // Orientation lock not supported or denied
            });
        }
    }
    
    /**
     * Checks if setup is complete and hides overlay.
     */
    checkSetupComplete() {
        if (this.isLandscape && this.isFullscreen && !this.setupComplete) {
            this.setupComplete = true;
            this.hideOverlay();
        }
    }
    
    /**
     * Skips the setup and hides overlay.
     */
    skipSetup() {
        this.setupComplete = true;
        this.hideOverlay();
    }
    
    /**
     * Hides the setup overlay with animation.
     */
    hideOverlay() {
        if (this.overlay) {
            this.overlay.classList.add('hidden');
        }
    }
}

// Init
window.addEventListener('load', () => {
    // Initialize mobile setup first
    const mobileSetup = new MobileSetupManager();
    
    // Then initialize game
    const game = new Game();
});

// Export for testing (Node.js/CommonJS environment)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { StageManager, safeParseLeaderboard, getStage2Phase, isImpactTrigger, IMPACT_TRIGGERS, FloatingIsle, AdminMenu, VoidPortal, OrbitingBlock, CentralBlock, NEON_COLORS, CornerLaser, Boulder, BossPhaseManager, TransitionPortal, Arena3DManager, BossEmergenceController, Shard, Pillar, NukeBall, BossMusicController, DefeatSequenceController };
}
