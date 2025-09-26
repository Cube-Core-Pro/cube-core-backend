import { Module } from '@nestjs/common';
import { MarketingAutomationSocialController } from './marketing-automation-social.controller';
import { MarketingAutomationSocialService } from './marketing-automation-social.service';

@Module({
  controllers: [MarketingAutomationSocialController],
  providers: [MarketingAutomationSocialService],
  exports: [MarketingAutomationSocialService],
})
export class MarketingAutomationSocialModule {}
