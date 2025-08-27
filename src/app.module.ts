import { Module, OnModuleInit } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { DatabaseModule } from './database/database.module';
import { FirebaseDatabaseService } from './database/firebase-database.service';

@Module({
  imports: [AuthModule, ChatModule, DatabaseModule],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
  ],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly firebaseDatabaseService: FirebaseDatabaseService) {}

  async onModuleInit() {
    // Initialize sample data in Firebase
    await this.firebaseDatabaseService.initializeSampleData();
  }
}
