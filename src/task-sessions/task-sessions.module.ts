import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  TaskSession,
  TaskSessionSchema,
} from './schemas/task-session.schema';
import { TaskSessionsService } from './task-sessions.service';
import { TaskSessionsController } from './task-sessions.controller';
import { TasksModule } from '../tasks/tasks.module';
import { SubmissionsModule } from '../submissions/submissions.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TaskSession.name, schema: TaskSessionSchema },
    ]),
    TasksModule,
    SubmissionsModule,
  ],
  controllers: [TaskSessionsController],
  providers: [TaskSessionsService],
  exports: [TaskSessionsService],
})
export class TaskSessionsModule {}
