/**
 * RHYTHM DODGER - Backend Server
 * 
 * Handles leaderboard API endpoints with Redis (daily) and PostgreSQL (all-time)
 * Uses player_id (UUID) for identity tracking instead of IP addresses
 */

// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('redis');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Redis Client Configuration - lazy connection, reconnects on demand
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
let redisClient = null;
let redisConnecting = false;

// Create Redis client with relaxed settings
function createRedisClient() {
    return createClient({
        url: redisUrl,
        socket: {
            tls: false,
            connectTimeout: 10000,
            reconnectStrategy: false // Don't auto-reconnect, we'll handle it manually
        }
    });
}

// Try to connect/reconnect to Redis
async function ensureRedisConnection() {
    if (redisClient && redisClient.isOpen) {
        return true;
    }
    
    if (redisConnecting) {
        return false; // Already trying to connect
    }
    
    redisConnecting = true;
    
    try {
        // Close old client if exists
        if (redisClient) {
            try {
                await redisClient.quit();
            } catch (e) { /* ignore */ }
        }
        
        redisClient = createRedisClient();
        
        redisClient.on('error', (err) => {
            if (err.code !== 'ECONNRESET' && err.code !== 'ECONNREFUSED') {
                console.error('Redis Error:', err.message);
            }
        });
        
        await redisClient.connect();
        console.log('✓ Connected to Redis');
        redisConnecting = false;
        return true;
    } catch (err) {
        console.log('⚠ Redis unavailable:', err.message);
        redisConnecting = false;
        return false;
    }
}

// Check if Redis is available (non-blocking)
function isRedisAvailable() {
    return redisClient && redisClient.isOpen;
}

// PostgreSQL Pool Configuration
const pgPool = new Pool({
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT) || 5432,
    database: process.env.PG_DATABASE || 'rhythm_dodger',
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || '',
    ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false
});

pgPool.on('connect', () => console.log('✓ Connected to PostgreSQL'));
pgPool.on('error', (err) => console.error('PostgreSQL Pool Error:', err.message));

// Anti-cheat: Minimum completion time (Stage 1: 60s + Stage 2: 60s + Boss Phase 1: 30s + Boss Phase 2: 30s)
const MINIMUM_COMPLETION_TIME = 180;

// Helper function to get IP hash (used only for rate limiting/logging, not identity)
function getIpHash(req) {
    const ip = req.headers['x-forwarded-for']?.split(',')[0] ||
               req.socket?.remoteAddress ||
               'unknown';
    return Buffer.from(ip).toString('base64').substring(0, 20);
}

// Initialize database tables
async function initDatabase() {
    try {
        // Create scores table with player_id for identity tracking
        await pgPool.query(`
            CREATE TABLE IF NOT EXISTS scores (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) NOT NULL,
                discord VARCHAR(100),
                score FLOAT NOT NULL,
                player_id VARCHAR(50),
                ip_hash VARCHAR(50),
                is_flagged BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Add columns if they don't exist (for existing databases)
        await pgPool.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='scores' AND column_name='ip_hash') THEN
                    ALTER TABLE scores ADD COLUMN ip_hash VARCHAR(50);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='scores' AND column_name='is_flagged') THEN
                    ALTER TABLE scores ADD COLUMN is_flagged BOOLEAN DEFAULT FALSE;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='scores' AND column_name='player_id') THEN
                    ALTER TABLE scores ADD COLUMN player_id VARCHAR(50);
                END IF;
            END $$;
        `);
        
        // Create flags table for tracking suspicious activity
        await pgPool.query(`
            CREATE TABLE IF NOT EXISTS flags (
                id SERIAL PRIMARY KEY,
                ip_hash VARCHAR(50) NOT NULL,
                reason VARCHAR(100) NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                associated_score_id INTEGER REFERENCES scores(id) ON DELETE SET NULL
            )
        `);
        
        // Create player_profiles table for storing user preferences by player_id
        await pgPool.query(`
            CREATE TABLE IF NOT EXISTS player_profiles (
                id SERIAL PRIMARY KEY,
                player_id VARCHAR(50) UNIQUE NOT NULL,
                username VARCHAR(50),
                discord VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        console.log('✓ PostgreSQL tables "scores", "flags", and "player_profiles" ready');
    } catch (err) {
        console.error('Error initializing database:', err.message);
    }
}

// Check if an IP is flagged
async function isIpFlagged(ipHash) {
    try {
        const result = await pgPool.query(
            'SELECT COUNT(*) as count FROM flags WHERE ip_hash = $1',
            [ipHash]
        );
        return parseInt(result.rows[0].count) > 0;
    } catch (err) {
        console.error('Error checking flag status:', err.message);
        return false;
    }
}

// Get the daily leaderboard key based on current UTC date
function getDailyKey() {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return `leaderboard:daily:${today}`;
}


// API Routes

/**
 * GET /api/leaderboard/daily
 * Returns top 40 scores from today (resets at 00:00 UTC)
 * Shows ALL scores, not grouped by player
 */
app.get('/api/leaderboard/daily', async (req, res) => {
    try {
        // Get today's date in UTC
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        
        // Get top 40 scores from today, ordered by score descending
        const result = await pgPool.query(`
            SELECT username, discord, score, created_at
            FROM scores
            WHERE DATE(created_at AT TIME ZONE 'UTC') = $1
            ORDER BY score DESC
            LIMIT 40
        `, [today]);

        console.log(`Daily leaderboard: Found ${result.rows.length} scores for ${today}`);

        const leaderboard = result.rows.map((row, index) => ({
            rank: index + 1,
            username: row.username,
            discord: row.discord || '',
            score: row.score,
            date: row.created_at
        }));

        res.json({ success: true, leaderboard });
    } catch (err) {
        console.error('Error fetching daily leaderboard:', err.message);
        res.json({ success: true, leaderboard: [] });
    }
});

/**
 * GET /api/leaderboard/all-time
 * Returns top 40 best scores (best per username, never resets)
 */
app.get('/api/leaderboard/all-time', async (req, res) => {
    try {
        // Get best score per username, ordered by score descending
        const result = await pgPool.query(`
            SELECT username, discord, MAX(score) as score, MAX(created_at) as created_at
            FROM scores
            GROUP BY username, discord
            ORDER BY score DESC
            LIMIT 40
        `);

        console.log(`All-time leaderboard: Found ${result.rows.length} unique players`);

        const leaderboard = result.rows.map((row, index) => ({
            rank: index + 1,
            username: row.username,
            discord: row.discord || '',
            score: row.score,
            date: row.created_at
        }));

        res.json({ success: true, leaderboard });
    } catch (err) {
        console.error('Error fetching all-time leaderboard:', err.message);
        res.json({ success: true, leaderboard: [] });
    }
});

/**
 * POST /api/score
 * Submits a new score - keeps only the highest score per player_id
 * Body: { playerId: string, username: string, discord: string, score: number, isVictory: boolean }
 */
app.post('/api/score', async (req, res) => {
    try {
        const { playerId, username, discord, score, isVictory } = req.body;
        const ipHash = getIpHash(req); // Used only for rate limiting/logging

        // Validate input
        if (!username || typeof username !== 'string' || username.trim().length === 0) {
            return res.status(400).json({ success: false, error: 'Username is required' });
        }

        if (typeof score !== 'number' || score < 0) {
            return res.status(400).json({ success: false, error: 'Valid score is required' });
        }

        // Anti-cheat: Check minimum completion time ONLY for victory scores
        if (isVictory && score < MINIMUM_COMPLETION_TIME) {
            try {
                await pgPool.query(
                    'INSERT INTO flags (ip_hash, reason) VALUES ($1, $2)',
                    [ipHash, 'time_violation']
                );
                console.log(`⚠ Flagged IP ${ipHash} for time violation (victory score: ${score}s < ${MINIMUM_COMPLETION_TIME}s)`);
            } catch (flagErr) {
                console.error('Error flagging player:', flagErr.message);
            }
            
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid score: completion time too short for victory',
                flagged: true
            });
        }

        const cleanUsername = username.trim().substring(0, 50);
        const cleanDiscord = (discord || '').trim().substring(0, 100);
        const cleanPlayerId = (playerId || '').trim().substring(0, 50) || null;
        const memberKey = `${cleanUsername}::${cleanDiscord}`;

        // Check if this IP is flagged
        const isFlagged = await isIpFlagged(ipHash);

        let dailyRank = null;
        let allTimeRank = null;
        let isNewBest = false;

        // Add to Redis daily leaderboard (try to connect if not connected)
        if (!isRedisAvailable()) {
            console.log('Score submit: Redis not available, attempting connection...');
            await ensureRedisConnection();
        }
        
        if (isRedisAvailable()) {
            try {
                const dailyKey = getDailyKey();
                console.log(`Score submit: Adding to Redis key ${dailyKey}, memberKey: ${memberKey}, score: ${score}`);
                
                const existingScore = await redisClient.zScore(dailyKey, memberKey);
                console.log(`Score submit: Existing score for ${memberKey}: ${existingScore}`);
                
                if (existingScore === null || score > existingScore) {
                    await redisClient.zAdd(dailyKey, { score: score, value: memberKey });
                    console.log(`Score submit: Added/updated score in Redis`);
                } else {
                    console.log(`Score submit: Score ${score} not better than existing ${existingScore}, skipping`);
                }
                await redisClient.expire(dailyKey, 86400); // 24 hours
                dailyRank = await redisClient.zRevRank(dailyKey, memberKey);
                console.log(`Score submit: Daily rank is ${dailyRank}`);
            } catch (rkErr) {
                console.error("Redis score submit error:", rkErr.message);
            }
        } else {
            console.log('Score submit: Redis unavailable, skipping daily leaderboard');
        }

        // PostgreSQL: Always insert the score, leaderboard will show best per player
        try {
            // Always insert the score
            await pgPool.query(
                'INSERT INTO scores (username, discord, score, player_id, ip_hash, is_flagged) VALUES ($1, $2, $3, $4, $5, $6)',
                [cleanUsername, cleanDiscord, score, cleanPlayerId, ipHash, isFlagged]
            );
            
            // Check if this is a new best for this player
            if (cleanPlayerId) {
                const bestResult = await pgPool.query(
                    'SELECT MAX(score) as best FROM scores WHERE player_id = $1',
                    [cleanPlayerId]
                );
                if (bestResult.rows[0]?.best === score) {
                    isNewBest = true;
                }
            } else {
                isNewBest = true; // Anonymous scores are always "new"
            }

            // Calculate all-time rank (based on best scores per player)
            const allTimeResult = await pgPool.query(
                'SELECT COUNT(DISTINCT COALESCE(player_id, id::text)) as rank FROM scores WHERE score > $1 AND COALESCE(is_flagged, FALSE) = FALSE',
                [score]
            );
            allTimeRank = parseInt(allTimeResult.rows[0].rank) + 1;
        } catch (pgErr) {
            console.error("Postgres score submit error:", pgErr.message);
        }

        res.json({
            success: true,
            message: isNewBest ? 'New best score!' : 'Score submitted!',
            dailyRank: dailyRank !== null ? dailyRank + 1 : null,
            allTimeRank: allTimeRank,
            isNewBest: isNewBest,
            flagged: isFlagged
        });

    } catch (err) {
        console.error('Error submitting score:', err);
        res.status(500).json({ success: false, error: 'Failed to submit score' });
    }
});

/**
 * GET /api/stats
 * Returns general statistics
 */
app.get('/api/stats', async (req, res) => {
    try {
        let dailyCount = 0;
        let allTimeCount = 0;

        if (isRedisAvailable()) {
            try {
                const dailyKey = getDailyKey();
                dailyCount = await redisClient.zCard(dailyKey);
            } catch (e) { /* ignore */ }
        }

        try {
            // Count unique players instead of total scores
            const allTimeResult = await pgPool.query('SELECT COUNT(DISTINCT COALESCE(player_id, id::text)) as count FROM scores');
            allTimeCount = parseInt(allTimeResult.rows[0].count);
        } catch (e) { /* ignore */ }

        res.json({
            success: true,
            dailyPlayers: dailyCount,
            totalPlayers: allTimeCount
        });
    } catch (err) {
        console.error('Error fetching stats:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch stats' });
    }
});


/**
 * POST /api/admin/validate
 * Validates admin code against environment variable
 * Body: { code: string }
 */
app.post('/api/admin/validate', (req, res) => {
    const { code } = req.body;
    const adminCode = process.env.ADMIN_CODE || '10DINIRU.';
    
    if (code === adminCode) {
        res.json({ valid: true });
    } else {
        res.json({ valid: false });
    }
});

/**
 * GET /api/admin/scores
 * Returns all scores for admin management
 * Query: { code: string }
 */
app.get('/api/admin/scores', async (req, res) => {
    const { code } = req.query;
    const adminCode = process.env.ADMIN_CODE || '10DINIRU.';
    
    if (code !== adminCode) {
        return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
    
    try {
        const result = await pgPool.query(`
            SELECT id, username, discord, score, player_id, ip_hash, is_flagged, created_at
            FROM scores
            ORDER BY score DESC
            LIMIT 100
        `);
        
        res.json({ success: true, scores: result.rows });
    } catch (err) {
        console.error('Error fetching admin scores:', err.message);
        res.status(500).json({ success: false, error: 'Failed to fetch scores' });
    }
});

/**
 * DELETE /api/admin/score/:id
 * Deletes a score from the database
 * Body: { code: string }
 */
app.delete('/api/admin/score/:id', async (req, res) => {
    const { code } = req.body;
    const adminCode = process.env.ADMIN_CODE || '10DINIRU.';
    const scoreId = parseInt(req.params.id);
    
    if (code !== adminCode) {
        return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
    
    if (isNaN(scoreId)) {
        return res.status(400).json({ success: false, error: 'Invalid score ID' });
    }
    
    try {
        const scoreResult = await pgPool.query(
            'SELECT username, discord FROM scores WHERE id = $1',
            [scoreId]
        );
        
        if (scoreResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Score not found' });
        }
        
        const { username, discord } = scoreResult.rows[0];
        
        await pgPool.query('DELETE FROM scores WHERE id = $1', [scoreId]);
        
        // Try to remove from Redis daily leaderboard too
        if (isRedisAvailable()) {
            try {
                const dailyKey = getDailyKey();
                const memberKey = `${username}::${discord || ''}`;
                await redisClient.zRem(dailyKey, memberKey);
            } catch (redisErr) {
                console.error('Redis delete error:', redisErr.message);
            }
        }
        
        res.json({ success: true, message: 'Score deleted successfully' });
    } catch (err) {
        console.error('Error deleting score:', err.message);
        res.status(500).json({ success: false, error: 'Failed to delete score' });
    }
});

/**
 * DELETE /api/admin/scores/clear-daily
 * Clears all daily scores from Redis
 * Body: { code: string }
 */
app.delete('/api/admin/scores/clear-daily', async (req, res) => {
    const { code } = req.body;
    const adminCode = process.env.ADMIN_CODE || '10DINIRU.';
    
    if (code !== adminCode) {
        return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
    
    // Try to connect to Redis
    if (!isRedisAvailable()) {
        await ensureRedisConnection();
    }
    
    if (!isRedisAvailable()) {
        return res.status(503).json({ success: false, error: 'Redis not connected' });
    }
    
    try {
        const dailyKey = getDailyKey();
        await redisClient.del(dailyKey);
        res.json({ success: true, message: 'Daily leaderboard cleared' });
    } catch (err) {
        console.error('Error clearing daily scores:', err.message);
        res.status(500).json({ success: false, error: 'Failed to clear daily scores' });
    }
});

/**
 * POST /api/flag
 * Reports suspicious activity
 * Body: { reason: string }
 */
app.post('/api/flag', async (req, res) => {
    try {
        const { reason } = req.body;
        const ipHash = getIpHash(req);
        
        if (!reason || typeof reason !== 'string') {
            return res.status(400).json({ success: false, error: 'Reason is required' });
        }
        
        const cleanReason = reason.trim().substring(0, 100);
        
        await pgPool.query(
            'INSERT INTO flags (ip_hash, reason) VALUES ($1, $2)',
            [ipHash, cleanReason]
        );
        
        console.log(`⚠ Flagged IP ${ipHash} for: ${cleanReason}`);
        
        res.json({ success: true, message: 'Flag recorded' });
    } catch (err) {
        console.error('Error recording flag:', err.message);
        res.status(500).json({ success: false, error: 'Failed to record flag' });
    }
});

/**
 * GET /api/admin/flags
 * Returns all flagged players with their associated scores
 * Query: { code: string }
 */
app.get('/api/admin/flags', async (req, res) => {
    const { code } = req.query;
    const adminCode = process.env.ADMIN_CODE || '10DINIRU.';
    
    if (code !== adminCode) {
        return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
    
    try {
        const flagsResult = await pgPool.query(`
            SELECT ip_hash, reason, timestamp
            FROM flags
            ORDER BY timestamp DESC
            LIMIT 200
        `);
        
        const flaggedIps = [...new Set(flagsResult.rows.map(f => f.ip_hash))];
        
        let associatedScores = [];
        if (flaggedIps.length > 0) {
            const scoresResult = await pgPool.query(`
                SELECT id, username, discord, score, player_id, ip_hash, created_at
                FROM scores
                WHERE ip_hash = ANY($1)
                ORDER BY score DESC
            `, [flaggedIps]);
            associatedScores = scoresResult.rows;
        }
        
        const flagsByIp = {};
        flagsResult.rows.forEach(flag => {
            if (!flagsByIp[flag.ip_hash]) {
                flagsByIp[flag.ip_hash] = {
                    ip_hash: flag.ip_hash,
                    flags: [],
                    scores: []
                };
            }
            flagsByIp[flag.ip_hash].flags.push({
                reason: flag.reason,
                timestamp: flag.timestamp
            });
        });
        
        associatedScores.forEach(score => {
            if (flagsByIp[score.ip_hash]) {
                flagsByIp[score.ip_hash].scores.push(score);
            }
        });
        
        res.json({ 
            success: true, 
            flaggedPlayers: Object.values(flagsByIp)
        });
    } catch (err) {
        console.error('Error fetching flags:', err.message);
        res.status(500).json({ success: false, error: 'Failed to fetch flags' });
    }
});

/**
 * DELETE /api/admin/flag/:ipHash
 * Removes all flags for a specific IP hash
 * Body: { code: string }
 */
app.delete('/api/admin/flag/:ipHash', async (req, res) => {
    const { code } = req.body;
    const adminCode = process.env.ADMIN_CODE || '10DINIRU.';
    const ipHash = req.params.ipHash;
    
    if (code !== adminCode) {
        return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
    
    try {
        await pgPool.query('DELETE FROM flags WHERE ip_hash = $1', [ipHash]);
        await pgPool.query('UPDATE scores SET is_flagged = FALSE WHERE ip_hash = $1', [ipHash]);
        
        res.json({ success: true, message: 'Flags cleared for IP' });
    } catch (err) {
        console.error('Error clearing flags:', err.message);
        res.status(500).json({ success: false, error: 'Failed to clear flags' });
    }
});


/**
 * GET /api/user/profile
 * Returns user profile based on player_id (UUID from localStorage)
 * Query: { playerId: string }
 */
app.get('/api/user/profile', async (req, res) => {
    try {
        const { playerId } = req.query;
        
        if (!playerId) {
            return res.json({ success: true, profile: null });
        }
        
        const cleanPlayerId = playerId.trim().substring(0, 50);
        
        // Check Redis for cached profile
        let profile = null;
        
        if (isRedisAvailable()) {
            try {
                const cached = await redisClient.get(`profile:${cleanPlayerId}`);
                if (cached) {
                    profile = JSON.parse(cached);
                }
            } catch (e) { /* ignore */ }
        }
        
        // If no cached profile, check player_profiles table
        if (!profile) {
            try {
                const result = await pgPool.query(
                    'SELECT username, discord FROM player_profiles WHERE player_id = $1',
                    [cleanPlayerId]
                );
                
                if (result.rows.length > 0) {
                    profile = {
                        username: result.rows[0].username,
                        discord: result.rows[0].discord || ''
                    };
                }
            } catch (e) { /* ignore */ }
        }
        
        // If still no profile, try to get from scores
        if (!profile) {
            try {
                const result = await pgPool.query(
                    'SELECT username, discord, MAX(score) as best_score FROM scores WHERE player_id = $1 GROUP BY username, discord ORDER BY MAX(created_at) DESC LIMIT 1',
                    [cleanPlayerId]
                );
                
                if (result.rows.length > 0) {
                    profile = {
                        username: result.rows[0].username,
                        discord: result.rows[0].discord || '',
                        bestScore: result.rows[0].best_score
                    };
                }
            } catch (e) { /* ignore */ }
        }
        
        res.json({ 
            success: true, 
            profile: profile || null,
            playerId: cleanPlayerId
        });
    } catch (err) {
        console.error('Error fetching user profile:', err.message);
        res.json({ success: true, profile: null });
    }
});

/**
 * POST /api/user/profile
 * Saves user profile based on player_id
 * Body: { playerId: string, username: string, discord: string }
 */
app.post('/api/user/profile', async (req, res) => {
    try {
        const { playerId, username, discord } = req.body;
        
        if (!playerId) {
            return res.status(400).json({ success: false, error: 'Player ID is required' });
        }
        
        const cleanPlayerId = playerId.trim().substring(0, 50);
        const cleanUsername = (username || '').trim().substring(0, 50);
        const cleanDiscord = (discord || '').trim().substring(0, 100);
        
        // Upsert into player_profiles table
        try {
            await pgPool.query(`
                INSERT INTO player_profiles (player_id, username, discord, updated_at)
                VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
                ON CONFLICT (player_id) 
                DO UPDATE SET username = $2, discord = $3, updated_at = CURRENT_TIMESTAMP
            `, [cleanPlayerId, cleanUsername, cleanDiscord]);
        } catch (e) {
            console.error('Error saving to player_profiles:', e.message);
        }
        
        const profile = {
            username: cleanUsername,
            discord: cleanDiscord,
            lastUpdated: new Date().toISOString()
        };
        
        // Cache in Redis for 30 days
        if (isRedisAvailable()) {
            try {
                await redisClient.set(`profile:${cleanPlayerId}`, JSON.stringify(profile), {
                    EX: 30 * 24 * 60 * 60 // 30 days
                });
            } catch (e) { 
                console.error('Redis profile save error:', e.message);
            }
        }
        
        res.json({ success: true, message: 'Profile saved' });
    } catch (err) {
        console.error('Error saving user profile:', err.message);
        res.status(500).json({ success: false, error: 'Failed to save profile' });
    }
});

/**
 * GET /api/user/best-score
 * Returns the best score for a given player_id or username
 * Query: { playerId: string } or { username: string }
 */
app.get('/api/user/best-score', async (req, res) => {
    try {
        const { playerId, username } = req.query;
        
        let bestScore = null;
        
        if (playerId) {
            const result = await pgPool.query(
                'SELECT MAX(score) as best_score FROM scores WHERE player_id = $1',
                [playerId.trim()]
            );
            bestScore = result.rows[0]?.best_score || null;
        } else if (username) {
            const result = await pgPool.query(
                'SELECT MAX(score) as best_score FROM scores WHERE username = $1',
                [username.trim()]
            );
            bestScore = result.rows[0]?.best_score || null;
        }
        
        res.json({ success: true, bestScore });
    } catch (err) {
        console.error('Error fetching best score:', err.message);
        res.json({ success: true, bestScore: null });
    }
});

// Start server
async function startServer() {
    let redisConnected = false;
    let pgConnected = false;

    // Try to connect to Redis (non-blocking, will reconnect on demand)
    redisConnected = await ensureRedisConnection();

    // Initialize PostgreSQL table
    try {
        await initDatabase();
        pgConnected = true;
    } catch (err) {
        console.error('⚠ Failed to connect to PostgreSQL (All-Time Leaderboard disabled):', err.message);
    }

    // Start Express server with port fallback
    const tryPort = (port) => {
        const server = app.listen(port, () => {
            console.log(`\n🎮 Rhythm Dodger Server running at http://localhost:${port}`);
            console.log(`   Status: ${redisConnected && pgConnected ? 'ONLINE' : 'PARTIAL/OFFLINE'}`);
            console.log(`   - Redis: ${redisConnected ? 'Connected' : 'Disconnected'}`);
            console.log(`   - Postgres: ${pgConnected ? 'Connected' : 'Disconnected'}\n`);

            console.log(`   API Endpoints:`);
            console.log(`   - GET  /api/leaderboard/daily`);
            console.log(`   - GET  /api/leaderboard/all-time`);
            console.log(`   - POST /api/score`);
            console.log(`   - GET  /api/stats`);
            console.log(`   - POST /api/admin/validate\n`);
        });
        
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.log(`⚠ Port ${port} is in use, trying port ${port + 1}...`);
                tryPort(port + 1);
            } else {
                console.error('Server error:', err);
            }
        });
    };
    
    tryPort(PORT);
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    if (isRedisAvailable()) {
        try {
            await redisClient.quit();
        } catch (e) { /* ignore */ }
    }
    await pgPool.end();
    process.exit(0);
});

startServer();
