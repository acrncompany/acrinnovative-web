import { Module } from '@nestjs/common';
import { PublicModule } from '../public/public.module';
import { FormsController } from './forms.controller';
import { MailerService } from './mailer.service';

@Module({
  imports: [PublicModule],
  controllers: [FormsController],
  providers: [MailerService],
  exports: [MailerService],
})
export class FormsModule {}
