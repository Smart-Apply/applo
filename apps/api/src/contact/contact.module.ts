import { Module } from '@nestjs/common';
import { ContactController } from './contact.controller';
import { ConfigModule } from '../config/config.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  // AuthModule is imported for the JwtService used by best-effort premium
  // detection. SubscriptionService and EmailService are provided globally.
  imports: [ConfigModule, AuthModule],
  controllers: [ContactController],
})
export class ContactModule {}
