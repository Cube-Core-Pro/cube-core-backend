// TODO: Implement proper i18n utilities
// This is a minimal stub to make the application compile

export async function translateMessage(
  message: string,
  _targetLang: string = 'en',
  _sourceLang?: string
): Promise<string> {
  // For now, return the original message
  // In a real implementation, this would use a translation service
  return message;
}

export function formatMessage(
  template: string,
  params: Record<string, any> = {}
): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return params[key] !== undefined ? String(params[key]) : match;
  });
}

export const SUPPORTED_LOCALES = ['en', 'es', 'fr', 'pt', 'de', 'it'] as const;
export type SupportedLocale = typeof SUPPORTED_LOCALES[number];

export function isValidLocale(locale: string): locale is SupportedLocale {
  return SUPPORTED_LOCALES.includes(locale as SupportedLocale);
}
