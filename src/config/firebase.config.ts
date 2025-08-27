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

      // Path to your new service account key file
      const serviceAccountPath = path.join(
        process.cwd(),
        'tradeinzone-1a8b1-firebase-adminsdk- fbsvc-ad8db35560.json'
      );

      // Initialize Firebase Admin SDK
      this.firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccountPath),
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
