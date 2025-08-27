import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:5173', // Local development
      'http://localhost:3000', // Local development
      'https://tradezone-frontend.onrender.com', // Deployed frontend
    ],
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<string, { userId: string; socketId: string; userName: string }>();

  constructor(private readonly chatService: ChatService) {}

  async handleConnection(client: Socket) {
    console.log(`🔌 Client connected: ${client.id}`);
    console.log('🔍 Handshake auth:', client.handshake.auth);
    
    // Extract user info from handshake auth
    const user = client.handshake.auth.user;
    if (user) {
      console.log('✅ User info found:', user);
      this.connectedUsers.set(client.id, {
        userId: user.userId,
        socketId: client.id,
        userName: user.userName,
      });
      console.log(`👤 User connected: ${user.userName} (${user.userId})`);
      
      // Join user to their personal room
      await client.join(`user_${user.userId}`);
      
      // Broadcast user online status
      this.server.emit('userOnline', {
        userId: user.userId,
        userName: user.userName,
        socketId: client.id,
      });
    } else {
      console.log('❌ No user info in handshake auth');
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`🔌 Client disconnected: ${client.id}`);
    
    const userInfo = this.connectedUsers.get(client.id);
    if (userInfo) {
      this.connectedUsers.delete(client.id);
      console.log(`👤 User disconnected: ${userInfo.userName} (${userInfo.userId})`);
      
      // Broadcast user offline status
      this.server.emit('userOffline', {
        userId: userInfo.userId,
        userName: userInfo.userName,
      });
    }
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() createMessageDto: CreateMessageDto,
  ) {
    console.log('📨 Received message from client:', client.id, createMessageDto);
    
    const userInfo = this.connectedUsers.get(client.id);
    if (!userInfo) {
      console.log('❌ User not authenticated for client:', client.id);
      return { error: 'User not authenticated' };
    }

    console.log('👤 User info:', userInfo);

    try {
      console.log('📝 Calling chatService.createMessage with:', {
        ...createMessageDto,
        senderId: userInfo.userId,
        senderName: userInfo.userName,
      });

      const message = await this.chatService.createMessage({
        ...createMessageDto,
        senderId: userInfo.userId,
        senderName: userInfo.userName,
      });

      console.log('✅ Message created and saved to Firebase:', message);

      // Emit message to sender
      client.emit('messageSent', message);

      // Emit message to receiver or room
      if (createMessageDto.receiverId) {
        // Direct message
        console.log('📤 Sending direct message to:', createMessageDto.receiverId);
        this.server.to(`user_${createMessageDto.receiverId}`).emit('newMessage', message);
      } else if (createMessageDto.roomId) {
        // Room message
        console.log('📤 Sending room message to:', createMessageDto.roomId);
        this.server.to(createMessageDto.roomId).emit('newMessage', message);
      } else {
        // Broadcast to all connected users
        console.log('📤 Broadcasting message to all users');
        this.server.emit('newMessage', message);
      }

      return message;
    } catch (error) {
      console.error('❌ Error sending message:', error);
      console.error('❌ Error details:', error.message, error.stack);
      return { error: 'Failed to send message' };
    }
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    await client.join(data.roomId);
    console.log(`👥 User joined room: ${data.roomId}`);
    
    // Notify room members
    this.server.to(data.roomId).emit('userJoinedRoom', {
      roomId: data.roomId,
      user: this.connectedUsers.get(client.id),
    });
  }

  @SubscribeMessage('leaveRoom')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    await client.leave(data.roomId);
    console.log(`👥 User left room: ${data.roomId}`);
    
    // Notify room members
    this.server.to(data.roomId).emit('userLeftRoom', {
      roomId: data.roomId,
      user: this.connectedUsers.get(client.id),
    });
  }

  @SubscribeMessage('getOnlineUsers')
  handleGetOnlineUsers(@ConnectedSocket() client: Socket) {
    const onlineUsers = Array.from(this.connectedUsers.values());
    client.emit('onlineUsers', onlineUsers);
  }

  @SubscribeMessage('markMessagesAsRead')
  async handleMarkMessagesAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { senderId: string },
  ) {
    const userInfo = this.connectedUsers.get(client.id);
    if (!userInfo) {
      return { error: 'User not authenticated' };
    }

    try {
      await this.chatService.markMessagesAsRead(userInfo.userId, data.senderId);
      
      // Notify the sender that their messages have been read
      this.server.to(`user_${data.senderId}`).emit('messagesRead', {
        readerId: userInfo.userId,
        readerName: userInfo.userName,
      });

      return { success: true };
    } catch (error) {
      console.error('Error marking messages as read:', error);
      return { error: 'Failed to mark messages as read' };
    }
  }

  @SubscribeMessage('getUserChatSummary')
  async handleGetUserChatSummary(@ConnectedSocket() client: Socket) {
    const userInfo = this.connectedUsers.get(client.id);
    if (!userInfo) {
      return { error: 'User not authenticated' };
    }

    try {
      const chatSummary = await this.chatService.getUserChatSummary(userInfo.userId);
      
      // Update online status for users in the summary
      const onlineUserIds = Array.from(this.connectedUsers.values()).map(u => u.userId);
      const updatedSummary = chatSummary.map(summary => ({
        ...summary,
        isOnline: onlineUserIds.includes(summary.userId)
      }));

      client.emit('userChatSummary', updatedSummary);
      return updatedSummary;
    } catch (error) {
      console.error('Error getting user chat summary:', error);
      return { error: 'Failed to get chat summary' };
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { receiverId?: string; roomId?: string; isTyping: boolean },
  ) {
    const userInfo = this.connectedUsers.get(client.id);
    if (!userInfo) {
      return { error: 'User not authenticated' };
    }

    const typingData = {
      userId: userInfo.userId,
      userName: userInfo.userName,
      isTyping: data.isTyping,
    };

    if (data.receiverId) {
      // Direct message typing indicator
      this.server.to(`user_${data.receiverId}`).emit('userTyping', typingData);
    } else if (data.roomId) {
      // Room typing indicator
      this.server.to(data.roomId).emit('userTyping', { ...typingData, roomId: data.roomId });
    }
  }

  @SubscribeMessage('getMessagesWithTimeRange')
  async handleGetMessagesWithTimeRange(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { startTime: string; endTime: string },
  ) {
    const userInfo = this.connectedUsers.get(client.id);
    if (!userInfo) {
      return { error: 'User not authenticated' };
    }

    try {
      const startTime = new Date(data.startTime);
      const endTime = new Date(data.endTime);
      const messages = await this.chatService.getMessagesWithTimeRange(
        userInfo.userId,
        startTime,
        endTime
      );

      client.emit('messagesWithTimeRange', messages);
      return messages;
    } catch (error) {
      console.error('Error getting messages with time range:', error);
      return { error: 'Failed to get messages' };
    }
  }

  // Broadcast system messages
  broadcastSystemMessage(message: string) {
    this.server.emit('systemMessage', {
      content: message,
      timestamp: new Date(),
      type: 'system'
    });
  }

  // Get all connected users
  getConnectedUsers() {
    return Array.from(this.connectedUsers.values());
  }

  // Check if user is online
  isUserOnline(userId: string): boolean {
    return Array.from(this.connectedUsers.values()).some(user => user.userId === userId);
  }
}
