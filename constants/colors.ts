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
  bg: '#FFFFF5',
  bgSecondary: '#F5F2E8',
  bgCard: '#FFFFF8',
  bgInput: '#F0EDE3',
  bgElevated: '#EAE8DE',
  border: '#E0DBCE',
  borderLight: '#EAE6DB',
  borderFocus: '#2663EB',

  textPrimary: '#1A1A1A',
  textSecondary: '#595647',
  textMuted: '#999485',

  accent: '#2663EB',
  accentLight: '#4A87F7',
  accentDim: '#C4D6FC',
  accentSoft: '#EAF2FF',

  assign: '#2663EB',
  assignBg: '#EAF2FF',
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

  tabBar: '#FFFFF8',
  tabBarBorder: 'transparent',

  skeleton: '#DDD8C4',
  overlay: 'rgba(26,26,26,0.25)',

  shadow: '#1A1A1A',
  shadowCard: 'rgba(26,26,26,0.10)',

  terminal: '#2663EB',
  terminalBg: '#FFFFF5',
  terminalGreen: '#0D7D4A',
  terminalDim: '#999485',

  gold: '#D4A017',
  silver: '#7D8590',
  bronze: '#A0522D',
};

export const DarkTheme: ThemeColors = {
  bg: '#1A1A1A',
  bgSecondary: '#212121',
  bgCard: '#2B2B2B',
  bgInput: '#262626',
  bgElevated: '#333333',
  border: '#3B3B3B',
  borderLight: '#444444',
  borderFocus: '#E03030',

  textPrimary: '#EFEDED',
  textSecondary: '#A19994',
  textMuted: '#59544F',

  accent: '#E03030',
  accentLight: '#EF4747',
  accentDim: '#3D1717',
  accentSoft: '#2B1414',

  assign: '#E03030',
  assignBg: '#2B1414',
  complete: '#30CC78',
  completeBg: '#0A1F12',
  cancel: '#DB2626',
  cancelBg: '#2B0808',

  statusActive: '#30CC78',
  statusPending: '#F0A121',
  statusCancelled: '#DB2626',

  white: '#FFFFFF',
  black: '#000000',

  slack: '#D090D2',
  slackBg: '#1E1020',
  hubstaff: '#30CC78',
  hubstaffBg: '#0A1F12',
  airtable: '#F0A121',
  airtableBg: '#201500',
  sheets: '#30CC78',
  sheetsBg: '#0A1F12',

  tabBar: '#2B2B2B',
  tabBarBorder: 'transparent',

  skeleton: '#333333',
  overlay: 'rgba(0,0,0,0.70)',

  shadow: '#000000',
  shadowCard: 'rgba(0,0,0,0.50)',

  terminal: '#E03030',
  terminalBg: '#1A1A1A',
  terminalGreen: '#30CC78',
  terminalDim: '#3B3B3B',

  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
};
