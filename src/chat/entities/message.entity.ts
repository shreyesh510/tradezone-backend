export class Message {
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

  constructor(partial: Partial<Message>) {
    Object.assign(this, partial);
  }
}
