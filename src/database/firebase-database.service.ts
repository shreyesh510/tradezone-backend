import { Injectable } from '@nestjs/common';
import { FirebaseConfig } from '../config/firebase.config';
import * as admin from 'firebase-admin';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  receiverId?: string;
  roomId?: string;
  createdAt: Date;
  updatedAt: Date;
  readAt?: Date;
  messageType?: 'text' | 'image' | 'file' | 'system';
}

@Injectable()
export class FirebaseDatabaseService {
  private firestore: admin.firestore.Firestore;
  private usersCollection = 'users';
  private chatsCollection = 'chats';

  constructor(private firebaseConfig: FirebaseConfig) {
    // Firestore will be initialized in onModuleInit
  }

  private getFirestore() {
    return this.firebaseConfig.getFirestore();
  }

  // User operations
  async getUsers(): Promise<User[]> {
    try {
      const snapshot = await this.getFirestore().collection(this.usersCollection).get();
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as User[];
    } catch (error) {
      console.error('Error getting users:', error);
      return [];
    }
  }

  async findUserByEmail(email: string): Promise<User | null> {
    try {
      const snapshot = await this.getFirestore()
        .collection(this.usersCollection)
        .where('email', '==', email)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      } as User;
    } catch (error) {
      console.error('Error finding user by email:', error);
      return null;
    }
  }

  async createUser(userData: Omit<User, 'id'>): Promise<User> {
    try {
      const docRef = await this.getFirestore().collection(this.usersCollection).add({
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      return {
        id: docRef.id,
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(userId: string, userData: Partial<User>): Promise<void> {
    try {
      await this.getFirestore()
        .collection(this.usersCollection)
        .doc(userId)
        .update({
          ...userData,
          updatedAt: new Date()
        });
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  async deleteUser(userId: string): Promise<void> {
    try {
      await this.getFirestore()
        .collection(this.usersCollection)
        .doc(userId)
        .delete();
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  // Chat operations
  async getChats(): Promise<ChatMessage[]> {
    console.log('🔥 Getting chats from Firebase collection:', this.chatsCollection);
    try {
      const snapshot = await this.getFirestore().collection(this.chatsCollection).get();
      console.log('🔥 Firebase snapshot size:', snapshot.size);
      const chats = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatMessage[];
      console.log('🔥 Retrieved chats:', chats);
      return chats;
    } catch (error) {
      console.error('❌ Error getting chats from Firebase:', error);
      return [];
    }
  }

  async addChat(chatData: Omit<ChatMessage, 'id'>): Promise<ChatMessage> {
    console.log('🔥 Adding chat to Firebase:', chatData);
    try {
      // Filter out undefined values to avoid Firestore errors
      const cleanData = Object.fromEntries(
        Object.entries(chatData).filter(([_, value]) => value !== undefined)
      );

      const docRef = await this.getFirestore().collection(this.chatsCollection).add({
        ...cleanData,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const savedChat = {
        id: docRef.id,
        ...chatData,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      console.log('✅ Chat added to Firebase with ID:', docRef.id);
      return savedChat;
    } catch (error) {
      console.error('❌ Error adding chat to Firebase:', error);
      throw error;
    }
  }

  async findChatsByUserId(userId: string): Promise<ChatMessage[]> {
    try {
      const snapshot = await this.getFirestore()
        .collection(this.chatsCollection)
        .where('senderId', '==', userId)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatMessage[];
    } catch (error) {
      console.error('Error finding chats by user ID:', error);
      return [];
    }
  }

  async deleteChat(chatId: string): Promise<void> {
    try {
      await this.getFirestore()
        .collection(this.chatsCollection)
        .doc(chatId)
        .delete();
    } catch (error) {
      console.error('Error deleting chat:', error);
      throw error;
    }
  }

  async updateChat(chatId: string, updateData: Partial<ChatMessage>): Promise<void> {
    try {
      // Filter out undefined values to avoid Firestore errors
      const cleanData = Object.fromEntries(
        Object.entries(updateData).filter(([_, value]) => value !== undefined)
      );

      await this.getFirestore()
        .collection(this.chatsCollection)
        .doc(chatId)
        .update({
          ...cleanData,
          updatedAt: new Date()
        });
    } catch (error) {
      console.error('Error updating chat:', error);
      throw error;
    }
  }

  // Initialize with sample data
  async initializeSampleData(): Promise<void> {
    try {
      const usersSnapshot = await this.getFirestore().collection(this.usersCollection).get();
      
      if (usersSnapshot.empty) {
        console.log('📝 Initializing sample users...');
        
        const sampleUsers = [
          {
            name: 'vivekkolhe',
            email: 'vivekkolhe@gmail.com',
            password: 'Vivek@123',
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            name: 'shreyashkolhe',
            email: 'shreyashkolhe@gmail.com',
            password: 'shreyash@123',
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            name: 'testuser',
            email: 'test@gmail.com',
            password: 'test@123',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ];

        for (const user of sampleUsers) {
          await this.createUser(user);
        }
        
        console.log('✅ Sample users initialized successfully');
      }
    } catch (error) {
      console.error('Error initializing sample data:', error);
    }
  }
}
