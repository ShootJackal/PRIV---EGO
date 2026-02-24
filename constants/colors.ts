export interface ThemeColors {
  bg: string;
  bgSecondary: string;
  bgCard: string;
  bgInput: string;
  bgElevated: string;
  border: string;
  borderLight: string;
  borderFocus: string;

  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  accent: string;
  accentLight: string;
  accentDim: string;
  accentSoft: string;

  assign: string;
  assignBg: string;
  complete: string;
  completeBg: string;
  cancel: string;
  cancelBg: string;

  statusActive: string;
  statusPending: string;
  statusCancelled: string;

  white: string;
  black: string;

  slack: string;
  slackBg: string;
  hubstaff: string;
  hubstaffBg: string;
  airtable: string;
  airtableBg: string;
  sheets: string;
  sheetsBg: string;

  tabBar: string;
  tabBarBorder: string;

  skeleton: string;
  overlay: string;

  shadow: string;
  shadowCard: string;

  terminal: string;
  terminalBg: string;
  terminalGreen: string;
  terminalDim: string;

  alertYellow: string;
  alertYellowBg: string;
  recollectRed: string;
  recollectRedBg: string;
  statsGreen: string;
  statsGreenBg: string;
}

export const LightTheme: ThemeColors = {
  bg: '#FAF7F0',
  bgSecondary: '#F2EFE5',
  bgCard: '#FFFFFF',
  bgInput: '#F0EDE4',
  bgElevated: '#E8E5DC',
  border: '#E0DCD0',
  borderLight: '#EAE7DC',
  borderFocus: '#7C3AED',

  textPrimary: '#1A1A1A',
  textSecondary: '#5A5647',
  textMuted: '#9A9584',

  accent: '#7C3AED',
  accentLight: '#8B5CF6',
  accentDim: '#DDD6FE',
  accentSoft: '#F3F0FF',

  assign: '#7C3AED',
  assignBg: '#F3F0FF',
  complete: '#0D7C4A',
  completeBg: '#E0F5EB',
  cancel: '#DC2626',
  cancelBg: '#FDE8E8',

  statusActive: '#0D7C4A',
  statusPending: '#C27800',
  statusCancelled: '#DC2626',

  white: '#FFFFFF',
  black: '#000000',

  slack: '#4A154B',
  slackBg: '#F8F0F8',
  hubstaff: '#0D8A40',
  hubstaffBg: '#E5F8ED',
  airtable: '#C27800',
  airtableBg: '#FEF5E5',
  sheets: '#0D8A40',
  sheetsBg: '#E5F8ED',

  tabBar: '#FFFFFF',
  tabBarBorder: 'transparent',

  skeleton: '#E0DCD0',
  overlay: 'rgba(0,0,0,0.22)',

  shadow: '#1A1400',
  shadowCard: 'rgba(26, 20, 0, 0.08)',

  terminal: '#7C3AED',
  terminalBg: '#FAF7F0',
  terminalGreen: '#0D7C4A',
  terminalDim: '#9A9584',

  alertYellow: '#CA8A04',
  alertYellowBg: '#FEF9C3',
  recollectRed: '#DC2626',
  recollectRedBg: '#FEE2E2',
  statsGreen: '#0D7C4A',
  statsGreenBg: '#DCFCE7',
};

export const DarkTheme: ThemeColors = {
  bg: '#0E0E10',
  bgSecondary: '#161618',
  bgCard: '#1A1A1F',
  bgInput: '#1E1E24',
  bgElevated: '#26262E',
  border: '#2A2A32',
  borderLight: '#32323A',
  borderFocus: '#A78BFA',

  textPrimary: '#F0EDFA',
  textSecondary: '#A09AAE',
  textMuted: '#5A5568',

  accent: '#A78BFA',
  accentLight: '#C4B5FD',
  accentDim: '#2E1F5E',
  accentSoft: '#1C1530',

  assign: '#A78BFA',
  assignBg: '#1C1530',
  complete: '#34D399',
  completeBg: '#0A1F18',
  cancel: '#F87171',
  cancelBg: '#2A0808',

  statusActive: '#34D399',
  statusPending: '#FBBF24',
  statusCancelled: '#F87171',

  white: '#FFFFFF',
  black: '#000000',

  slack: '#D090D2',
  slackBg: '#201020',
  hubstaff: '#34D399',
  hubstaffBg: '#0A1A10',
  airtable: '#FBBF24',
  airtableBg: '#1A1204',
  sheets: '#34D399',
  sheetsBg: '#0A1A10',

  tabBar: '#1A1A1F',
  tabBarBorder: 'transparent',

  skeleton: '#2A2A32',
  overlay: 'rgba(0,0,0,0.65)',

  shadow: '#000000',
  shadowCard: 'rgba(0, 0, 0, 0.45)',

  terminal: '#A78BFA',
  terminalBg: '#0E0E10',
  terminalGreen: '#34D399',
  terminalDim: '#4A4458',

  alertYellow: '#FBBF24',
  alertYellowBg: '#1A1604',
  recollectRed: '#F87171',
  recollectRedBg: '#1A0808',
  statsGreen: '#34D399',
  statsGreenBg: '#0A1A10',
};
