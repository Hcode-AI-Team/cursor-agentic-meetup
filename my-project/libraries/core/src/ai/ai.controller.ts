import { Role } from '@hed-hog/api';
import { Pagination } from '@hed-hog/api-pagination';
import { Body, Controller, Delete, Get, Inject, Param, ParseIntPipe, Patch, Post, UploadedFile, UseInterceptors, forwardRef } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DeleteDTO } from '../dto/delete.dto';
import { AiService } from './ai.service';
import { ChatAgentDTO } from './dto/chat-agent.dto';
import { ChatDTO } from './dto/chat.dto';
import { CreateAgentDTO } from './dto/create-agent.dto';
import { UpdateAgentDTO } from './dto/update-agent.dto';

@Role()
@Controller('ai')
export class AiController {
  constructor(
    @Inject(forwardRef(() => AiService))
    private readonly aiService: AiService,
  ) {}

  @Post('chat')
  @UseInterceptors(FileInterceptor('file'))
  async chat(@Body() data: ChatDTO, @UploadedFile() file?: MulterFile) {
    return this.aiService.chat(data, file);
  }

  @Post('agent')
  async createAgent(@Body() data: CreateAgentDTO) {
    return this.aiService.createAgent(data);
  }

  @Get('agent')
  async listAgents(@Pagination() paginationParams) {
    return this.aiService.listAgents(paginationParams);
  }

  @Get('agent/id/:agentId')
  async getAgentById(@Param('agentId', ParseIntPipe) agentId: number) {
    return this.aiService.getAgentById(agentId);
  }

  @Get('agent/:slug')
  async getAgent(@Param('slug') slug: string) {
    return this.aiService.getAgentBySlug(slug);
  }

  @Patch('agent/:agentId')
  async updateAgent(
    @Param('agentId', ParseIntPipe) agentId: number,
    @Body() data: UpdateAgentDTO,
  ) {
    return this.aiService.updateAgent(agentId, data);
  }

  @Delete('agent')
  async deleteAgents(@Body() data: DeleteDTO) {
    return this.aiService.deleteAgents(data);
  }

  @Post('agent/:slug/chat')
  @UseInterceptors(FileInterceptor('file'))
  async chatWithAgent(
    @Param('slug') slug: string,
    @Body() data: ChatAgentDTO,
    @UploadedFile() file?: MulterFile,
  ) {
    return this.aiService.chatWithAgent(slug, data, file);
  }
}
