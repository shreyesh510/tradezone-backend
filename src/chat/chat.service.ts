import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { FirebaseDatabaseService } from '../database/firebase-database.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { Message } from './entities/message.entity';

export interface ChatSession {
  id: string;
  participants: string[];
  lastMessage?: Message;
  lastActivity: Date;
  unreadCount: { [userId: string]: number };
}

export interface UserChatSummary {
  userId: string;
  userName: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount: number;
  isOnline: boolean;
}

@Injectable()
export class ChatService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly firebaseDatabaseService: FirebaseDatabaseService,
  ) {}

  async createMessage(createMessageDto: CreateMessageDto & { senderId: string; senderName: string }): Promise<Message> {
    console.log('📝 Creating message with data:', createMessageDto);
    
    const message = new Message({
      id: Date.now().toString(),
      content: createMessageDto.content,
      senderId: createMessageDto.senderId,
      senderName: createMessageDto.senderName,
      receiverId: createMessageDto.receiverId,
      roomId: createMessageDto.roomId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('📋 Message object created:', message);

    try {
      // Save to Firebase
      const savedChat = await this.firebaseDatabaseService.addChat({
        content: message.content,
        senderId: message.senderId,
        senderName: message.senderName,
        receiverId: message.receiverId,
        roomId: message.roomId,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
      });
      
      console.log('✅ Message saved to Firebase:', savedChat);
      return message;
    } catch (error) {
      console.error('❌ Error saving message to Firebase:', error);
      throw error;
    }
  }

  async getMessagesByUserId(userId: string): Promise<Message[]> {
    const messages = await this.firebaseDatabaseService.findChatsByUserId(userId);
    return messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async getMessagesByRoomId(roomId: string): Promise<Message[]> {
    const chats = await this.firebaseDatabaseService.getChats();
    const messages = chats.filter(chat => chat.roomId === roomId);
    return messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async getDirectMessages(userId1: string, userId2: string): Promise<Message[]> {
    const chats = await this.firebaseDatabaseService.getChats();
    const messages = chats.filter(chat => 
      (chat.senderId === userId1 && chat.receiverId === userId2) ||
      (chat.senderId === userId2 && chat.receiverId === userId1)
    );
    return messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async getAllMessages(): Promise<Message[]> {
    console.log('📚 Getting all messages from Firebase...');
    const chats = await this.firebaseDatabaseService.getChats();
    console.log('📚 Retrieved chats from Firebase:', chats);
    const sortedMessages = chats.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    console.log('📚 Returning sorted messages:', sortedMessages);
    return sortedMessages;
  }

  async deleteMessage(messageId: string): Promise<void> {
    await this.firebaseDatabaseService.deleteChat(messageId);
  }

  async getUserChatSessions(userId: string): Promise<ChatSession[]> {
    const allMessages = await this.getAllMessages();
    const userMessages = allMessages.filter(msg => 
      msg.senderId === userId || msg.receiverId === userId
    );

    const sessions = new Map<string, ChatSession>();

    userMessages.forEach(message => {
      const otherUserId = message.senderId === userId ? message.receiverId : message.senderId;
      if (!otherUserId) return; // Skip if no other user (global messages)
      
      const sessionId = [userId, otherUserId].sort().join('_');

      if (!sessions.has(sessionId)) {
        sessions.set(sessionId, {
          id: sessionId,
          participants: [userId, otherUserId],
          lastActivity: message.createdAt,
          unreadCount: {}
        });
      }

      const session = sessions.get(sessionId)!;
      if (message.createdAt > session.lastActivity) {
        session.lastMessage = message;
        session.lastActivity = message.createdAt;
      }

      // Count unread messages for the other user
      if (message.senderId !== userId && !message.readAt) {
        session.unreadCount[userId] = (session.unreadCount[userId] || 0) + 1;
      }
    });

    return Array.from(sessions.values()).sort((a, b) => 
      new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    );
  }

  async getUserChatSummary(userId: string): Promise<UserChatSummary[]> {
    const sessions = await this.getUserChatSessions(userId);
    const allUsers = await this.firebaseDatabaseService.getUsers();
    
    return sessions.map(session => {
      const otherUserId = session.participants.find(id => id !== userId)!;
      const otherUser = allUsers.find(user => user.id === otherUserId);
      
      return {
        userId: otherUserId,
        userName: otherUser?.name || 'Unknown User',
        lastMessage: session.lastMessage?.content,
        lastMessageTime: session.lastMessage?.createdAt,
        unreadCount: session.unreadCount[userId] || 0,
        isOnline: false // This will be updated by the gateway
      };
    });
  }

  async markMessagesAsRead(userId: string, senderId: string): Promise<void> {
    const messages = await this.getDirectMessages(senderId, userId);
    const unreadMessages = messages.filter(msg => 
      msg.senderId === senderId && !msg.readAt
    );

    for (const message of unreadMessages) {
      await this.firebaseDatabaseService.updateChat(message.id, { readAt: new Date() });
    }
  }

  async getMessagesWithTimeRange(userId: string, startTime: Date, endTime: Date): Promise<Message[]> {
    const allMessages = await this.getAllMessages();
    return allMessages.filter(msg => 
      (msg.senderId === userId || msg.receiverId === userId) &&
      msg.createdAt >= startTime &&
      msg.createdAt <= endTime
    ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }
}
