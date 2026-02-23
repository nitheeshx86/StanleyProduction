import { MineralEntry } from './types';

// Known mineral colors
const KNOWN_COLORS: Record<string, string> = {
  'com': '#6B3A1F',
  'calcium oxalate monohydrate': '#6B3A1F',
  'cod': '#E8D44D',
  'calcium oxalate dihydrate': '#E8D44D',
  'phosphate': '#E8E8E8',
  'ua': '#E87D2E',
  'uric acid': '#E87D2E',
  'uricacid': '#E87D2E',
  'str': '#A0C4FF',
  'struvite': '#A0C4FF',
  'cys': '#C77DFF',
  'cystine': '#C77DFF',
  'bru': '#BDB2FF',
  'brushite': '#BDB2FF',
  'cap': '#CAFFBF',
  'apatite': '#CAFFBF',
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
