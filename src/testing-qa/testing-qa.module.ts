import { Module } from '@nestjs/common';
import { TestingQaController } from './testing-qa.controller';
import { TestingQaService } from './testing-qa.service';

@Module({
  controllers: [TestingQaController],
  providers: [TestingQaService],
  exports: [TestingQaService],
})
export class TestingQaModule {}
