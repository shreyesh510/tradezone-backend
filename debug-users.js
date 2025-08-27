const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
const serviceAccountPath = path.join(__dirname, 'tradeinzone-1a8b1-firebase-adminsdk-fbsvc-ad8db35560.json');

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath),
    projectId: 'tradeinzone-1a8b1',
    databaseURL: 'https://tradeinzone-1a8b1-default-rtdb.firebaseio.com',
  });

  console.log('🔥 Firebase Admin SDK initialized successfully');

  const db = admin.firestore();

  // Debug function to check users
  async function debugUsers() {
    try {
      console.log('📝 Checking users in Firebase database...');
      
      const usersSnapshot = await db.collection('users').get();
      console.log(`✅ Found ${usersSnapshot.size} users in database`);
      
      if (usersSnapshot.empty) {
        console.log('📝 No users found in database');
        console.log('💡 You need to register a user first');
      } else {
        console.log('\n👥 All users in database:');
        usersSnapshot.forEach(doc => {
          const userData = doc.data();
          console.log(`\n📋 User ID: ${doc.id}`);
          console.log(`   Name: ${userData.name}`);
          console.log(`   Email: ${userData.email}`);
          console.log(`   Password: ${userData.password}`);
          console.log(`   Created: ${userData.createdAt}`);
        });
      }

      // Check specifically for test@gmail.com
      console.log('\n🔍 Looking for test@gmail.com specifically...');
      const testUserSnapshot = await db.collection('users')
        .where('email', '==', 'test@gmail.com')
        .limit(1)
        .get();

      if (testUserSnapshot.empty) {
        console.log('❌ User test@gmail.com not found in database');
        console.log('💡 You need to register this user first or use different credentials');
      } else {
        const testUser = testUserSnapshot.docs[0].data();
        console.log('✅ Found test@gmail.com user:');
        console.log(`   Name: ${testUser.name}`);
        console.log(`   Email: ${testUser.email}`);
        console.log(`   Password: ${testUser.password}`);
        console.log(`   Expected password: test@123`);
        console.log(`   Password match: ${testUser.password === 'test@123'}`);
      }
      
      console.log('\n✅ Debug completed successfully');
    } catch (error) {
      console.error('❌ Debug failed:', error);
    }
  }

  debugUsers();

} catch (error) {
  console.error('❌ Error initializing Firebase:', error);
}
