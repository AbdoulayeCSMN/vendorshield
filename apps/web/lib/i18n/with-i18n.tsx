import { createI18nServerInstance } from './i18n.server';

export function withI18n<Params extends object>(
  Component: (params: Params) => Promise<React.ReactNode> | React.ReactNode,
) {
  return async function I18nServerComponentWrapper(params: Params) {
    await createI18nServerInstance();
    return Component(params);
  };
}
