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
}

export const LightTheme: ThemeColors = {
  bg: '#FFFFF5',
  bgSecondary: '#F5F2E8',
  bgCard: '#FFFEF8',
  bgInput: '#F0EDE2',
  bgElevated: '#EBE8DD',
  border: '#E0DCCF',
  borderLight: '#EAE7DC',
  borderFocus: '#2563EB',

  textPrimary: '#1A1A1A',
  textSecondary: '#5A5647',
  textMuted: '#9A9584',

  accent: '#2563EB',
  accentLight: '#4A86F7',
  accentDim: '#C4D6FC',
  accentSoft: '#EBF1FE',

  assign: '#2563EB',
  assignBg: '#EBF1FE',
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

  tabBar: '#FFFEF8',
  tabBarBorder: 'transparent',

  skeleton: '#E0DCCF',
  overlay: 'rgba(0,0,0,0.22)',

  shadow: '#1A1400',
  shadowCard: 'rgba(26, 20, 0, 0.08)',

  terminal: '#2563EB',
  terminalBg: '#F8F6EE',
  terminalGreen: '#0D7C4A',
  terminalDim: '#9A9584',
};

export const DarkTheme: ThemeColors = {
  bg: '#1A1A1A',
  bgSecondary: '#222222',
  bgCard: '#2A2A2A',
  bgInput: '#252525',
  bgElevated: '#333333',
  border: '#3A3A3A',
  borderLight: '#404040',
  borderFocus: '#E03030',

  textPrimary: '#F0EDED',
  textSecondary: '#A09A94',
  textMuted: '#5A5550',

  accent: '#E03030',
  accentLight: '#F04848',
  accentDim: '#3D1818',
  accentSoft: '#2A1515',

  assign: '#E03030',
  assignBg: '#2A1515',
  complete: '#30CC78',
  completeBg: '#0A1F12',
  cancel: '#F04848',
  cancelBg: '#2A0808',

  statusActive: '#30CC78',
  statusPending: '#F0A020',
  statusCancelled: '#F04848',

  white: '#FFFFFF',
  black: '#000000',

  slack: '#D090D2',
  slackBg: '#201020',
  hubstaff: '#30D090',
  hubstaffBg: '#0A1A10',
  airtable: '#F0A020',
  airtableBg: '#1A1204',
  sheets: '#30D090',
  sheetsBg: '#0A1A10',

  tabBar: '#222222',
  tabBarBorder: 'transparent',

  skeleton: '#3A3A3A',
  overlay: 'rgba(0,0,0,0.65)',

  shadow: '#000000',
  shadowCard: 'rgba(0, 0, 0, 0.45)',

  terminal: '#E03030',
  terminalBg: '#141414',
  terminalGreen: '#30CC78',
  terminalDim: '#444040',
};
