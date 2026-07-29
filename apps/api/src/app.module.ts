import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { typeOrmModuleOptions } from './config/typeorm-options.factory';
import { AuthModule } from './auth/auth.module';
import { ChatsModule } from './chats/chats.module';
import { DiscoveryModule } from './discovery/discovery.module';
import { MatchesModule } from './matches/matches.module';
import { ModerationModule } from './moderation/moderation.module';
import { PushModule } from './push/push.module';
import { InterviewModule } from './interview/interview.module';
import { NotificationsModule } from './notifications/notifications.module';
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
    // Rede de segurança global; as rotas da entrevista apertam com @Throttle.
    // Nota: o storage padrão é por instância, então com N réplicas o limite
    // efetivo é N x limite. Aceitável nesta escala; se apertar, ligar o
    // storage no REDIS_URL que já existe.
    ThrottlerModule.forRoot([{ name: 'default', limit: 120, ttl: 60_000 }]),
    AuthModule,
    UsersModule,
    InterviewModule,
    DiscoveryModule,
    ChatsModule,
    PushModule,
    MatchesModule,
    NotificationsModule,
    ModerationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
