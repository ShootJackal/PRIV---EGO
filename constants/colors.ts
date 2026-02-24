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

  gold: string;
  silver: string;
  bronze: string;
}

export const LightTheme: ThemeColors = {
  bg: '#F5F3EF',
  bgSecondary: '#ECEAE4',
  bgCard: '#FFFFFF',
  bgInput: '#F0EDE6',
  bgElevated: '#E8E5DD',
  border: '#DDD9CF',
  borderLight: '#E8E5DC',
  borderFocus: '#7C3AED',

  textPrimary: '#1C1A17',
  textSecondary: '#5A5650',
  textMuted: '#96918A',

  accent: '#7C3AED',
  accentLight: '#9B6FF7',
  accentDim: '#E0D0FF',
  accentSoft: '#F0EAFF',

  assign: '#7C3AED',
  assignBg: '#F0EAFF',
  complete: '#0D8040',
  completeBg: '#E4F7ED',
  cancel: '#DC2626',
  cancelBg: '#FEE8E8',

  statusActive: '#0D8040',
  statusPending: '#C27800',
  statusCancelled: '#DC2626',

  white: '#FFFFFF',
  black: '#000000',

  slack: '#4A154B',
  slackBg: '#F2E8F2',
  hubstaff: '#0D8940',
  hubstaffBg: '#E0F5E8',
  airtable: '#C27800',
  airtableBg: '#FDF3E0',
  sheets: '#0D8940',
  sheetsBg: '#E0F5E8',

  tabBar: '#FFFFFF',
  tabBarBorder: 'transparent',

  skeleton: '#DDD8C4',
  overlay: 'rgba(26,24,21,0.3)',

  shadow: '#1A1815',
  shadowCard: 'rgba(26,24,21,0.08)',

  terminal: '#7C3AED',
  terminalBg: '#F5F3EF',
  terminalGreen: '#0D8040',
  terminalDim: '#96918A',

  gold: '#D4A017',
  silver: '#7D8590',
  bronze: '#A0522D',
};

export const DarkTheme: ThemeColors = {
  bg: '#101012',
  bgSecondary: '#161618',
  bgCard: '#1C1C20',
  bgInput: '#18181C',
  bgElevated: '#252528',
  border: '#2A2A30',
  borderLight: '#333338',
  borderFocus: '#9B6FF7',

  textPrimary: '#EAEAEE',
  textSecondary: '#A0A0AA',
  textMuted: '#56565E',

  accent: '#9B6FF7',
  accentLight: '#B794FF',
  accentDim: '#2D1B5E',
  accentSoft: '#1A1230',

  assign: '#9B6FF7',
  assignBg: '#1A1230',
  complete: '#34D399',
  completeBg: '#0A1F15',
  cancel: '#F87171',
  cancelBg: '#2B0F0F',

  statusActive: '#34D399',
  statusPending: '#FBBF24',
  statusCancelled: '#F87171',

  white: '#FFFFFF',
  black: '#000000',

  slack: '#D090D2',
  slackBg: '#1E1020',
  hubstaff: '#34D399',
  hubstaffBg: '#0A1F15',
  airtable: '#FBBF24',
  airtableBg: '#201500',
  sheets: '#34D399',
  sheetsBg: '#0A1F15',

  tabBar: '#1C1C20',
  tabBarBorder: 'transparent',

  skeleton: '#252528',
  overlay: 'rgba(0,0,0,0.65)',

  shadow: '#000000',
  shadowCard: 'rgba(0,0,0,0.45)',

  terminal: '#9B6FF7',
  terminalBg: '#101012',
  terminalGreen: '#34D399',
  terminalDim: '#333338',

  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
};
