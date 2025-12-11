// church-library-app/utils/generate_hashes.js
const crypto = require('crypto');

// --- Inputs ---
const adminPin = '1366';
const lib1Pin = '1234'; 
// ---------------

/**
 * Replicates the generateSalt function using Node.js crypto
 */
function generateSalt(length = 16) {
  // 16 bytes = 32 hex characters
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Replicates the hashPin function using Node.js crypto (SHA-256)
 */
function hashPin(pin, salt) {
  const input = `${salt}:${pin}`;

  const hash = crypto.createHash('sha256')
                     .update(input)
                     .digest('hex');

  return hash;
}

// --- Generator Function ---
function generateHashPair(pin, username) {
  // 1. Generate a new, random salt
  const salt = generateSalt();

  // 2. Hash the PIN using the generated salt
  const hash = hashPin(pin, salt);

  console.log(`\n--- ${username} Data ---`);
  console.log(`PIN: ${pin}`);
  console.log(`SALT: ${salt}`);
  console.log(`HASH: ${hash}`);
  console.log('------------------------');
  return { salt, hash };
}

// --- Run the Generator ---
function runGenerator() {
  generateHashPair(adminPin, 'DiguwaSoft');
  generateHashPair(lib1Pin, 'lib1');
}

runGenerator();