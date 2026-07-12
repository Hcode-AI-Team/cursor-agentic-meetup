'use client';

import { PageHeader } from '@/components/entity-list';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslations } from 'next-intl';
import { ComponentRolesTab } from './tabs/component-roles-tab';
import { ComponentsTab } from './tabs/components-tab';
import { DashboardRolesTab } from './tabs/dashboard-roles-tab';
import { DashboardsTab } from './tabs/dashboards-tab';
import { ItemsTab } from './tabs/items-tab';

export default function Page() {
  const t = useTranslations('core.DashboardManagement');

  return (
    <div className="flex flex-col h-screen px-4">
      <PageHeader
        breadcrumbs={[
          { label: t('homeBreadcrumb'), href: '/' },
          { label: t('description') },
        ]}
        title={t('title')}
        description={t('description')}
      />

      <div className="flex flex-1 flex-col gap-4 overflow-auto pt-0">
        <Tabs defaultValue="dashboards" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboards">{t('dashboardsTab')}</TabsTrigger>
            <TabsTrigger value="components">{t('componentsTab')}</TabsTrigger>
            <TabsTrigger value="items">{t('itemsTab')}</TabsTrigger>
            <TabsTrigger value="componentRoles">
              {t('componentRolesTab')}
            </TabsTrigger>
            <TabsTrigger value="dashboardRoles">
              {t('dashboardRolesTab')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboards" className="mt-6">
            <DashboardsTab />
          </TabsContent>

          <TabsContent value="components" className="mt-6">
            <ComponentsTab />
          </TabsContent>

          <TabsContent value="items" className="mt-6">
            <ItemsTab />
          </TabsContent>

          <TabsContent value="componentRoles" className="mt-6">
            <ComponentRolesTab />
          </TabsContent>

          <TabsContent value="dashboardRoles" className="mt-6">
            <DashboardRolesTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
