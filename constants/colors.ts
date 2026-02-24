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
  bg: '#FAF6ED',
  bgSecondary: '#F0EBDF',
  bgCard: '#FFFFF8',
  bgInput: '#EDE8DB',
  bgElevated: '#E5DFD2',
  border: '#D8D1C2',
  borderLight: '#E8E1D4',
  borderFocus: '#7C3AED',

  textPrimary: '#1E1033',
  textSecondary: '#5B4A72',
  textMuted: '#9A8BAA',

  accent: '#7C3AED',
  accentLight: '#A78BFA',
  accentDim: '#DDD6FE',
  accentSoft: '#F5F3FF',

  assign: '#7C3AED',
  assignBg: '#F5F3FF',
  complete: '#059669',
  completeBg: '#D1FAE5',
  cancel: '#DC2626',
  cancelBg: '#FEE2E2',

  statusActive: '#059669',
  statusPending: '#D97706',
  statusCancelled: '#DC2626',

  white: '#FFFFFF',
  black: '#000000',

  slack: '#4A154B',
  slackBg: '#F5EDF5',
  hubstaff: '#0D8A40',
  hubstaffBg: '#E0F5E8',
  airtable: '#B86E00',
  airtableBg: '#FDF3E0',
  sheets: '#0D8A40',
  sheetsBg: '#E0F5E8',

  tabBar: '#FFFFF8',
  tabBarBorder: 'transparent',

  skeleton: '#DDD7C8',
  overlay: 'rgba(30,16,51,0.25)',

  shadow: '#1E1033',
  shadowCard: 'rgba(30,16,51,0.12)',

  terminal: '#7C3AED',
  terminalBg: '#F5F3FF',
  terminalGreen: '#059669',
  terminalDim: '#9A8BAA',

  gold: '#D4A017',
  silver: '#7D8590',
  bronze: '#A0522D',
};

export const DarkTheme: ThemeColors = {
  bg: '#0A0A0F',
  bgSecondary: '#111118',
  bgCard: '#16161F',
  bgInput: '#1E1E2A',
  bgElevated: '#242433',
  border: '#2A2A3D',
  borderLight: '#32324A',
  borderFocus: '#9B7BF7',

  textPrimary: '#EEE8FF',
  textSecondary: '#A89EC0',
  textMuted: '#5C5475',

  accent: '#9B7BF7',
  accentLight: '#B49EFA',
  accentDim: '#2A1B4E',
  accentSoft: '#1A1230',

  assign: '#9B7BF7',
  assignBg: '#1A1230',
  complete: '#34D399',
  completeBg: '#0A1F15',
  cancel: '#F87171',
  cancelBg: '#2A0F0F',

  statusActive: '#34D399',
  statusPending: '#FBBF24',
  statusCancelled: '#F87171',

  white: '#FFFFFF',
  black: '#000000',

  slack: '#D090D2',
  slackBg: '#1E1020',
  hubstaff: '#34D399',
  hubstaffBg: '#0A1A10',
  airtable: '#FBBF24',
  airtableBg: '#1A1508',
  sheets: '#34D399',
  sheetsBg: '#0A1A10',

  tabBar: '#16161F',
  tabBarBorder: 'transparent',

  skeleton: '#2A2A3D',
  overlay: 'rgba(0,0,0,0.7)',

  shadow: '#000000',
  shadowCard: 'rgba(0,0,0,0.6)',

  terminal: '#9B7BF7',
  terminalBg: '#0A0A0F',
  terminalGreen: '#34D399',
  terminalDim: '#3A3450',

  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
};
