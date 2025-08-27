import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class DatabaseService {
  private readonly usersPath = path.join(__dirname, 'users.json');
  private readonly chatsPath = path.join(__dirname, 'chats.json');

  // Users operations
  async getUsers(): Promise<any[]> {
    try {
      console.log('📁 DatabaseService: Reading users from:', this.usersPath);
      const data = await fs.promises.readFile(this.usersPath, 'utf8');
      console.log('📄 DatabaseService: Raw data:', data);
      const users = JSON.parse(data);
      console.log('👥 DatabaseService: Parsed users:', users);
      return users;
    } catch (error) {
      console.error('❌ DatabaseService: Error reading users:', error);
      // If file doesn't exist or is empty, return empty array
      return [];
    }
  }

  async saveUsers(users: any[]): Promise<void> {
    await fs.promises.writeFile(this.usersPath, JSON.stringify(users, null, 2));
  }

  async addUser(user: any): Promise<void> {
    const users = await this.getUsers();
    users.push(user);
    await this.saveUsers(users);
  }

  async findUserByEmail(email: string): Promise<any | null> {
    console.log('🔍 DatabaseService: Looking for user with email:', email);
    const users = await this.getUsers();
    console.log('📄 DatabaseService: All users:', users);
    const user = users.find(user => user.email === email) || null;
    console.log('👤 DatabaseService: Found user:', user);
    return user;
  }

  async findUserById(id: string): Promise<any | null> {
    const users = await this.getUsers();
    return users.find(user => user.id === id) || null;
  }

  async updateUser(id: string, updates: any): Promise<void> {
    const users = await this.getUsers();
    const userIndex = users.findIndex(user => user.id === id);
    if (userIndex !== -1) {
      users[userIndex] = { ...users[userIndex], ...updates };
      await this.saveUsers(users);
    }
  }

  // Chats operations
  async getChats(): Promise<any[]> {
    try {
      const data = await fs.promises.readFile(this.chatsPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      // If file doesn't exist or is empty, return empty array
      return [];
    }
  }

  async saveChats(chats: any[]): Promise<void> {
    await fs.promises.writeFile(this.chatsPath, JSON.stringify(chats, null, 2));
  }

  async addChat(chat: any): Promise<void> {
    const chats = await this.getChats();
    chats.push(chat);
    await this.saveChats(chats);
  }

  async findChatById(id: string): Promise<any | null> {
    const chats = await this.getChats();
    return chats.find(chat => chat.id === id) || null;
  }

  async findChatsByUserId(userId: string): Promise<any[]> {
    const chats = await this.getChats();
    return chats.filter(chat => chat.userId === userId);
  }

  async updateChat(id: string, updates: any): Promise<void> {
    const chats = await this.getChats();
    const chatIndex = chats.findIndex(chat => chat.id === id);
    if (chatIndex !== -1) {
      chats[chatIndex] = { ...chats[chatIndex], ...updates };
      await this.saveChats(chats);
    }
  }

  async deleteChat(id: string): Promise<void> {
    const chats = await this.getChats();
    const filteredChats = chats.filter(chat => chat.id !== id);
    await this.saveChats(filteredChats);
  }
}
