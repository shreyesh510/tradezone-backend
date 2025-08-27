import { Module } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { FirebaseDatabaseService } from './firebase-database.service';
import { FirebaseConfig } from '../config/firebase.config';

@Module({
  providers: [DatabaseService, FirebaseDatabaseService, FirebaseConfig],
  exports: [DatabaseService, FirebaseDatabaseService],
})
export class DatabaseModule {}
