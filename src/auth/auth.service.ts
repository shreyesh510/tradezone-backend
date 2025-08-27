import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { User } from './entities/user.entity';
import { DatabaseService } from '../database/database.service';
import { FirebaseDatabaseService, User as FirebaseUser } from '../database/firebase-database.service';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private databaseService: DatabaseService,
    private firebaseDatabaseService: FirebaseDatabaseService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { name, email, password } = registerDto;

    // Check if user already exists
    const existingUser = await this.firebaseDatabaseService.findUserByEmail(email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password - COMMENTED OUT FOR NOW
    // const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user in Firebase
    const newUser: FirebaseUser = await this.firebaseDatabaseService.createUser({
      name,
      email,
      password: password, // Store plain text password for now
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Generate JWT token
    const payload = { sub: newUser.id, email: newUser.email };
    const token = this.jwtService.sign(payload);

    // Generate test token for localStorage
    const testToken = this.generateTestToken({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      password: newUser.password,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt,
    });

    return {
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
      },
      token,
      testToken, // For localStorage storage
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    console.log('🔍 Login attempt:', { email, password });

    try {
      // Find user by email with timeout
      const user: FirebaseUser | null = await Promise.race([
        this.firebaseDatabaseService.findUserByEmail(email),
        new Promise<FirebaseUser | null>((_, reject) => 
          setTimeout(() => reject(new Error('Database timeout')), 5000)
        )
      ]);
      
      console.log('👤 Found user:', user ? { id: user.id, name: user.name, email: user.email } : 'Not found');
      
      if (!user) {
        console.log('❌ User not found');
        throw new UnauthorizedException('Invalid credentials');
      }

      // Verify password - COMMENTED OUT BCRYPT FOR NOW
      // const isPasswordValid = await bcrypt.compare(password, user.password);
      const isPasswordValid = password === user.password; // Direct password comparison
      console.log('🔐 Password check:', { 
        providedPassword: password, 
        storedPassword: user.password, 
        isMatch: isPasswordValid 
      });
      
      if (!isPasswordValid) {
        console.log('❌ Password mismatch');
        throw new UnauthorizedException('Invalid credentials');
      }

      // Generate JWT token
      const payload = { sub: user.id, email: user.email };
      const token = this.jwtService.sign(payload);

      // Generate test token for localStorage
      const testToken = this.generateTestToken({
        id: user.id,
        name: user.name,
        email: user.email,
        password: user.password,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });

      return {
        message: 'Login successful',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        token,
        testToken, // For localStorage storage
      };
    } catch (error) {
      console.error('❌ Login error:', error);
      if (error.message === 'Database timeout') {
        throw new UnauthorizedException('Database timeout - please try again');
      }
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  async validateUser(userId: string): Promise<User | null> {
    // For now, we'll use the old database service for validation
    // You can update this to use Firebase if needed
    return await this.databaseService.findUserById(userId);
  }

  private generateTestToken(user: User): string {
    // Create a simple test token for localStorage
    const testTokenData = {
      userId: user.id,
      email: user.email,
      name: user.name,
      type: 'test-token',
      createdAt: new Date().toISOString(),
    };
    
    // Encode as base64 for localStorage storage
    return Buffer.from(JSON.stringify(testTokenData)).toString('base64');
  }
}
