import { forwardRef, Module } from "@nestjs/common";
import { TasksService } from "./task.service";
import { PrismaModule } from '@hed-hog/api-prisma';

@Module({
  imports: [forwardRef(() => PrismaModule),],
  providers: [TasksService],
})
export class TaskModule { }