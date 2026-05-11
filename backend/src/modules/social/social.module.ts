import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { SocialController } from './social.controller';
import { SocialRepository } from './social.repository';
import { SocialService } from './social.service';

@Module({
  imports: [NotificationsModule],
  controllers: [SocialController],
  providers: [SocialService, SocialRepository],
  exports: [SocialService, SocialRepository],
})
export class SocialModule {}
