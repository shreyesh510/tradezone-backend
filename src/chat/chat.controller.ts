import { Controller, Get, Post, Body, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('message')
  @UseGuards(JwtAuthGuard)
  async createMessage(@Body() createMessageDto: CreateMessageDto, @Request() req) {
    const user = req.user;
    return this.chatService.createMessage({
      ...createMessageDto,
      senderId: user.userId,
      senderName: user.email,
    });
  }

  @Get('messages')
  async getAllMessages() {
    console.log('📚 GET /chat/messages called');
    try {
      const messages = await this.chatService.getAllMessages();
      console.log('📚 Retrieved messages from Firebase:', messages.length);
      return messages;
    } catch (error) {
      console.error('❌ Error getting messages:', error);
      return [];
    }
  }

  @Get('messages/user/:userId')
  async getMessagesByUserId(@Param('userId') userId: string) {
    return this.chatService.getMessagesByUserId(userId);
  }

  @Get('messages/room/:roomId')
  async getMessagesByRoomId(@Param('roomId') roomId: string) {
    return this.chatService.getMessagesByRoomId(roomId);
  }

  @Get('messages/direct/:userId1/:userId2')
  async getDirectMessages(@Param('userId1') userId1: string, @Param('userId2') userId2: string) {
    return this.chatService.getDirectMessages(userId1, userId2);
  }

  @Get('sessions')
  async getUserChatSessions(@Request() req) {
    return this.chatService.getUserChatSessions(req.user.userId);
  }

  @Get('summary')
  async getUserChatSummary(@Request() req) {
    return this.chatService.getUserChatSummary(req.user.userId);
  }

  @Post('mark-read/:senderId')
  async markMessagesAsRead(@Param('senderId') senderId: string, @Request() req) {
    return this.chatService.markMessagesAsRead(req.user.userId, senderId);
  }

  @Get('time-range')
  async getMessagesWithTimeRange(
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
    @Request() req
  ) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    return this.chatService.getMessagesWithTimeRange(req.user.userId, start, end);
  }

  @Delete('message/:id')
  async deleteMessage(@Param('id') id: string) {
    return this.chatService.deleteMessage(id);
  }

  @Post('test-message')
  async testMessage() {
    console.log('🧪 Testing Firebase message creation...');
    try {
      const testMessage = await this.chatService.createMessage({
        content: 'Test message from API',
        messageType: 'text',
        senderId: 'test-user',
        senderName: 'Test User',
      });
      console.log('✅ Test message created:', testMessage);
      return { success: true, message: testMessage };
    } catch (error) {
      console.error('❌ Test message failed:', error);
      return { success: false, error: error.message };
    }
  }
}
