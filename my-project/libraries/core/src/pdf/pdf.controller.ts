import { Public, Role } from '@hed-hog/api';
import { Controller, Get, Inject, Query, Res, forwardRef } from '@nestjs/common';
import { Response } from 'express';

import { GeneratePdfDTO } from './dto/generate-pdf.dto';
import { PdfService } from './pdf.service';

@Role()
@Controller('core/pdf')
export class PdfController {
  constructor(
    @Inject(forwardRef(() => PdfService))
    private readonly pdfService: PdfService,
  ) {}

  /**
   * GET /core/pdf/example
   *
   * Generates a sample hcode Institutional PDF using the Design System
   * template with the currently configured area color.
   * Publicly accessible — no auth required.
   */
  @Public()
  @Get('example')
  async example(@Query() query: GeneratePdfDTO, @Res() res: Response) {
    const area = query.area ?? 'consulting';
    const disposition = query.disposition ?? 'inline';

    const buffer = await this.pdfService.generatePdfFromTemplate(
      'hcode-institutional',
      {
        area,
        title: 'Inteligência aplicada.',
        subtitle:
          'De diagnóstico a aplicação: consultoria, formação e pesquisa em IA para empresas que querem liderar.',
        description:
          'Combinamos diagnóstico estratégico, formação corporativa e pesquisa aplicada para transformar ' +
          'a inteligência artificial em resultado mensurável para o seu negócio.',
        features: [
          {
            icon: 'discovery',
            title: 'Discovery & Diagnóstico',
            description:
              'Mapeamento de maturidade, gaps e oportunidades de IA na sua operação atual.',
          },
          {
            icon: 'strategy',
            title: 'Estratégia & Roadmap',
            description:
              'Plano de adoção com priorização por impacto, viabilidade e alinhamento cultural.',
          },
          {
            icon: 'governance',
            title: 'Governança & Ética',
            description:
              'Frameworks de uso responsável, políticas internas e compliance regulatório.',
          },
        ],
        tableHeaders: ['Fase', 'Entregável', 'Duração', 'Responsável'],
        tableRows: [
          ['01 · Discovery', 'Diagnóstico de maturidade IA', '2 semanas', 'hcode'],
          ['02 · Estratégia', 'Roadmap de adoção e priorização', '3 semanas', 'hcode + Cliente'],
          ['03 · Piloto', 'Implantação de caso de uso prioritário', '6 semanas', 'hcode + TI'],
          ['04 · Scale', 'Expansão e gestão de mudança', 'ongoing', 'Cliente (suporte hcode)'],
        ],
        metadata: [
          { label: 'Área', value: area.charAt(0).toUpperCase() + area.slice(1) },
          { label: 'Versão', value: '1.0' },
          { label: 'Data', value: new Date().toLocaleDateString('pt-BR') },
          { label: 'Design System', value: 'DS v1.0' },
        ],
        signatories: [
          { label: 'Responsável pelo Projeto' },
          { label: 'Aprovado por' },
        ],
      },
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${disposition}; filename="hcode-${area}-example.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}
