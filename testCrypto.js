const crypto = require('crypto');
const { encryptPasswordForOwner, decryptPasswordForOwner, DEFAULT_MASTER_KEY } = require('./cryptoUtils');

console.log('--- Testing Password Encryption & Decryption ---');

const testCases = [
  'kemBangapi2025#SecretUser!',
  'SimplePass123',
  'P@$$w0rd_With_Sp€c!al_Ch@rs_🚀',
  'A very long passphrase with lots of spaces and symbols: !@#$%^&*()_+~|}{[]:;?><,./-='
];

let allPassed = true;

testCases.forEach((password, idx) => {
  const encrypted = encryptPasswordForOwner(password);
  const decrypted = decryptPasswordForOwner(encrypted);
  const isMatch = decrypted === password;
  console.log(`Test ${idx + 1}: [${isMatch ? 'PASSED' : 'FAILED'}]`);
  console.log(`  Raw:       ${password}`);
  console.log(`  Encrypted: ${encrypted}`);
  console.log(`  Decrypted: ${decrypted}\n`);
  if (!isMatch) allPassed = false;
});

// Test with non-encrypted string fallback
const fallback = decryptPasswordForOwner('plainTextPassword');
console.log('Fallback Non-ENC Check:', fallback === 'plainTextPassword' ? 'PASSED' : 'FAILED');
if (fallback !== 'plainTextPassword') allPassed = false;

if (allPassed) {
  console.log('✅ All Encryption & Decryption Tests Passed Successfully!');
} else {
  console.error('❌ Some tests failed.');
  process.exit(1);
}

