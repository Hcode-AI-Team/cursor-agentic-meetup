import { Injectable } from '@nestjs/common';
import { FileService } from '../../file/file.service';
import { McpTool } from '../decorators/mcp-tool.decorator';
import { McpContext } from '../types/mcp-context.type';

@Injectable()
export class CoreFilesMcpTools {
  constructor(private readonly fileService: FileService) {}

  @McpTool({
    name: 'core.files.list',
    description: 'Lists uploaded files with optional pagination. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        page: { type: 'number', description: 'Page number (default: 1)' },
        pageSize: { type: 'number', description: 'Items per page (default: 20)' },
        search: { type: 'string', description: 'Search term' },
        sortField: { type: 'string', description: 'Field to sort by' },
        sortOrder: { type: 'string', enum: ['asc', 'desc'], description: 'Sort direction' },
      },
    },
    readOnly: true,
  })
  async listFiles(
    args: { page?: number; pageSize?: number; search?: string; sortField?: string; sortOrder?: string },
    _context: McpContext,
  ): Promise<any> {
    return this.fileService.getFiles({
      page: args.page ?? 1,
      pageSize: args.pageSize ?? 20,
      search: args.search ?? '',
      sortField: args.sortField ?? 'id',
      sortOrder: (args.sortOrder as any) ?? 'asc',
      fields: '',
    });
  }

  @McpTool({
    name: 'core.files.get',
    description: 'Returns file details by ID. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        fileId: { type: 'number', description: 'File ID' },
      },
      required: ['fileId'],
    },
    readOnly: true,
  })
  async getFile(args: { fileId: number }, _context: McpContext): Promise<any> {
    return this.fileService.get(args.fileId);
  }

  @McpTool({
    name: 'core.files.open-url',
    description: 'Returns a temporary URL to open/view a file inline. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        fileId: { type: 'number', description: 'File ID' },
      },
      required: ['fileId'],
    },
    readOnly: true,
  })
  async getOpenUrl(args: { fileId: number }, _context: McpContext): Promise<any> {
    const file = await this.fileService.get(args.fileId);
    const url = await this.fileService.tempOpenURL(file.path);
    return { url };
  }

  @McpTool({
    name: 'core.files.download-url',
    description: 'Returns a temporary URL to download a file. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        fileId: { type: 'number', description: 'File ID' },
      },
      required: ['fileId'],
    },
    readOnly: true,
  })
  async getDownloadUrl(args: { fileId: number }, _context: McpContext): Promise<any> {
    const file = await this.fileService.get(args.fileId);
    const url = await this.fileService.tempURL(file.path);
    return { url };
  }

  @McpTool({
    name: 'core.files.delete',
    description: 'Deletes one or more files by their IDs. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        ids: { type: 'array', items: { type: 'number' }, description: 'File IDs to delete' },
      },
      required: ['ids'],
    },
  })
  async deleteFiles(args: { ids: number[] }, context: McpContext): Promise<any> {
    return this.fileService.delete(context.locale, { ids: args.ids });
  }
}
