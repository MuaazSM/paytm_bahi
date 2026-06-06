export const colors = {
  paytmBlue:         '#00BAF2',
  paytmBlueDark:     '#002970',
  paytmNavy:         '#20336B',
  paytmSkyTint:      '#E6F7FE',
  sarvamAccent:      '#FF6B35',
  sarvamAccentTint:  '#FFF0EA',
  bg:                '#F4F6F9',
  surface:           '#FFFFFF',
  textPrimary:       '#0A0F2C',
  textSecondary:     '#5B6478',
  border:            '#E4E8EF',
  success:           '#1FA463',
  warning:           '#F5A623',
  danger:            '#E5484D',
} as const;

export type ColorKey = keyof typeof colors;
