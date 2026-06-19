import { z } from 'zod';

const PathsSchema = z.object({
  auth: z.object({
    signIn: z.string().min(1),
    signUp: z.string().min(1),
    verifyMfa: z.string().min(1),
    callback: z.string().min(1),
    passwordReset: z.string().min(1),
    passwordUpdate: z.string().min(1),
  }),
  app: z.object({
    home: z.string().min(1),
    profileSettings: z.string().min(1),
    suppliers: z.string().min(1),
    supplierDetail: z.string().min(1),
    supplierNew: z.string().min(1),
    riskAssessments: z.string().min(1),
    riskAssessmentNew: z.string().min(1),
    alerts: z.string().min(1),
    riskAnalytics: z.string().min(1),
    riskMap: z.string().min(1),
    exposure: z.string().min(1),
    supplyChain: z.string().min(1),
    auditLog: z.string().min(1),
    imports: z.string().min(1),
    billing: z.string().min(1),
    // V1
    onboarding: z.string().min(1),
  }),
});

const pathsConfig = PathsSchema.parse({
  auth: {
    signIn: '/auth/sign-in',
    signUp: '/auth/sign-up',
    verifyMfa: '/auth/verify',
    callback: '/auth/callback',
    passwordReset: '/auth/password-reset',
    passwordUpdate: '/update-password',
  },
  app: {
    home: '/home',
    profileSettings: '/home/settings',
    suppliers: '/home/suppliers',
    supplierDetail: '/home/suppliers/[id]',
    supplierNew: '/home/suppliers/new',
    riskAssessments: '/home/risk-assessments',
    riskAssessmentNew: '/home/risk-assessments/new',
    alerts: '/home/alerts',
    riskAnalytics: '/home/analytics',
    riskMap: '/home/risk-map',
    exposure: '/home/exposure',
    supplyChain: '/home/supply-chain',
    auditLog: '/home/audit-log',
    imports: '/home/imports',
    billing: '/home/billing',
    // V1
    onboarding: '/onboarding',
  },
} satisfies z.infer<typeof PathsSchema>);

export default pathsConfig;

// Helpers V1 — routes dynamiques
export const v1Paths = {
  invite:       (token: string) => `/invite/${token}`,
  organization: (id: string) => `/home/organization/${id}`,
} as const;
