import * as admin from 'firebase-admin';
import { Injectable, OnModuleInit } from '@nestjs/common';
import * as path from 'path';

@Injectable()
export class FirebaseConfig implements OnModuleInit {
  private firebaseApp: admin.app.App;

  async onModuleInit() {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    try {
      // Check if Firebase is already initialized
      const apps = admin.apps;
      if (apps.length > 0 && apps[0]) {
        console.log('🔥 Firebase Admin SDK already initialized, reusing existing app');
        this.firebaseApp = apps[0];
        return;
      }

      let credential;
      
      // Check if we're in production (Render) and have environment variables
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        console.log('🔥 Using Firebase credentials from environment variables');
        console.log('📝 Environment variable length:', process.env.FIREBASE_SERVICE_ACCOUNT.length);
        console.log('📝 Environment variable preview:', process.env.FIREBASE_SERVICE_ACCOUNT.substring(0, 100) + '...');
        
        try {
          const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
          
          // Fix the private key by replacing literal \n with actual newlines
          if (serviceAccount.private_key) {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
            console.log('🔧 Fixed private key formatting');
          }
          
          // Validate the private key format
          if (!serviceAccount.private_key.includes('-----BEGIN PRIVATE KEY-----')) {
            throw new Error('Invalid private key format');
          }
          
          credential = admin.credential.cert(serviceAccount);
          console.log('✅ Firebase credentials loaded successfully from environment');
        } catch (envError) {
          console.error('❌ Error parsing environment credentials:', envError);
          console.log('🔄 Falling back to local file...');
          
          // Fallback to local file if environment variable fails
          const serviceAccountPath = path.join(
            process.cwd(),
            'tradeinzone-1a8b1-firebase-adminsdk-fbsvc-ad8db35560.json'
          );
          credential = admin.credential.cert(serviceAccountPath);
        }
      } else {
        // Fallback to local file for development
        console.log('🔥 Using Firebase credentials from local file');
        const serviceAccountPath = path.join(
          process.cwd(),
          'tradeinzone-1a8b1-firebase-adminsdk-fbsvc-ad8db35560.json'
        );
        credential = admin.credential.cert(serviceAccountPath);
      }

      // Initialize Firebase Admin SDK
      this.firebaseApp = admin.initializeApp({
        credential,
        projectId: 'tradeinzone-1a8b1',
        databaseURL: 'https://tradeinzone-1a8b1-default-rtdb.firebaseio.com',
      });

      console.log('🔥 Firebase Admin SDK initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing Firebase:', error);
      throw error;
    }
  }

  public getFirestore() {
    if (!this.firebaseApp) {
      throw new Error('Firebase not initialized');
    }
    return admin.firestore(this.firebaseApp);
  }

  public getAuth() {
    if (!this.firebaseApp) {
      throw new Error('Firebase not initialized');
    }
    return admin.auth(this.firebaseApp);
  }

  public getDatabase() {
    if (!this.firebaseApp) {
      throw new Error('Firebase not initialized');
    }
    return admin.database(this.firebaseApp);
  }
}
