import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  Contact,
  ContactSchema,
} from './schemas/contact.schema';

import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Contact.name,
        schema: ContactSchema,
      },
    ]),
  ],

  controllers: [
    ContactController,
  ],

  providers: [
    ContactService,
  ],

  exports: [
    ContactService,
  ],
})
export class ContactModule {}