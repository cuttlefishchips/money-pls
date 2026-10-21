export const APP_NAME = 'Money Pls';
export const APP_DESCRIPTION = '[Placeholder] Description to be confirmed';

// Google Form pre-filled link with the participant code field set to {code}. Empty until confirmed.
export const RATING_FORM_URL_TEMPLATE = '';

export function ratingFormUrl(code: string, template = RATING_FORM_URL_TEMPLATE): string | null {
  if (!template.includes('{code}')) return null;
  return template.replaceAll('{code}', encodeURIComponent(code));
}
