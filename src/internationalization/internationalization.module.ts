import { Module } from '@nestjs/common';
import { InternationalizationController } from './internationalization.controller';
import { InternationalizationService } from './internationalization.service';

@Module({
  controllers: [InternationalizationController],
  providers: [InternationalizationService],
  exports: [InternationalizationService],
})
export class InternationalizationModule {}
