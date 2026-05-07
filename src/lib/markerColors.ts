import { MineralEntry } from './types';

// Known mineral colors
const KNOWN_COLORS: Record<string, string> = {
  'whewellite': '#6B3A1F', // Brownish
  'weddellite': '#E8D44D', // Yellowish
  'cystine': '#C77DFF', // Purple
  'xanthine': '#FFB703', // Golden
  'proteine': '#8ECAE6', // Sky Blue
  'dahllite': '#219EBC', // Blue
  'struvite': '#A0C4FF', // Light Blue
  'brushite': '#BDB2FF', // Violet
  'uric acid': '#E87D2E', // Orange
  'uric acid dihydrate': '#FB8500', // Deep Orange
  'ammonium urate': '#FFB703',
  'sodium urate monohydrate': '#FFD000',
  'calcium phosphate': '#E8E8E8', // Light Grey
  '2,8-dihydroxyadenine': '#8338EC',
  'hydroxylapatite': '#CAFFBF', // Light Green
  'calcite': '#FFFFFF',
  'aragonite': '#F8F9FA',
  'gypsum': '#E9ECEF',
  'alpha-quartz': '#DEE2E6',
  'tridymite': '#CED4DA',
  'oxolinic acid': '#FF006E',
  'cholesterol': '#FFBE0B',
  'whitlockite': '#3A86FF',
  'newberyite': '#FB5607',
  'potassium urate': '#FF006E',
  'com': '#6B3A1F',
  'cod': '#E8D44D',
  'ua': '#E87D2E',
  'str': '#A0C4FF',
  'bru': '#BDB2FF',
  'cap': '#E8E8E8',
};

// Generate a stable pastel color from a string
function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash % 360);
  return `hsl(${h}, 60%, 65%)`;
}

export function getMineralColor(name: string): string {
  const key = name.toLowerCase().trim();
  return KNOWN_COLORS[key] || stringToColor(key);
}

export function getDominantColor(composition: MineralEntry[]): string {
  if (composition.length === 0) return '#888888';
  const dominant = composition.reduce((a, b) => (a.percentage > b.percentage ? a : b));
  if (dominant.percentage === 0) return '#888888';
  return getMineralColor(dominant.name);
}

export function getDominantMineral(composition: MineralEntry[]): MineralEntry | null {
  if (composition.length === 0) return null;
  return composition.reduce((a, b) => (a.percentage > b.percentage ? a : b));
}
