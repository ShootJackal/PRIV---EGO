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
  bgCard: '#FFFFF5',
  bgInput: '#EDE8DB',
  bgElevated: '#E5DFD2',
  border: '#D8D1C2',
  borderLight: '#E8E1D4',
  borderFocus: '#2563EB',

  textPrimary: '#2C2416',
  textSecondary: '#635A48',
  textMuted: '#9A9080',

  accent: '#2563EB',
  accentLight: '#4A86F7',
  accentDim: '#C4D6FC',
  accentSoft: '#EBF1FE',

  assign: '#2563EB',
  assignBg: '#EBF1FE',
  complete: '#0D7C4A',
  completeBg: '#E0F5EB',
  cancel: '#C4391C',
  cancelBg: '#FDE8E2',

  statusActive: '#0D7C4A',
  statusPending: '#B86E00',
  statusCancelled: '#C4391C',

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

  tabBar: '#FFFFF5',
  tabBarBorder: 'transparent',

  skeleton: '#DDD7C8',
  overlay: 'rgba(0,0,0,0.25)',

  shadow: '#1A1400',
  shadowCard: 'rgba(26, 20, 0, 0.1)',

  terminal: '#2563EB',
  terminalBg: '#F5F2E8',
  terminalGreen: '#0D7C4A',
  terminalDim: '#9A9080',

  gold: '#D4A017',
  silver: '#7D8590',
  bronze: '#A0522D',
};

export const DarkTheme: ThemeColors = {
  bg: '#0F0F0F',
  bgSecondary: '#161616',
  bgCard: '#1A1A1A',
  bgInput: '#222222',
  bgElevated: '#282828',
  border: '#2C2C2C',
  borderLight: '#353535',
  borderFocus: '#9B7BF7',

  textPrimary: '#EEEAEA',
  textSecondary: '#A8A0A0',
  textMuted: '#605858',

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

  tabBar: '#181818',
  tabBarBorder: 'transparent',

  skeleton: '#2C2C2C',
  overlay: 'rgba(0,0,0,0.7)',

  shadow: '#000000',
  shadowCard: 'rgba(0, 0, 0, 0.55)',

  terminal: '#9B7BF7',
  terminalBg: '#0A0A0A',
  terminalGreen: '#34D399',
  terminalDim: '#4A4555',

  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
};
