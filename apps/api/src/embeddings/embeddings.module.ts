import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from '../users/user.entity';
import { EmbeddingsService } from './embeddings.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [EmbeddingsService],
  exports: [EmbeddingsService],
})
export class EmbeddingsModule {}
