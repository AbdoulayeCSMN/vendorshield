import {
  AlertTriangle,
  BarChart3,
  Bell,
  Building2,
  CreditCard,
  FileSearch,
  GitBranch,
  Home,
  Layers,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  Upload,
  User,
  Users,
} from 'lucide-react';
import { z } from 'zod';

import { NavigationConfigSchema } from '@kit/ui/navigation-schema';

import pathsConfig from '~/config/paths.config';

const iconClasses = 'w-4';

const routes = [
  {
    label: 'common:routes.application',
    children: [
      {
        label: 'common:routes.home',
        path: pathsConfig.app.home,
        Icon: <Home className={iconClasses} />,
        end: true,
      },
      {
        label: 'common:routes.copilot',
        path: pathsConfig.app.copilot,
        Icon: <Sparkles className={iconClasses} />,
      },
    ],
  },
  {
    label: 'common:routes.supplierManagement',
    children: [
      {
        label: 'common:routes.suppliers',
        path: pathsConfig.app.suppliers,
        Icon: <Building2 className={iconClasses} />,
      },
      {
        label: 'common:routes.imports',
        path: pathsConfig.app.imports,
        Icon: <Upload className={iconClasses} />,
      },
      {
        label: 'common:routes.riskAssessments',
        path: pathsConfig.app.riskAssessments,
        Icon: <ShieldCheck className={iconClasses} />,
      },
      {
        label: 'common:routes.alerts',
        path: pathsConfig.app.alerts,
        Icon: <Bell className={iconClasses} />,
      },
    ],
  },
  {
    label: 'common:routes.analytics',
    children: [
      {
        label: 'common:routes.riskAnalytics',
        path: pathsConfig.app.riskAnalytics,
        Icon: <BarChart3 className={iconClasses} />,
      },
      {
        label: 'common:routes.riskMap',
        path: pathsConfig.app.riskMap,
        Icon: <Target className={iconClasses} />,
      },
      {
        label: 'common:routes.exposure',
        path: pathsConfig.app.exposure,
        Icon: <Layers className={iconClasses} />,
      },
      {
        label: 'common:routes.supplyChain',
        path: pathsConfig.app.supplyChain,
        Icon: <GitBranch className={iconClasses} />,
      },
      {
        label: 'common:routes.auditLog',
        path: pathsConfig.app.auditLog,
        Icon: <FileSearch className={iconClasses} />,
      },
    ],
  },
  {
    label: 'common:routes.settings',
    children: [
      {
        label: 'common:routes.profile',
        path: pathsConfig.app.profileSettings,
        Icon: <User className={iconClasses} />,
      },
      {
        label: 'common:routes.organization',
        path: '/home/organization',
        Icon: <Users className={iconClasses} />,
      },
      {
        label: 'common:routes.subscription',
        path: pathsConfig.app.billing,
        Icon: <CreditCard className={iconClasses} />,
      },
    ],
  },
] satisfies z.infer<typeof NavigationConfigSchema>['routes'];

export const navigationConfig = NavigationConfigSchema.parse({
  routes,
  style: process.env.NEXT_PUBLIC_NAVIGATION_STYLE,
  sidebarCollapsed: process.env.NEXT_PUBLIC_HOME_SIDEBAR_COLLAPSED,
});
