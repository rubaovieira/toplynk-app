import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { typeOrmModuleOptions } from './config/typeorm-options.factory';
import { AuthModule } from './auth/auth.module';
import { ChatsModule } from './chats/chats.module';
import { DiscoveryModule } from './discovery/discovery.module';
import { MatchesModule } from './matches/matches.module';
import { PushModule } from './push/push.module';
import { InterviewModule } from './interview/interview.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => typeOrmModuleOptions(config),
    }),
    AuthModule,
    UsersModule,
    InterviewModule,
    DiscoveryModule,
    ChatsModule,
    PushModule,
    MatchesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
