'use client';

import { EmptyState } from '@/components/entity-list';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Role } from '@hed-hog/api-types';
import { useApp, useQuery } from '@hed-hog/next-app-provider';
import { CheckCheck, Eye, Loader2, Search, ShieldCheck, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { UserAccessSheet } from './user-access-sheet';

type CustomRole = Role & {
  isAssigned: boolean;
};

type PermissionsSectionProps = {
  userId: number;
  userName?: string;
  onRoleChange?: () => void;
};

export function PermissionsSection({
  userId,
  userName,
  onRoleChange,
}: PermissionsSectionProps) {
  const t = useTranslations('core.UserPage');
  const { request, currentLocaleCode } = useApp();
  const [togglingRoleId, setTogglingRoleId] = useState<number | null>(null);
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [accessSheetOpen, setAccessSheetOpen] = useState(false);

  const {
    data: userRoles = [],
    isLoading: isLoadingUserRoles,
    refetch: refetchUserRoles,
  } = useQuery<CustomRole[]>({
    queryKey: ['user-roles', userId, currentLocaleCode],
    queryFn: async () => {
      const response = await request<CustomRole[]>({
        url: `/user/${userId}/role`,
        method: 'GET',
      });
      return response.data || [];
    },
    enabled: !!userId,
  });

  const handleToggleRole = async (roleId: number, isAssigned: boolean) => {
    setTogglingRoleId(roleId);
    try {
      if (isAssigned) {
        await request({
          url: `/user/${userId}/role/${roleId}`,
          method: 'DELETE',
        });
        toast.success(t('roleRemoved'));
      } else {
        await request({
          url: `/user/${userId}/role/${roleId}`,
          method: 'POST',
        });
        toast.success(t('roleAssigned'));
      }
      await refetchUserRoles();
      onRoleChange?.();
    } catch {
      toast.error(
        isAssigned ? t('errorRemovingRole') : t('errorAssigningRole')
      );
    } finally {
      setTogglingRoleId(null);
    }
  };

  const handleAssignAll = async () => {
    const unassigned = userRoles.filter((r) => !r.isAssigned && r.id);
    if (!unassigned.length) return;
    setIsBulkLoading(true);
    try {
      await Promise.all(
        unassigned.map((role) =>
          request({ url: `/user/${userId}/role/${role.id}`, method: 'POST' })
        )
      );
      toast.success(t('allRolesAssigned'));
      await refetchUserRoles();
      onRoleChange?.();
    } catch {
      toast.error(t('errorBulkAssigningRoles'));
    } finally {
      setIsBulkLoading(false);
    }
  };

  const handleRemoveAll = async () => {
    const assigned = userRoles.filter((r) => r.isAssigned && r.id);
    if (!assigned.length) return;
    setIsBulkLoading(true);
    try {
      await Promise.all(
        assigned.map((role) =>
          request({ url: `/user/${userId}/role/${role.id}`, method: 'DELETE' })
        )
      );
      toast.success(t('allRolesRemoved'));
      await refetchUserRoles();
      onRoleChange?.();
    } catch {
      toast.error(t('errorBulkRemovingRoles'));
    } finally {
      setIsBulkLoading(false);
    }
  };

  const filteredRoles = userRoles.filter((role) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      role.name?.toLowerCase().includes(q) ||
      role.slug?.toLowerCase().includes(q) ||
      role.description?.toLowerCase().includes(q)
    );
  });

  const hasUnassigned = userRoles.some((r) => !r.isAssigned);
  const hasAssigned = userRoles.some((r) => r.isAssigned);
  const isDisabled = isBulkLoading || !!togglingRoleId;

  if (isLoadingUserRoles) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">
          {t('loadingRoles')}
        </span>
      </div>
    );
  }

  if (!userRoles || userRoles.length === 0) {
    return (
      <EmptyState
        className="min-h-60 py-10"
        icon={<ShieldCheck className="h-12 w-12" />}
        title={t('noRolesAvailable')}
      />
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder={t('filterRolesPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        {hasUnassigned && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={handleAssignAll}
                disabled={isDisabled}
                aria-label={t('addAllRoles')}
              >
                {isBulkLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCheck className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('addAllRoles')}</p>
            </TooltipContent>
          </Tooltip>
        )}
        {hasAssigned && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={handleRemoveAll}
                disabled={isDisabled}
                aria-label={t('removeAllRoles')}
              >
                {isBulkLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('removeAllRoles')}</p>
            </TooltipContent>
          </Tooltip>
        )}
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 gap-1.5"
          onClick={() => setAccessSheetOpen(true)}
        >
          <Eye className="h-4 w-4" />
          {t('viewAccessButton')}
        </Button>
      </div>

      {filteredRoles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Search className="h-8 w-8 text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">{t('noRolesMatch')}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border/70 bg-background">
          <Table className="table-fixed">
            <TableHeader className="bg-muted/20">
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-8 px-2 text-[11px] font-medium text-muted-foreground">
                  Cargo
                </TableHead>
                <TableHead className="h-8 w-37.5 px-2 text-[11px] font-medium text-muted-foreground">
                  Slug
                </TableHead>
                <TableHead className="h-8 w-19.5 px-2 text-right text-[11px] font-medium text-muted-foreground">
                  Acesso
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRoles.map((role, index) => {
                const isToggling = togglingRoleId === role.id;

                return (
                  <TableRow
                    key={role.id ?? `role-${index}`}
                    className={
                      role.isAssigned
                        ? 'bg-primary/5 hover:bg-primary/5'
                        : 'hover:bg-muted/20'
                    }
                  >
                    <TableCell className="px-2 py-1.5 align-middle">
                      <div className="flex min-w-0 items-start gap-1.5">
                        <div
                          className={`mt-0.5 rounded-md p-0.5 ${
                            role.isAssigned ? 'bg-primary/10' : 'bg-muted/70'
                          }`}
                        >
                          <ShieldCheck
                            className={`h-3.5 w-3.5 ${
                              role.isAssigned
                                ? 'text-primary'
                                : 'text-muted-foreground'
                            }`}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-semibold leading-4 text-foreground">
                            {role.name}
                          </div>
                          {role.description && (
                            <p className="truncate text-[11px] leading-3 text-muted-foreground">
                              {role.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-2 py-1.5 align-middle">
                      {role.slug ? (
                        <Badge
                          variant="outline"
                          className="h-4 rounded-sm border-border/70 bg-muted/40 px-1 font-mono text-[9px] font-medium lowercase leading-none tracking-[0.02em] text-muted-foreground"
                        >
                          {role.slug}
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="px-2 py-1.5 align-middle">
                      <div className="flex justify-end">
                        <Switch
                          id={`role-${role.id}`}
                          checked={role.isAssigned}
                          disabled={isToggling || isDisabled}
                          onCheckedChange={() =>
                            handleToggleRole(role.id!, role.isAssigned)
                          }
                          className="scale-90 origin-center"
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <UserAccessSheet
        open={accessSheetOpen}
        onOpenChange={setAccessSheetOpen}
        userId={userId}
        userName={userName}
      />
    </>
  );
}
