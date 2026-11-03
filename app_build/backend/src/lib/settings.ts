/** The only site settings that exist. Public reads return the non-empty ones; empty values render nothing. */
export const SETTING_KEYS = [
  'site_description', 'contact_email', 'contact_phone', 'contact_address', 'contact_hours',
  'social_facebook', 'social_instagram', 'social_youtube', 'social_x', 'social_telegram',
] as const;
export type SettingKey = (typeof SETTING_KEYS)[number];
