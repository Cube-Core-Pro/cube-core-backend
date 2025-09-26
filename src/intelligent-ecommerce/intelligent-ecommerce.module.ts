import { Module } from '@nestjs/common';
import { IntelligentEcommerceController } from './intelligent-ecommerce.controller';
import { IntelligentEcommerceService } from './intelligent-ecommerce.service';

@Module({
  controllers: [IntelligentEcommerceController],
  providers: [IntelligentEcommerceService],
  exports: [IntelligentEcommerceService],
})
export class IntelligentEcommerceModule {}
