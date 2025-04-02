/**
 * API Key Generator Utility
 * Handles generation, tracking, and cooldown of API keys.
 */

// Track API key regeneration timestamps per user and key type
const lastKeyRegeneration = {};

/**
 * Generates a random API key
 * Creates a 30-character random string using alphanumeric characters
 */
function generateApiKey() {
    return [...Array(30)].map(() => Math.random().toString(36)[2]).join("");
}

/**
 * Checks if a user is on cooldown for API key regeneration
 * Enforces a 5-minute cooldown period between key generations
 */
function checkCooldown(userId, keyType) {
    const cooldownPeriod = 5 * 60 * 1000; // 5 minutes in milliseconds
    const userKeyId = `${userId}_${keyType}`;
    const now = Date.now();
    
    // Check if user has recently generated this type of key
    if (lastKeyRegeneration[userKeyId] && (now - lastKeyRegeneration[userKeyId]) < cooldownPeriod) {
        // Calculate remaining cooldown time
        const timeRemaining = Math.ceil((lastKeyRegeneration[userKeyId] + cooldownPeriod - now) / 1000);
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        
        // Format user-friendly wait message
        let waitMessage = "";
        if (minutes > 0) {
            waitMessage = `${minutes} minute${minutes > 1 ? 's' : ''}`;
            if (seconds > 0) {
                waitMessage += ` and ${seconds} second${seconds > 1 ? 's' : ''}`;
            }
        } else {
            waitMessage = `${seconds} second${seconds > 1 ? 's' : ''}`;
        }
        
        return { 
            onCooldown: true, 
            message: `Please wait ${waitMessage} before generating a new ${keyType} API key`,
            timeRemaining
        };
    }
    
    return { onCooldown: false };
}

/**
 * Records timestamp when a user generates a new API key
 * Used to enforce cooldown periods
 */
function updateCooldown(userId, keyType) {
    const userKeyId = `${userId}_${keyType}`;
    lastKeyRegeneration[userKeyId] = Date.now();
}

module.exports = {
    generateApiKey,
    checkCooldown,
    updateCooldown
}; 