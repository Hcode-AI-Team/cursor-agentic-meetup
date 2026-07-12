import { DeleteDTO } from '@hed-hog/api';
import { getLocaleText } from '@hed-hog/api-locale';
import { PaginationService } from '@hed-hog/api-pagination';
import { PrismaService } from '@hed-hog/api-prisma';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { CreateDTO } from './dto/create.dto';
import { QueryMailSentListDTO } from './dto/query-mail-sent-list.dto';
import { UpdateDTO } from './dto/update.dto';

type MailSentUserStatus = 'received' | 'read' | 'error';

type MailSentUserLog = {
  id: number;
  recipient_email: string;
  status: MailSentUserStatus;
  read_at: Date | null;
  error_code: string | null;
  error_message: string | null;
  user_id: number;
  user_identifier_id: number | null;
  created_at: Date;
  updated_at: Date;
};

type MailSentWithUsers = {
  mail_sent_user?: MailSentUserLog[];
};

@Injectable()
export class MailSentService {
  constructor(
    @Inject(forwardRef(() => PrismaService))
    private readonly prismaService: PrismaService,
    @Inject(forwardRef(() => PaginationService))
    private readonly paginationService: PaginationService,
  ) { }

  async list(paginationParams: QueryMailSentListDTO) {
    const fields = ['subject', 'from', 'to', 'cc', 'bcc', 'body'];
    const OR: any[] = this.prismaService.createInsensitiveSearch(
      fields,
      paginationParams,
    );

    const AND: any[] = [];

    if (
      paginationParams.status &&
      paginationParams.status !== 'all' &&
      ['received', 'read', 'error'].includes(paginationParams.status)
    ) {
      AND.push({
        mail_sent_user: {
          some: {
            status: paginationParams.status,
          },
        },
      });
    }

    const recipientEmail = paginationParams.recipientEmail?.trim();
    if (recipientEmail) {
      AND.push({
        mail_sent_user: {
          some: {
            recipient_email: {
              contains: recipientEmail,
              mode: 'insensitive',
            },
          },
        },
      });
    }

    const hasErrorRaw = paginationParams.hasError?.trim().toLowerCase();
    if (hasErrorRaw === 'true' || hasErrorRaw === '1') {
      AND.push({
        mail_sent_user: {
          some: {
            status: 'error',
          },
        },
      });
    }

    if (hasErrorRaw === 'false' || hasErrorRaw === '0') {
      AND.push({
        mail_sent_user: {
          none: {
            status: 'error',
          },
        },
      });
    }

    const createdAt: { gte?: Date; lte?: Date } = {};
    const createdAtFrom = paginationParams.createdAtFrom?.trim();
    const createdAtTo = paginationParams.createdAtTo?.trim();

    if (createdAtFrom) {
      const parsedFrom = new Date(createdAtFrom);
      if (!isNaN(parsedFrom.getTime())) {
        createdAt.gte = parsedFrom;
      }
    }

    if (createdAtTo) {
      const parsedTo = new Date(createdAtTo);
      if (!isNaN(parsedTo.getTime())) {
        parsedTo.setHours(23, 59, 59, 999);
        createdAt.lte = parsedTo;
      }
    }

    if (paginationParams.search && !isNaN(+paginationParams.search)) {
      OR.push({ id: { equals: +paginationParams.search } });
    }

    const result = await this.paginationService.paginate(
      this.prismaService.mail_sent,
      paginationParams,
      {
        where: {
          ...(OR.length > 0 ? { OR } : {}),
          ...(AND.length > 0 ? { AND } : {}),
          ...(Object.keys(createdAt).length > 0 ? { created_at: createdAt } : {}),
        },
        include: {
          mail_sent_user: {
            select: {
              id: true,
              recipient_email: true,
              status: true,
              read_at: true,
              error_code: true,
              error_message: true,
              user_id: true,
              user_identifier_id: true,
              created_at: true,
              updated_at: true,
            },
          },
        },
      },
    );

    const data = (result.data as MailSentWithUsers[]).map((item) => {
      const recipientLogs = item.mail_sent_user ?? [];
      const summary = recipientLogs.reduce(
        (acc, recipient) => {
          if (recipient.status === 'received') {
            acc.receivedCount += 1;
          }

          if (recipient.status === 'read') {
            acc.readCount += 1;
            if (
              recipient.read_at &&
              (!acc.lastReadAt || recipient.read_at > acc.lastReadAt)
            ) {
              acc.lastReadAt = recipient.read_at;
            }
          }

          if (recipient.status === 'error') {
            acc.errorCount += 1;
          }

          return acc;
        },
        {
          totalRecipients: recipientLogs.length,
          receivedCount: 0,
          readCount: 0,
          errorCount: 0,
          hasError: false,
          lastReadAt: null as Date | null,
        },
      );

      summary.hasError = summary.errorCount > 0;

      return {
        ...item,
        deliverySummary: summary,
      };
    });

    return {
      ...result,
      data,
    };
  }

  async get(locale:string, id: number) {
    const mailSent = await this.prismaService.mail_sent.findUnique({
      where: { id: id },
    });

    if (!mailSent) {
      throw new NotFoundException(getLocaleText('mail_sent_not_found', locale));
    }

    return mailSent;
  }

  async create({ body, from, mail_id, subject, bcc, cc, to }: CreateDTO) {

    if (!body || !mail_id || !subject || !to) {
      throw new BadRequestException('All fields are required.');
    }

    if (Array.isArray(cc)) {
      cc = cc.join(';');
    }

    if (Array.isArray(bcc)) {
      bcc = bcc.join(';');
    }

    if (Array.isArray(to)) {
      to = to.join(';');
    }

    return this.prismaService.mail_sent.create({
      data: {
        mail_id: mail_id,
        subject: subject,
        from: from ?? 'mail@mail.com',
        to: to,
        cc: cc,
        bcc: bcc,
        body: body,
      },
    });
  }

  async update(locale:string,{ id, data }: { id: number; data: UpdateDTO }) {
    const mailSent = await this.prismaService.mail_sent.findUnique({
      where: { id: id },
    });

    if (!mailSent) {
      throw new NotFoundException(getLocaleText('mail_sent_not_found', locale));
    }

    return this.prismaService.mail_sent.update({
      where: { id: id },
      data,
    });
  }

  async delete(locale:string,{ ids }: DeleteDTO): Promise<{ count: number }> {
    if (ids == undefined || ids == null) {
      throw new BadRequestException(
        'You must select at least one item to delete.',
      );
    }

    const mailSent = await this.prismaService.mail_sent.findMany({
      where: {
        id: {
          in: ids,
        },
      },
    });

    if (mailSent.length !== ids.length) {
      throw new NotFoundException(getLocaleText('mail_sent_not_found', locale));
    }

    return this.prismaService.mail_sent.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });
  }
}
