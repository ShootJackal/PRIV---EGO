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
  bg: '#FAF7F0',
  bgSecondary: '#F0EDE3',
  bgCard: '#FFFEF6',
  bgInput: '#EDEAD8',
  bgElevated: '#E5E2D6',
  border: '#DDD8C6',
  borderLight: '#E8E4D6',
  borderFocus: '#7C3AED',

  textPrimary: '#1A1815',
  textSecondary: '#5C5647',
  textMuted: '#9A9485',

  accent: '#7C3AED',
  accentLight: '#9B7BF7',
  accentDim: '#E5D5FF',
  accentSoft: '#F4EDFF',

  assign: '#7C3AED',
  assignBg: '#F4EDFF',
  complete: '#0D7D4A',
  completeBg: '#E0F5EB',
  cancel: '#DB2626',
  cancelBg: '#FCE8E8',

  statusActive: '#0D7D4A',
  statusPending: '#C27800',
  statusCancelled: '#DB2626',

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

  tabBar: '#FFFEF6',
  tabBarBorder: 'transparent',

  skeleton: '#DDD8C4',
  overlay: 'rgba(26,24,21,0.25)',

  shadow: '#1A1815',
  shadowCard: 'rgba(26,24,21,0.10)',

  terminal: '#7C3AED',
  terminalBg: '#FAF7F0',
  terminalGreen: '#0D7D4A',
  terminalDim: '#9A9485',

  gold: '#D4A017',
  silver: '#7D8590',
  bronze: '#A0522D',
};

export const DarkTheme: ThemeColors = {
  bg: '#0E0E10',
  bgSecondary: '#151517',
  bgCard: '#1C1C1F',
  bgInput: '#19191C',
  bgElevated: '#28282C',
  border: '#2E2E34',
  borderLight: '#38383E',
  borderFocus: '#A78BFA',

  textPrimary: '#EDEDF0',
  textSecondary: '#A0A0A8',
  textMuted: '#5A5A62',

  accent: '#A78BFA',
  accentLight: '#C4B5FD',
  accentDim: '#2D1F5E',
  accentSoft: '#1A1230',

  assign: '#A78BFA',
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

  tabBar: '#1C1C1F',
  tabBarBorder: 'transparent',

  skeleton: '#28282C',
  overlay: 'rgba(0,0,0,0.70)',

  shadow: '#000000',
  shadowCard: 'rgba(0,0,0,0.50)',

  terminal: '#A78BFA',
  terminalBg: '#0E0E10',
  terminalGreen: '#34D399',
  terminalDim: '#38383E',

  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
};
