import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsOptional()
  roomId?: string;

  @IsString()
  @IsOptional()
  receiverId?: string;

  @IsEnum(['text', 'image', 'file', 'system'])
  @IsOptional()
  messageType?: 'text' | 'image' | 'file' | 'system';
}
