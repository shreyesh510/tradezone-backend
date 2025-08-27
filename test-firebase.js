const admin = require('firebase-admin');
const path = require('path');

            // Initialize Firebase Admin SDK
            const serviceAccountPath = path.join(__dirname, 'myservice.json');

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath),
    databaseURL: 'https://walletiq-9ea16-default-rtdb.firebaseio.com',
  });

  console.log('🔥 Firebase Admin SDK initialized successfully');

  const db = admin.firestore();

  // Test connection by reading from users collection
  async function testFirebase() {
    try {
      console.log('📝 Testing Firebase connection...');
      
      const usersSnapshot = await db.collection('users').get();
      console.log(`✅ Found ${usersSnapshot.size} users in database`);
      
      if (usersSnapshot.empty) {
        console.log('📝 No users found, this is expected for first run');
      } else {
        usersSnapshot.forEach(doc => {
          console.log(`👤 User: ${doc.data().name} (${doc.data().email})`);
        });
      }
      
      console.log('✅ Firebase test completed successfully');
    } catch (error) {
      console.error('❌ Firebase test failed:', error);
    }
  }

  testFirebase();

} catch (error) {
  console.error('❌ Error initializing Firebase:', error);
}
