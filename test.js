const app = require('./app');
const db = require('./db');
const http = require('http');

let server;
const PORT = 4002;
const BASE_URL = `http://localhost:${PORT}/api`;

const startServer = () => {
  return new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(PORT, resolve);
  });
};

const stopServer = () => {
  return new Promise((resolve) => {
    server.close(resolve);
  });
};

const runTests = async () => {
  console.log('--- Starting Pure Supabase & Bcrypt Integration Tests ---');
  await db.initDb();
  await startServer();
  console.log(`Test server running on ${BASE_URL}`);

  let adminCookies = '';
  let artistCookies = '';

  try {
    // 1. Verify Supabase connection & check users table
    console.log('\nChecking Supabase Users table...');
    const users = await db.query('SELECT * FROM users');
    console.log('Registered Users in Supabase:', users.map(u => ({ name: u.artist_name, email: u.email, role: u.role })));

    // 2. Test Illegal Actions & Unauthorized Access
    console.log('\nTesting Security & Authorization Guards...');

    // 2a. Unauthenticated POST artwork
    const unauthPostRes = await fetch(`${BASE_URL}/artworks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Unauth Art', art_type: 'Digital Art', media_url: 'https://example.com/art.jpg' })
    });
    console.log('Unauthenticated Artwork Upload Status (Expected 401):', unauthPostRes.status);
    if (unauthPostRes.status !== 401) {
      throw new Error('Allowed unauthenticated user to create artwork!');
    }

    // 2b. Unauthenticated Admin endpoint access
    const unauthAdminRes = await fetch(`${BASE_URL}/admin/artists`);
    console.log('Unauthenticated Admin Access Status (Expected 401):', unauthAdminRes.status);
    if (unauthAdminRes.status !== 401) {
      throw new Error('Allowed unauthenticated access to admin portal!');
    }

    // 2c. Test Duplicate Username / Artist Name Check on Signup
    console.log('\nTesting Duplicate Username / Artist Name Rejection on Signup...');
    const dupNameRes = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        artist_name: 'Agastya Mahatma', // Already registered
        email: 'new_unique_email@museum.id',
        password: 'Password123#'
      })
    });
    const dupNameData = await dupNameRes.json();
    console.log('Duplicate Name Signup Status (Expected 409):', dupNameRes.status, 'Error:', dupNameData.error);
    if (dupNameRes.status !== 409 || !dupNameData.error.toLowerCase().includes('name')) {
      throw new Error('Allowed duplicate artist name / username registration!');
    }

    // 2d. Test Duplicate Email Rejection on Signup
    console.log('\nTesting Duplicate Email Rejection on Signup...');
    const dupEmailRes = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        artist_name: 'Brand New Unique Artist',
        email: 'agastyamahatma@gmail.com', // Already registered
        password: 'Password123#'
      })
    });
    const dupEmailData = await dupEmailRes.json();
    console.log('Duplicate Email Signup Status (Expected 409):', dupEmailRes.status, 'Error:', dupEmailData.error);
    if (dupEmailRes.status !== 409 || !dupEmailData.error.toLowerCase().includes('email')) {
      throw new Error('Allowed duplicate email registration!');
    }

    // 2e. Test Successful Signup of Unique Account
    console.log('\nTesting Unique Account Registration...');
    const uniqueTestName = `Artist_${Date.now()}`;
    const uniqueTestEmail = `artist_${Date.now()}@museum.id`;
    const uniqueSignupRes = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        artist_name: uniqueTestName,
        email: uniqueTestEmail,
        password: 'TardisPassword2025#'
      })
    });
    const uniqueSignupData = await uniqueSignupRes.json();
    console.log('Unique Account Signup Status (Expected 201):', uniqueSignupRes.status, 'User:', uniqueSignupData.user?.artist_name);
    if (uniqueSignupRes.status !== 201 || uniqueSignupData.user?.artist_name !== uniqueTestName) {
      throw new Error('Failed to register unique account!');
    }

    // 3. Test Admin Login with Bcrypt (Agastya Mahatma / kemBangapi2025#)
    console.log('\nTesting Login with Bcrypt for Admin (Agastya Mahatma)...');
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'agastyamahatma@gmail.com',
        password: 'kemBangapi2025#',
        rememberMe: true
      })
    });
    const adminLoginData = await adminLoginRes.json();
    console.log('Admin Login Status:', adminLoginRes.status, 'User:', adminLoginData.user?.artist_name, 'Role:', adminLoginData.user?.role);
    if (adminLoginRes.status !== 200 || adminLoginData.user?.role !== 'admin') {
      throw new Error('Admin login failed or role is not admin');
    }
    adminCookies = adminLoginRes.headers.get('set-cookie') || '';

    // 4. Test Artist Login (John Smith)
    console.log('\nTesting Login for standard Artist (John Smith)...');
    const artistLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'john.smith@museum.id',
        password: 'kemBangapi2025#',
        rememberMe: false
      })
    });
    const artistLoginData = await artistLoginRes.json();
    console.log('Artist Login Status:', artistLoginRes.status, 'User:', artistLoginData.user?.artist_name);
    if (artistLoginRes.status !== 200) {
      throw new Error('Artist login failed');
    }
    artistCookies = artistLoginRes.headers.get('set-cookie') || '';

    // 5. Test Non-Admin Illegal Access to Admin Portal
    console.log('\nTesting Non-Admin Illegal Access to Admin Portal...');
    const illegalAdminRes = await fetch(`${BASE_URL}/admin/artists`, {
      headers: { 'Cookie': artistCookies }
    });
    console.log('Artist Access to Admin Portal Status (Expected 403):', illegalAdminRes.status);
    if (illegalAdminRes.status !== 403) {
      throw new Error('Allowed standard artist access to admin portal!');
    }

    // 6. Test Admin Access to Admin Portal
    console.log('\nTesting Admin Access to Admin Portal...');
    const legalAdminRes = await fetch(`${BASE_URL}/admin/artists`, {
      headers: { 'Cookie': adminCookies }
    });
    console.log('Admin Access to Admin Portal Status (Expected 200):', legalAdminRes.status);
    if (legalAdminRes.status !== 200) {
      throw new Error('Admin was denied access to admin portal!');
    }

    // 7. Test Artwork Creation with Description
    console.log('\nTesting Artwork Creation in Supabase...');
    const createRes = await fetch(`${BASE_URL}/artworks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': artistCookies },
      body: JSON.stringify({
        title: 'Cosmic Nebula',
        art_type: 'Digital Art',
        description: 'An expansive interstellar landscape featuring vibrant pink and blue star clusters.',
        media_url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=800'
      })
    });
    const createData = await createRes.json();
    console.log('Create Artwork Status (Expected 201):', createRes.status);
    if (createRes.status !== 201 || !createData.artwork?.description) {
      throw new Error('Failed to create artwork in Supabase');
    }
    const newArtId = createData.artwork.id;
    console.log('Created Artwork ID:', newArtId, 'Description:', createData.artwork.description);

    // 8. Test Device-Locked Unlike Toggling
    console.log('\nTesting Device-Locked Unlike Toggling...');
    const testDeviceFingerprint = 'fp_test_device_unlike_99999';

    // 1st request: Like artwork
    const likeRes1 = await fetch(`${BASE_URL}/artworks/${newArtId}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_fingerprint: testDeviceFingerprint })
    });
    const likeData1 = await likeRes1.json();
    console.log('1st Like (Like ON) Status:', likeRes1.status, 'Response:', likeData1);
    if (likeRes1.status !== 200 || !likeData1.liked || likeData1.likes_count !== 1) {
      throw new Error('1st like toggle failed');
    }

    // 2nd request: Unlike artwork (Toggle OFF)
    const likeRes2 = await fetch(`${BASE_URL}/artworks/${newArtId}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_fingerprint: testDeviceFingerprint })
    });
    const likeData2 = await likeRes2.json();
    console.log('2nd Like (Unlike OFF) Status:', likeRes2.status, 'Response:', likeData2);
    if (likeRes2.status !== 200 || likeData2.liked || likeData2.likes_count !== 0) {
      throw new Error('2nd like (unlike toggle) failed');
    }

    // 3rd request: Like artwork again (Toggle ON)
    const likeRes3 = await fetch(`${BASE_URL}/artworks/${newArtId}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_fingerprint: testDeviceFingerprint })
    });
    const likeData3 = await likeRes3.json();
    console.log('3rd Like (Like ON) Status:', likeRes3.status, 'Response:', likeData3);
    if (likeRes3.status !== 200 || !likeData3.liked || likeData3.likes_count !== 1) {
      throw new Error('3rd like toggle failed');
    }

    // 9. Test Owner Deletion of Artwork
    console.log('\nTesting Owner Deletion of Artwork...');
    const ownerDeleteRes = await fetch(`${BASE_URL}/artworks/${newArtId}`, {
      method: 'DELETE',
      headers: { 'Cookie': artistCookies }
    });
    console.log('Owner Delete Status (Expected 200):', ownerDeleteRes.status);
    if (ownerDeleteRes.status !== 200) {
      throw new Error('Owner failed to delete artwork!');
    }

    console.log('\n--- All Supabase & Bcrypt Integration Tests Passed Successfully! ---');
  } catch (error) {
    console.error('\n❌ Test Failure:', error.message);
    process.exitCode = 1;
  } finally {
    await stopServer();
    process.exit();
  }
};

runTests();
