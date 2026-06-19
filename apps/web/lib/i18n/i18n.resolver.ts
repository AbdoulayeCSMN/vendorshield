/**
 * Resolves the translation file for a given language and namespace.
 *
 * Tolérant aux fichiers manquants : si une traduction n'existe pas encore pour
 * une langue/namespace, on renvoie un objet vide et i18next bascule sur la
 * langue de repli (fallbackLng). Évite de planter quand une langue est
 * partiellement traduite.
 */
export async function i18nResolver(language: string, namespace: string) {
  try {
    const data = await import(
      `../../public/locales/${language}/${namespace}.json`
    );

    return data as Record<string, string>;
  } catch {
    return {} as Record<string, string>;
  }
}
