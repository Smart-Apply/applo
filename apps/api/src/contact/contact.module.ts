import { Module } from '@nestjs/common';
import { ContactController } from './contact.controller';
import { ConfigModule } from '../config/config.module';

@Module({
  imports: [ConfigModule],
  controllers: [ContactController],
})
export class ContactModule {}
