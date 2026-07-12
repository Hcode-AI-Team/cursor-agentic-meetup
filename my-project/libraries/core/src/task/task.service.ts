import { Prisma, PrismaService } from '@hed-hog/api-prisma';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SettingService } from '../setting/setting.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly settingService: SettingService,
  ) {}

  /**
   * Executa todas as tarefas de limpeza do banco de dados diariamente à meia-noite.
   *
   * As tarefas são executadas sequencialmente para evitar contenção excessiva no banco.
   * Cada tarefa possui logging detalhado para monitoramento e troubleshooting.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async clear() {
    this.logger.verbose('++++++++++++++++++++++++++++++++++');
    this.logger.verbose('Running scheduled cleanup tasks');
    this.logger.verbose('++++++++++++++++++++++++++++++++++');

    await this.clearExpiredMfaChallenges();
    this.logger.verbose('++++++++++++++++++++++++++++++++++');

    await this.clearExpiredSessions();
    this.logger.verbose('++++++++++++++++++++++++++++++++++');

    await this.clearExpiredUserIdentifierChallenges();
    this.logger.verbose('++++++++++++++++++++++++++++++++++');

    await this.clearUnverifiedMfaWithExpiredChallenges();
    this.logger.verbose('++++++++++++++++++++++++++++++++++');

    await this.clearExpiredWebhookLogs();
    this.logger.verbose('++++++++++++++++++++++++++++++++++');

    await this.clearOldNotifications();
    this.logger.verbose('++++++++++++++++++++++++++++++++++');

    await this.clearStaleAsyncNotifications();
    this.logger.verbose('++++++++++++++++++++++++++++++++++');

    await this.clearOldAccessLogs();
    this.logger.verbose('++++++++++++++++++++++++++++++++++');

    this.logger.verbose('Finished scheduled cleanup tasks');
    this.logger.verbose('++++++++++++++++++++++++++++++++++');
  }

  /**
   * Limpa challenges de autenticação multifator (MFA) que já expiraram ou foram verificados.
   *
   * Remove registros da tabela user_mfa_challenge que:
   * - Expiraram (expires_at < now())
   * - Já foram verificados (verified_at IS NOT NULL)
   *
   * Por quê: Challenges expirados ou já utilizados não têm mais utilidade e ocupam
   * espaço desnecessário no banco de dados. A remoção periódica mantém a performance
   * das consultas e reduz o tamanho do banco.
   *
   * Limite: 20.000 registros por execução para evitar lock prolongado da tabela.
   */
  private async clearExpiredMfaChallenges(): Promise<void> {
    const settings = await this.settingService.getSettingValues(['cleanup-batch-limit']);
    const batchLimit = Number(settings['cleanup-batch-limit']) || 20000;
    this.logger.verbose('Starting cleanup of expired/verified MFA challenges');
    const startAt = Date.now();

    await this.prismaService.$executeRaw`
      WITH del AS (
        SELECT user_mfa_id
        FROM user_mfa_challenge
        WHERE expires_at < now()
          OR verified_at IS NOT NULL
        ORDER BY user_mfa_id
        LIMIT ${batchLimit}
      )
      DELETE FROM user_mfa_challenge c
      USING del
      WHERE c.user_mfa_id = del.user_mfa_id
    `;

    this.logger.verbose(
      `Expired/verified MFA challenges cleaned up in ${Date.now() - startAt}ms`,
    );
  }

  /**
   * Limpa sessões de usuário expiradas e antigas.
   *
   * Remove registros da tabela user_session que:
   * - Expiraram (expires_at < now())
   * - Foram criadas há mais de 90 dias (created_at < now() - 90 days)
   *
   * Por quê: Sessões expiradas não podem mais ser utilizadas para autenticação.
   * O critério adicional de 90 dias garante retenção de dados para auditoria/análise
   * antes da exclusão definitiva. Isso permite investigar padrões de uso e
   * possíveis problemas de segurança dentro de uma janela razoável.
   *
   * Limite: 20.000 registros por execução para evitar lock prolongado da tabela.
   */
  private async clearExpiredSessions(): Promise<void> {
    const settings = await this.settingService.getSettingValues(['cleanup-batch-limit', 'session-retention-days']);
    const batchLimit = Number(settings['cleanup-batch-limit']) || 20000;
    const retentionDays = Number(settings['session-retention-days']) || 90;
    this.logger.verbose('Starting cleanup of expired sessions');
    const startAt = Date.now();

    await this.prismaService.$executeRaw`
      WITH del AS (
        SELECT id
        FROM user_session
        WHERE expires_at < now()
          AND created_at < (now() - ${Prisma.sql`INTERVAL '${Prisma.raw(String(retentionDays))} days'`})
        ORDER BY id
        LIMIT ${batchLimit}
      )
      DELETE FROM user_session s
      USING del
      WHERE s.id = del.id
    `;

    this.logger.verbose(
      `Expired sessions cleaned up in ${Date.now() - startAt}ms`,
    );
  }

  /**
  * Limpa challenges de verificação de identificadores de usuário (email, telefone, etc.)
  * que expiraram e não foram verificados.
  *
  * Remove em cascata:
  * 1. user_identifier_challenge: challenges expirados não verificados
   *
   * Por quê: Quando um usuário tenta adicionar um novo email/telefone, é gerado um challenge
   * para verificação. Se o usuário não verifica dentro do prazo, tanto o challenge quanto
  * o challenge devem ser removidos para evitar:
  * - Acúmulo de challenges órfãos
  * - Confusão na interface (mostrar verificações pendentes indefinidamente)
   *
   * Limite: 20.000 registros por execução para evitar lock prolongado das tabelas.
   */
  private async clearExpiredUserIdentifierChallenges(): Promise<void> {
    const settings = await this.settingService.getSettingValues(['cleanup-batch-limit']);
    const batchLimit = Number(settings['cleanup-batch-limit']) || 20000;
    this.logger.verbose('Starting cleanup of expired user identifier challenges');
    const startAt = Date.now();

    await this.prismaService.$executeRaw`
      WITH expired_challenges AS (
        SELECT user_identifier_id
        FROM user_identifier_challenge
        WHERE expires_at < now() AND verified_at IS NULL
        ORDER BY user_identifier_id
        LIMIT ${batchLimit}
      ),
      deleted_challenges AS (
        DELETE FROM user_identifier_challenge c
        USING expired_challenges
        WHERE c.user_identifier_id = expired_challenges.user_identifier_id 
          AND c.verified_at IS NULL
        RETURNING c.user_identifier_id
      )
      SELECT 1
    `;

    this.logger.verbose(
      `Expired user identifier challenges cleaned up in ${Date.now() - startAt}ms`,
    );
  }

  /**
   * Limpa configurações de autenticação multifator (MFA) não verificadas cujos
   * challenges de verificação expiraram, removendo também os challenges associados.
   *
   * Remove em cascata:
   * 1. user_mfa_challenge: todos os challenges associados ao MFA não verificado
   * 2. user_mfa: configuração de MFA que nunca foi verificada e não possui challenges válidos
   *
   * Por quê: Quando um usuário configura MFA (TOTP, SMS, etc.), é gerado um challenge
   * para verificar que o método funciona. Se o usuário:
   * - Abandonou o processo de configuração (não verificou)
   * - Todos os challenges expiraram (não há tentativas válidas pendentes)
   *
   * Então a configuração incompleta deve ser removida porque:
   * - Não pode ser utilizada para autenticação (nunca foi verificada)
   * - Ocupa espaço desnecessário no banco
   * - Pode causar confusão na interface (métodos MFA "pendentes" indefinidamente)
   * - Permite ao usuário reconfigurar o método sem conflitos
   *
   * Limite: 20.000 registros por execução para evitar lock prolongado das tabelas.
   */
  private async clearUnverifiedMfaWithExpiredChallenges(): Promise<void> {
    const settings = await this.settingService.getSettingValues(['cleanup-batch-limit']);
    const batchLimit = Number(settings['cleanup-batch-limit']) || 20000;
    this.logger.verbose(
      'Starting cleanup of unverified MFA with expired challenges',
    );
    const startAt = Date.now();

    await this.prismaService.$executeRaw`
      WITH unverified_mfa AS (
        SELECT um.id
        FROM user_mfa um
        WHERE um.verified_at IS NULL
          AND NOT EXISTS (
            SELECT 1
            FROM user_mfa_challenge umc
            WHERE umc.user_mfa_id = um.id
              AND umc.expires_at >= now()
          )
        LIMIT ${batchLimit}
      ),
      deleted_challenges AS (
        DELETE FROM user_mfa_challenge umc
        USING unverified_mfa
        WHERE umc.user_mfa_id = unverified_mfa.id
        RETURNING umc.user_mfa_id
      )
      DELETE FROM user_mfa um
      USING unverified_mfa
      WHERE um.id = unverified_mfa.id
    `;

    this.logger.verbose(
      `Unverified MFA with expired challenges cleaned up in ${Date.now() - startAt}ms`,
    );
  }

  /**
   * Limpa logs antigos de execução de webhooks de entrada com base na política
   * de retenção configurada em settings.
   *
   * Remove registros da tabela webhook_call_log que:
   * - Foram criados há mais dias do que o valor de webhook-log-retention-days
   *
   * Os registros relacionados em webhook_action_log são removidos em cascata
   * pelo relacionamento FK com onDelete CASCADE.
   */
  private async clearExpiredWebhookLogs(): Promise<void> {
    const settings = await this.settingService.getSettingValues([
      'cleanup-batch-limit',
      'webhook-log-retention-days',
    ]);
    const batchLimit = Number(settings['cleanup-batch-limit']) || 20000;
    const retentionDays = Number(settings['webhook-log-retention-days']) || 30;
    this.logger.verbose('Starting cleanup of expired webhook call logs');
    const startAt = Date.now();

    await this.prismaService.$executeRaw`
      WITH del AS (
        SELECT id
        FROM webhook_call_log
        WHERE created_at < (now() - ${Prisma.sql`INTERVAL '${Prisma.raw(String(retentionDays))} days'`})
        ORDER BY id
        LIMIT ${batchLimit}
      )
      DELETE FROM webhook_call_log wcl
      USING del
      WHERE wcl.id = del.id
    `;

    this.logger.verbose(
      `Expired webhook call logs cleaned up in ${Date.now() - startAt}ms`,
    );
  }

  private async clearOldAccessLogs(): Promise<void> {
    const settings = await this.settingService.getSettingValues([
      'cleanup-batch-limit',
      'access-log-retention-days',
    ]);
    const batchLimit = Number(settings['cleanup-batch-limit']) || 20000;
    const retentionDays = Number(settings['access-log-retention-days']) || 30;
    this.logger.verbose('Starting cleanup of old access logs');
    const startAt = Date.now();

    await this.prismaService.$executeRaw`
      WITH del AS (
        SELECT id
        FROM access_log
        WHERE created_at < (now() - ${Prisma.sql`INTERVAL '${Prisma.raw(String(retentionDays))} days'`})
        ORDER BY id
        LIMIT ${batchLimit}
      )
      DELETE FROM access_log al
      USING del
      WHERE al.id = del.id
    `;

    this.logger.verbose(
      `Old access logs cleaned up in ${Date.now() - startAt}ms`,
    );
  }

  private async clearOldNotifications(): Promise<void> {
    const settings = await this.settingService.getSettingValues([
      'cleanup-batch-limit',
      'notification-retention-days',
    ]);
    const batchLimit = Number(settings['cleanup-batch-limit']) || 20000;
    const retentionDays = Number(settings['notification-retention-days']) || 30;
    this.logger.verbose('Starting cleanup of old notifications');
    const startAt = Date.now();

    await this.prismaService.$executeRaw`
      WITH del AS (
        SELECT id
        FROM notification
        WHERE created_at < (now() - ${Prisma.sql`INTERVAL '${Prisma.raw(String(retentionDays))} days'`})
        ORDER BY id
        LIMIT ${batchLimit}
      )
      DELETE FROM notification n
      USING del
      WHERE n.id = del.id
    `;

    this.logger.verbose(
      `Old notifications cleaned up in ${Date.now() - startAt}ms`,
    );
  }

  /**
   * Remove notificações assíncronas que ficaram "travadas" em andamento por tempo demais.
   *
   * Uma notificação assíncrona está em andamento quando possui acompanhamento de progresso
   * (progress IS NOT NULL) que ainda não chegou ao fim (progress < 100) e que nunca foi
   * finalizada (finished_at IS NULL). Se o job que a alimenta morre ou trava, a notificação
   * permanece eternamente "rodando".
   *
   * Remove registros da tabela notification que:
   * - Estão em andamento (progress IS NOT NULL AND progress < 100 AND finished_at IS NULL)
   * - Começaram a rodar há mais horas do que o valor de stale-async-notification-hours,
   *   medido por COALESCE(started_at, created_at)
   *
   * Por quê: notificações assíncronas presas poluem a interface (barra de progresso eterna)
   * e o banco. A remoção periódica baseada em tempo as descarta de forma previsível.
   *
   * Limite: cleanup-batch-limit registros por execução para evitar lock prolongado da tabela.
   */
  private async clearStaleAsyncNotifications(): Promise<void> {
    const settings = await this.settingService.getSettingValues([
      'cleanup-batch-limit',
      'stale-async-notification-hours',
    ]);
    const batchLimit = Number(settings['cleanup-batch-limit']) || 20000;
    const staleHours = Number(settings['stale-async-notification-hours']) || 24;
    this.logger.verbose('Starting cleanup of stale async notifications');
    const startAt = Date.now();

    await this.prismaService.$executeRaw`
      WITH del AS (
        SELECT id
        FROM notification
        WHERE progress IS NOT NULL
          AND progress < 100
          AND finished_at IS NULL
          AND COALESCE(started_at, created_at) < (now() - ${Prisma.sql`INTERVAL '${Prisma.raw(String(staleHours))} hours'`})
        ORDER BY id
        LIMIT ${batchLimit}
      )
      DELETE FROM notification n
      USING del
      WHERE n.id = del.id
    `;

    this.logger.verbose(
      `Stale async notifications cleaned up in ${Date.now() - startAt}ms`,
    );
  }
}
