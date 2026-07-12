import { DeleteDTO } from '@hed-hog/api';
import { PaginationDTO, PaginationService } from '@hed-hog/api-pagination';
import { PrismaService } from '@hed-hog/api-prisma';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import * as pako from 'pako';
import { buildMailConfigFromIntegration } from './integration-profile.utils';
import { CreateDTO } from './dto/create.dto';
import {
  ConflictResolutionDTO,
  ImportProfileItemDTO,
} from './dto/import-confirm.dto';
import { UpdateDTO } from './dto/update.dto';
import { IntegrationCredentialCryptoService } from './integration-credential-crypto.service';
import { getSensitiveConfigKeys } from './integration-profile.secrets';

type IntegrationProfileExportItem = {
  slug: string;
  name: string;
  type_slug: string;
  provider_slug: string;
  config: Record<string, unknown> | null;
  is_active: boolean;
};

type IntegrationProfileImportEnvelope = {
  type: 'integration-profile';
  version: 1;
  generated_at: string;
  include_secrets: boolean;
  data: IntegrationProfileExportItem[];
};

type ValidatedImportItem = {
  index: number;
  slug: string;
  name: string;
  type_slug: string;
  provider_slug: string;
  config: Record<string, unknown> | null;
  is_active: boolean;
  has_conflict: boolean;
};

type InvalidImportItem = {
  index: number;
  slug?: string;
  errors: string[];
};

@Injectable()
export class IntegrationProfileService {
  constructor(
    @Inject(forwardRef(() => PrismaService))
    private readonly prismaService: PrismaService,
    @Inject(forwardRef(() => PaginationService))
    private readonly paginationService: PaginationService,
    @Inject(forwardRef(() => IntegrationCredentialCryptoService))
    private readonly credentialCrypto: IntegrationCredentialCryptoService,
  ) {}

  async listTypes() {
    return this.prismaService.integration_type.findMany({
      orderBy: { id: 'asc' },
      select: {
        id: true,
        slug: true,
        icon: true,
        integration_type_locale: {
          select: { name: true, locale: { select: { code: true } } },
        },
      },
    });
  }

  async listProviders(typeId?: number, typeSlug?: string) {
    const normalizedTypeSlug = String(typeSlug ?? '').trim();

    return this.prismaService.integration_provider.findMany({
      where: {
        ...(typeId ? { type_id: typeId } : {}),
        ...(normalizedTypeSlug
          ? { integration_type: { slug: normalizedTypeSlug } }
          : {}),
      },
      orderBy: { id: 'asc' },
      select: {
        id: true,
        slug: true,
        type_id: true,
        integration_provider_locale: {
          select: { name: true, locale: { select: { code: true } } },
        },
      },
    });
  }

  async list(
    paginationParams: PaginationDTO,
    typeId?: number,
    typeSlug?: string,
    providerSlug?: string,
    slug?: string,
  ) {
    const fields = ['slug', 'name'];
    const OR = this.prismaService.createInsensitiveSearch(fields, paginationParams);
    const normalizedTypeSlug = String(typeSlug ?? '').trim();
    const normalizedProviderSlug = String(providerSlug ?? '').trim();
    const normalizedSlug = String(slug ?? '').trim();

    const result = await this.paginationService.paginate(
      this.prismaService.integration_profile,
      paginationParams,
      {
        where: {
          ...(OR.length > 0 ? { OR } : {}),
          ...(typeId ? { type_id: typeId } : {}),
          ...(normalizedTypeSlug
            ? { integration_type: { slug: normalizedTypeSlug } }
            : {}),
          ...(normalizedProviderSlug
            ? { integration_provider: { slug: normalizedProviderSlug } }
            : {}),
          ...(normalizedSlug ? { slug: normalizedSlug } : {}),
        },
        include: {
          integration_type: {
            select: {
              slug: true,
              icon: true,
              integration_type_locale: {
                select: { name: true, locale: { select: { code: true } } },
              },
            },
          },
          integration_provider: {
            select: {
              slug: true,
              integration_provider_locale: {
                select: { name: true, locale: { select: { code: true } } },
              },
            },
          },
        },
        orderBy: [{ updated_at: 'desc' }, { id: 'desc' }],
      },
    );

    const items = Array.isArray(result.data) ? result.data : [];
    if (items.length > 0) {
      const ids = items.map((p: any) => p.id as number);
      const counts = await this.prismaService.$queryRaw<
        { id: number; uses_count: bigint }[]
      >`
        SELECT
          ip.id,
          (
            COALESCE((SELECT COUNT(*)::int FROM campaign       WHERE integration_profile_id = ip.id), 0) +
            COALESCE((SELECT COUNT(*)::int FROM webhook_action WHERE integration_profile_id = ip.id), 0)
          ) AS uses_count
        FROM integration_profile ip
        WHERE ip.id = ANY(${ids}::int[])
      `;

      const countMap = new Map(
        counts.map((r) => [r.id, Number(r.uses_count)]),
      );

      result.data = items.map((p: any) => ({
        ...p,
        // Não devolve segredos na listagem (middleware já decifrou; mascaramos).
        config: this.credentialCrypto.maskConfig(
          p.integration_provider?.slug ?? '',
          p.config as Record<string, unknown>,
        ),
        uses_count: countMap.get(p.id) ?? 0,
      }));
    }

    return result;
  }

  /**
   * Resolve o config do perfil de integração ATIVO para um par tipo/provider — uso
   * server-side por serviços que precisam das credenciais (ex.: InfraScaler do
   * autoscaling). Opcionalmente fixa um slug específico (vindo de uma setting). É o ponto
   * único de acesso às credenciais armazenadas no Perfil de Integração.
   */
  async getActiveProfileConfig(
    typeSlug: string,
    providerSlug: string,
    options?: { profileSlug?: string; profileId?: number },
  ): Promise<{ id: number; slug: string; config: Record<string, unknown> }> {
    // O middleware do PrismaService decifra config nesta leitura (uso interno).
    const profile = await this.prismaService.integration_profile.findFirst({
      where: {
        is_active: true,
        integration_type: { slug: typeSlug },
        integration_provider: { slug: providerSlug },
        ...(options?.profileId ? { id: options.profileId } : {}),
        ...(options?.profileSlug ? { slug: options.profileSlug } : {}),
      },
      orderBy: [{ updated_at: 'desc' }, { id: 'desc' }],
      select: { id: true, slug: true, config: true },
    });

    if (!profile) {
      const ref = options?.profileId
        ? ` / id ${options.profileId}`
        : options?.profileSlug
          ? ` / slug "${options.profileSlug}"`
          : '';
      throw new NotFoundException(
        `No active integration profile found for type "${typeSlug}" / provider "${providerSlug}"${ref}.`,
      );
    }

    return {
      id: profile.id,
      slug: profile.slug,
      config: (profile.config as Record<string, unknown>) ?? {},
    };
  }

  /**
   * Resolve um perfil ATIVO do tipo `infrastructure` (DigitalOcean, Kubernetes, …) por
   * SLUG (vindo de uma setting) ou por ID (seleção direta na UI) — ou o mais recente se
   * nada for dado. Retorna o slug do provider (para dispatch) e o config já decifrado
   * pelo middleware. Uso interno do autoscaling.
   */
  async getActiveInfrastructureProfile(
    options?: { profileSlug?: string; profileId?: number },
  ): Promise<{
    id: number;
    slug: string;
    providerSlug: string;
    config: Record<string, unknown>;
  }> {
    const normalizedSlug = String(options?.profileSlug ?? '').trim();
    const profile = await this.prismaService.integration_profile.findFirst({
      where: {
        is_active: true,
        integration_type: { slug: 'infrastructure' },
        ...(options?.profileId ? { id: options.profileId } : {}),
        ...(normalizedSlug ? { slug: normalizedSlug } : {}),
      },
      orderBy: [{ updated_at: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        slug: true,
        config: true,
        integration_provider: { select: { slug: true } },
      },
    });

    if (!profile) {
      const ref = options?.profileId
        ? ` for id ${options.profileId}`
        : normalizedSlug
          ? ` for slug "${normalizedSlug}"`
          : '';
      throw new NotFoundException(
        `No active infrastructure integration profile found${ref}.`,
      );
    }

    return {
      id: profile.id,
      slug: profile.slug,
      providerSlug: profile.integration_provider?.slug ?? '',
      config: (profile.config as Record<string, unknown>) ?? {},
    };
  }

  async get(id: number) {
    const profile = await this.prismaService.integration_profile.findUnique({
      where: { id },
      include: {
        integration_type: {
          select: {
            slug: true,
            icon: true,
            integration_type_locale: {
              select: { name: true, locale: { select: { code: true } } },
            },
          },
        },
        integration_provider: {
          select: {
            slug: true,
            integration_provider_locale: {
              select: { name: true, locale: { select: { code: true } } },
            },
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException(
        `Integration profile with id ${id} not found.`,
      );
    }

    // Não devolve segredos ao cliente (middleware já decifrou; mascaramos para a UI).
    return {
      ...profile,
      config: this.credentialCrypto.maskConfig(
        profile.integration_provider?.slug ?? '',
        profile.config as Record<string, unknown>,
      ),
    };
  }

  /**
   * Igual a `get(id)`, porém resolvendo o perfil pelo SLUG (valor estável guardado em
   * settings). Reusa `get()` para manter o mesmo include e o mascaramento de segredos.
   */
  async getBySlug(slug: string) {
    const normalized = String(slug ?? '').trim();
    if (!normalized) {
      throw new NotFoundException('Integration profile slug is empty.');
    }

    const found = await this.prismaService.integration_profile.findUnique({
      where: { slug: normalized },
      select: { id: true },
    });

    if (!found) {
      throw new NotFoundException(
        `Integration profile with slug "${normalized}" not found.`,
      );
    }

    return this.get(found.id);
  }

  async create(data: CreateDTO) {
    await this.ensureSlugIsAvailable(data.slug);
    await this.validateTypeAndProvider(data.type_id, data.provider_id);

    const providerSlug = await this.getProviderSlug(data.provider_id);
    const config = this.credentialCrypto.encryptConfig(
      providerSlug,
      (data.config as Record<string, unknown>) ?? null,
    );

    return this.prismaService.integration_profile.create({
      data: {
        slug: data.slug.trim(),
        name: data.name.trim(),
        type_id: data.type_id,
        provider_id: data.provider_id,
        config: (config as object) ?? null,
        is_active: data.is_active ?? true,
      },
    });
  }

  /** Resolve o slug do provider a partir do id (para saber as chaves sensíveis). */
  private async getProviderSlug(providerId: number): Promise<string> {
    const provider = await this.prismaService.integration_provider.findUnique({
      where: { id: providerId },
      select: { slug: true },
    });
    return provider?.slug ?? '';
  }

  async update({ id, data }: { id: number; data: UpdateDTO }) {
    const existing = await this.prismaService.integration_profile.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(
        `Integration profile with id ${id} not found.`,
      );
    }

    if (data.slug && data.slug !== existing.slug) {
      await this.ensureSlugIsAvailable(data.slug);
    }

    const type_id = data.type_id ?? existing.type_id;
    const provider_id = data.provider_id ?? existing.provider_id;
    await this.validateTypeAndProvider(type_id, provider_id);

    const providerSlug = await this.getProviderSlug(provider_id);
    // `existing.config` já vem DECIFRADO pelo middleware. Em update parcial, mantemos os
    // segredos enviados em branco ("deixe em branco para manter") e recifra-mos tudo.
    const storedDecrypted = (existing.config as Record<string, unknown>) ?? null;
    const finalPlain =
      data.config !== undefined
        ? this.credentialCrypto.mergeKeepingStoredSecrets(
            providerSlug,
            (data.config as Record<string, unknown>) ?? null,
            storedDecrypted,
          )
        : storedDecrypted;
    const config = this.credentialCrypto.encryptConfig(providerSlug, finalPlain);

    return this.prismaService.integration_profile.update({
      where: { id },
      data: {
        slug: data.slug?.trim() ?? existing.slug,
        name: data.name?.trim() ?? existing.name,
        type_id,
        provider_id,
        config: (config as object) ?? null,
        is_active: data.is_active ?? existing.is_active,
      },
    });
  }

  async delete({ ids }: DeleteDTO): Promise<{ count: number }> {
    if (!ids?.length) {
      throw new BadRequestException(
        'You must select at least one item to delete.',
      );
    }

    return this.prismaService.integration_profile.deleteMany({
      where: { id: { in: ids } },
    });
  }

  async test(data: CreateDTO) {
    await this.validateTypeAndProvider(data.type_id, data.provider_id);

    const provider = await this.prismaService.integration_provider.findUnique({
      where: { id: data.provider_id },
      select: {
        slug: true,
        integration_type: {
          select: {
            slug: true,
          },
        },
      },
    });

    if (!provider) {
      throw new BadRequestException(
        `Provider with id ${data.provider_id} not found.`,
      );
    }

    if (provider.integration_type.slug !== 'email') {
      throw new BadRequestException(
        'Integration profile test is only available for email type.',
      );
    }

    // "Deixe em branco para manter": ao testar na edição, herda os segredos já
    // armazenados (decifrados pelo middleware) para os campos vazios/mascarados.
    let effectiveConfig = (data.config as Record<string, unknown>) ?? null;
    const stored = await this.prismaService.integration_profile.findUnique({
      where: { slug: data.slug.trim() },
      select: { config: true },
    });
    if (stored?.config) {
      effectiveConfig = this.credentialCrypto.mergeKeepingStoredSecrets(
        provider.slug,
        effectiveConfig,
        stored.config as Record<string, unknown>,
      ) as Record<string, unknown>;
    }

    buildMailConfigFromIntegration(provider.slug, effectiveConfig);

    const destination = String(
      (effectiveConfig as Record<string, unknown> | null | undefined)?.from_email ??
        '',
    ).trim();

    if (!destination) {
      throw new BadRequestException('Sender email is required.');
    }

    return {
      success: true,
      destination,
    };
  }

  async exportProfiles({
    ids,
    includeSecrets = false,
  }: {
    ids?: number[];
    includeSecrets?: boolean;
  }): Promise<Buffer> {
    const items = await this.exportProfileItemsByIds(ids, includeSecrets);

    const envelope: IntegrationProfileImportEnvelope = {
      type: 'integration-profile',
      version: 1,
      generated_at: new Date().toISOString(),
      include_secrets: includeSecrets,
      // O envelope de integration-profile não carrega o id de origem.
      data: items.map(({ id: _id, ...rest }) => rest),
    };

    const compressed = pako.gzip(JSON.stringify(envelope));
    return Buffer.from(compressed);
  }

  /**
   * Returns export-ready profile items (slug/name/type_slug/provider_slug/config/
   * is_active) plus the source-environment `id`. Used by callers that must reference
   * profiles by id — e.g. the agent workflow export, which remaps node
   * `integrationProfileId` through id → slug → (destination) id. `config` is decrypted
   * defensively and sanitized per `includeSecrets`.
   */
  async exportProfileItemsByIds(
    ids: number[] | undefined,
    includeSecrets: boolean,
  ): Promise<(IntegrationProfileExportItem & { id: number })[]> {
    const rows = await this.prismaService.integration_profile.findMany({
      where: ids?.length ? { id: { in: ids } } : undefined,
      select: {
        id: true,
        slug: true,
        name: true,
        config: true,
        is_active: true,
        integration_type: {
          select: { slug: true },
        },
        integration_provider: {
          select: { slug: true },
        },
      },
      orderBy: [{ slug: 'asc' }],
    });

    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      type_slug: row.integration_type.slug,
      provider_slug: row.integration_provider.slug,
      config: this.sanitizeConfigForExport(
        row.integration_provider.slug,
        // Decrypt defensivo: garante que o arquivo nunca leve um envelope preso à chave
        // da origem (o middleware já decifra, isto é redundância de segurança).
        this.credentialCrypto.decryptConfig(
          row.config as Record<string, unknown> | null,
        ) as Record<string, unknown> | null,
        includeSecrets,
      ),
      is_active: row.is_active,
    }));
  }

  /**
   * Validates that each item's type_slug/provider_slug exist and that the provider
   * belongs to the type. Returns a map of item slug → list of errors (empty = valid).
   * Reused by external importers (e.g. the agent workflow import) to validate the
   * credential profiles bundled inside a workflow file.
   */
  async validateImportItems(
    items: { slug: string; type_slug: string; provider_slug: string }[],
  ): Promise<Map<string, string[]>> {
    const typeMap = new Map(
      (
        await this.prismaService.integration_type.findMany({
          select: { id: true, slug: true },
        })
      ).map((row) => [row.slug.toLowerCase(), row]),
    );

    const providerMap = new Map(
      (
        await this.prismaService.integration_provider.findMany({
          select: { id: true, slug: true, type_id: true },
        })
      ).map((row) => [row.slug.toLowerCase(), row]),
    );

    const out = new Map<string, string[]>();
    for (const item of items) {
      const errors: string[] = [];
      const typeSlug = String(item.type_slug ?? '').trim().toLowerCase();
      const providerSlug = String(item.provider_slug ?? '').trim().toLowerCase();

      const type = typeMap.get(typeSlug);
      const provider = providerMap.get(providerSlug);
      if (!typeSlug) errors.push('Missing type_slug.');
      else if (!type) errors.push(`Unknown type_slug "${typeSlug}".`);
      if (!providerSlug) errors.push('Missing provider_slug.');
      else if (!provider) errors.push(`Unknown provider_slug "${providerSlug}".`);
      if (type && provider && provider.type_id !== type.id) {
        errors.push(
          `Provider "${providerSlug}" does not belong to type "${typeSlug}".`,
        );
      }

      out.set(item.slug, errors);
    }

    return out;
  }

  async validateImportFile(file: MulterFile) {
    const envelope = this.parseImportEnvelope(file);

    const typeMap = new Map(
      (
        await this.prismaService.integration_type.findMany({
          select: { id: true, slug: true },
        })
      ).map((row) => [row.slug.toLowerCase(), row]),
    );

    const providerMap = new Map(
      (
        await this.prismaService.integration_provider.findMany({
          select: { id: true, slug: true, type_id: true },
        })
      ).map((row) => [row.slug.toLowerCase(), row]),
    );

    const firstSlugIndex = new Map<string, number>();
    const validItems: Omit<ValidatedImportItem, 'has_conflict'>[] = [];
    const invalidItems: InvalidImportItem[] = [];

    envelope.data.forEach((item, index) => {
      const errors: string[] = [];
      const slug = String(item?.slug ?? '').trim();
      const name = String(item?.name ?? '').trim();
      const typeSlug = String(item?.type_slug ?? '')
        .trim()
        .toLowerCase();
      const providerSlug = String(item?.provider_slug ?? '')
        .trim()
        .toLowerCase();

      if (!slug) errors.push('Missing slug.');
      if (!name) errors.push(`Missing name for slug "${slug || index}".`);
      if (!typeSlug) errors.push(`Missing type_slug for slug "${slug || index}".`);
      if (!providerSlug) {
        errors.push(`Missing provider_slug for slug "${slug || index}".`);
      }

      if (slug) {
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
          errors.push(`Invalid slug format "${slug}".`);
        }

        if (firstSlugIndex.has(slug)) {
          const originalIndex = firstSlugIndex.get(slug);
          errors.push(
            `Duplicate slug "${slug}" in file (already used at index ${originalIndex}).`,
          );
        } else {
          firstSlugIndex.set(slug, index);
        }
      }

      const type = typeMap.get(typeSlug);
      if (!type && typeSlug) {
        errors.push(`Unknown type_slug "${typeSlug}".`);
      }

      const provider = providerMap.get(providerSlug);
      if (!provider && providerSlug) {
        errors.push(`Unknown provider_slug "${providerSlug}".`);
      }

      if (type && provider && provider.type_id !== type.id) {
        errors.push(
          `Provider "${providerSlug}" does not belong to type "${typeSlug}".`,
        );
      }

      if (
        item?.config !== null &&
        item?.config !== undefined &&
        (typeof item.config !== 'object' || Array.isArray(item.config))
      ) {
        errors.push(`Invalid config for slug "${slug || index}".`);
      }

      if (errors.length > 0) {
        invalidItems.push({ index, slug: slug || undefined, errors });
        return;
      }

      validItems.push({
        index,
        slug,
        name,
        type_slug: typeSlug,
        provider_slug: providerSlug,
        config: (item.config as Record<string, unknown> | null) ?? null,
        is_active: item.is_active ?? true,
      });
    });

    const existingSlugs = new Set(
      (
        await this.prismaService.integration_profile.findMany({
          where: {
            slug: {
              in: validItems.map((item) => item.slug),
            },
          },
          select: { slug: true },
        })
      ).map((row) => row.slug),
    );

    const profiles: ValidatedImportItem[] = validItems.map((item) => ({
      ...item,
      has_conflict: existingSlugs.has(item.slug),
    }));

    const conflictSlugs = profiles
      .filter((item) => item.has_conflict)
      .map((item) => item.slug);

    return {
      format: {
        type: envelope.type,
        version: envelope.version,
        generated_at: envelope.generated_at,
        include_secrets: envelope.include_secrets,
      },
      total_profiles: envelope.data.length,
      valid_profiles: profiles.length,
      invalid_profiles: invalidItems.length,
      conflict_profiles: conflictSlugs.length,
      importable_profiles: profiles.length - conflictSlugs.length,
      conflict_slugs: conflictSlugs,
      profiles,
      invalid_items: invalidItems,
    };
  }

  async confirmImport({
    profiles,
    conflictResolutions,
  }: {
    profiles: ImportProfileItemDTO[];
    conflictResolutions?: ConflictResolutionDTO[];
  }) {
    if (!profiles?.length) {
      throw new BadRequestException('No profiles provided for import.');
    }

    const { counts } = await this.ensureProfilesBySlug(
      profiles,
      conflictResolutions,
    );

    return {
      success: true,
      total_received: profiles.length,
      created: counts.created,
      replaced: counts.replaced,
      renamed: counts.renamed,
      ignored: counts.ignored,
      imported: counts.created + counts.replaced + counts.renamed,
    };
  }

  /**
   * Creates/updates integration profiles from import items, applying per-slug
   * conflict resolutions, and returns a map from each item's (original) slug to the
   * resulting profile id + applied action — plus aggregate counts. Re-encrypts config
   * with the destination system key. Used by `confirmImport` (counts) and by the agent
   * workflow import (which needs the resulting ids to remap node integrationProfileId).
   *
   * For `ignore` on a conflicting slug, the existing profile is left untouched but its
   * id is still returned so callers can relink references to the local profile.
   */
  async ensureProfilesBySlug(
    profiles: ImportProfileItemDTO[],
    conflictResolutions?: ConflictResolutionDTO[],
  ): Promise<{
    results: Map<
      string,
      {
        id: number;
        slug: string;
        action: 'created' | 'replaced' | 'renamed' | 'ignored';
      }
    >;
    counts: { created: number; replaced: number; renamed: number; ignored: number };
  }> {
    const results = new Map<
      string,
      {
        id: number;
        slug: string;
        action: 'created' | 'replaced' | 'renamed' | 'ignored';
      }
    >();

    if (!profiles?.length) {
      return { results, counts: { created: 0, replaced: 0, renamed: 0, ignored: 0 } };
    }

    const resolutionMap = new Map<string, ConflictResolutionDTO['action']>(
      (conflictResolutions ?? []).map((resolution) => [
        resolution.slug,
        resolution.action,
      ]),
    );

    const typeMap = new Map(
      (
        await this.prismaService.integration_type.findMany({
          select: { id: true, slug: true },
        })
      ).map((row) => [row.slug.toLowerCase(), row]),
    );

    const providerMap = new Map(
      (
        await this.prismaService.integration_provider.findMany({
          select: { id: true, slug: true, type_id: true },
        })
      ).map((row) => [row.slug.toLowerCase(), row]),
    );

    const duplicatedSlugs = new Set<string>();
    const seenSlugs = new Set<string>();
    profiles.forEach((item) => {
      const slug = item.slug.trim();
      if (seenSlugs.has(slug)) {
        duplicatedSlugs.add(slug);
      }
      seenSlugs.add(slug);
    });

    if (duplicatedSlugs.size > 0) {
      throw new BadRequestException(
        `File has duplicated slugs: ${Array.from(duplicatedSlugs).join(', ')}`,
      );
    }

    const existingBySlug = new Map(
      (
        await this.prismaService.integration_profile.findMany({
          where: { slug: { in: profiles.map((profile) => profile.slug.trim()) } },
          select: { id: true, slug: true },
        })
      ).map((row) => [row.slug, row]),
    );

    let created = 0;
    let replaced = 0;
    let ignored = 0;
    let renamed = 0;

    for (const item of profiles) {
      const slug = item.slug.trim();
      const name = item.name.trim();
      const typeSlug = item.type_slug.trim().toLowerCase();
      const providerSlug = item.provider_slug.trim().toLowerCase();

      if (!slug || !name || !typeSlug || !providerSlug) {
        throw new BadRequestException(
          `Invalid profile payload for slug "${slug || '<empty>'}".`,
        );
      }

      const type = typeMap.get(typeSlug);
      if (!type) {
        throw new BadRequestException(`Unknown type_slug "${typeSlug}".`);
      }

      const provider = providerMap.get(providerSlug);
      if (!provider) {
        throw new BadRequestException(`Unknown provider_slug "${providerSlug}".`);
      }

      if (provider.type_id !== type.id) {
        throw new BadRequestException(
          `Provider "${providerSlug}" does not belong to type "${typeSlug}".`,
        );
      }

      const existing = existingBySlug.get(slug);
      const data = {
        slug,
        name,
        type_id: type.id,
        provider_id: provider.id,
        // Import traz texto puro (do .hedhog); cifra com a chave do sistema de DESTINO.
        config: (this.credentialCrypto.encryptConfig(
          providerSlug,
          (item.config as Record<string, unknown>) ?? null,
        ) as object | null) ?? null,
        is_active: item.is_active ?? true,
      };

      if (!existing) {
        const createdRow = await this.prismaService.integration_profile.create({
          data,
          select: { id: true },
        });
        results.set(slug, { id: createdRow.id, slug, action: 'created' });
        created += 1;
        continue;
      }

      const action = resolutionMap.get(slug) ?? 'ignore';
      if (action === 'ignore') {
        results.set(slug, { id: existing.id, slug, action: 'ignored' });
        ignored += 1;
        continue;
      }

      if (action === 'replace') {
        await this.prismaService.integration_profile.update({
          where: { id: existing.id },
          data: {
            name: data.name,
            type_id: data.type_id,
            provider_id: data.provider_id,
            config: data.config,
            is_active: data.is_active,
          },
        });
        results.set(slug, { id: existing.id, slug, action: 'replaced' });
        replaced += 1;
        continue;
      }

      const newSlug = await this.generateUniqueSlug(slug);
      const renamedRow = await this.prismaService.integration_profile.create({
        data: {
          ...data,
          slug: newSlug,
        },
        select: { id: true },
      });
      results.set(slug, { id: renamedRow.id, slug: newSlug, action: 'renamed' });
      renamed += 1;
    }

    return { results, counts: { created, replaced, renamed, ignored } };
  }

  private async ensureSlugIsAvailable(slug: string) {
    const existing = await this.prismaService.integration_profile.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException(
        `Integration profile with slug "${slug}" already exists.`,
      );
    }
  }

  private async validateTypeAndProvider(type_id: number, provider_id: number) {
    const provider = await this.prismaService.integration_provider.findUnique({
      where: { id: provider_id },
      select: { id: true, type_id: true },
    });

    if (!provider) {
      throw new BadRequestException(
        `Provider with id ${provider_id} not found.`,
      );
    }

    if (provider.type_id !== type_id) {
      throw new BadRequestException(
        `Provider ${provider_id} does not belong to type ${type_id}.`,
      );
    }
  }

  private parseImportEnvelope(file: MulterFile): IntegrationProfileImportEnvelope {
    let parsed: unknown;
    try {
      const decompressed = pako.ungzip(file.buffer, { to: 'string' });
      parsed = JSON.parse(decompressed);
    } catch {
      throw new BadRequestException(
        'File is not a valid .hedhog archive or is corrupted.',
      );
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new BadRequestException('Invalid .hedhog payload format.');
    }

    const payload = parsed as Partial<IntegrationProfileImportEnvelope>;
    if (payload.type !== 'integration-profile') {
      throw new BadRequestException(
        `Invalid .hedhog type "${String(payload.type ?? '')}".`,
      );
    }

    if (payload.version !== 1) {
      throw new BadRequestException(
        `Unsupported .hedhog version "${String(payload.version ?? '')}".`,
      );
    }

    if (!Array.isArray(payload.data)) {
      throw new BadRequestException('Invalid .hedhog data: expected an array.');
    }

    return {
      type: 'integration-profile',
      version: 1,
      generated_at:
        typeof payload.generated_at === 'string'
          ? payload.generated_at
          : new Date().toISOString(),
      include_secrets: payload.include_secrets === true,
      data: payload.data as IntegrationProfileExportItem[],
    };
  }

  private sanitizeConfigForExport(
    providerSlug: string,
    config: Record<string, unknown> | null,
    includeSecrets: boolean,
  ): Record<string, unknown> | null {
    if (!config || includeSecrets) return config;

    const hiddenKeys = getSensitiveConfigKeys(providerSlug);
    if (hiddenKeys.length === 0) return config;

    const sanitized = { ...config };
    hiddenKeys.forEach((key) => {
      delete sanitized[key];
    });

    return sanitized;
  }

  private async generateUniqueSlug(baseSlug: string): Promise<string> {
    let candidate = `${baseSlug}-copy`;
    let suffix = 1;

    // Gera slug único determinístico para imports com conflito e opção de renomear.
    while (
      await this.prismaService.integration_profile.findUnique({
        where: { slug: candidate },
        select: { id: true },
      })
    ) {
      candidate = `${baseSlug}-copy-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }
}
