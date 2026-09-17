import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BusinessDependencyController } from './business-dependency.controller';
import { BusinessDependencyService } from './business-dependency.service';
import {
  BusinessDependency,
  BusinessDependencySchema,
} from './schemas/business-dependency.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BusinessDependency.name, schema: BusinessDependencySchema },
    ]),
  ],
  controllers: [BusinessDependencyController],
  providers: [BusinessDependencyService],
  exports: [BusinessDependencyService],
})
export class BusinessDependencyModule {}
