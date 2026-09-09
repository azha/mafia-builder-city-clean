import { Module } from '@nestjs/common';

import { DbModule } from '../db/db.module';
import { AuthModule } from '../auth/auth.module';
import { ProgressionRepository } from './progression.repository';
import { ProgressionService } from './progression.service';
import { ProgressionProjectionService } from './progression.projection.service';
import { ProgressionController } from './progression.controller';

/** The DSL vocabulary-tier progression module (Phase-17). Owns the only writer of rule_vocabulary_tier + the player surface. */
@Module({
  imports: [DbModule, AuthModule],
  controllers: [ProgressionController],
  providers: [ProgressionRepository, ProgressionService, ProgressionProjectionService],
  exports: [ProgressionService, ProgressionRepository],
})
export class ProgressionModule {}
