export interface MineralEntry {
  name: string;
  percentage: number;
}

export interface Marker {
  id: string;
  name: string;
  position: [number, number, number];
  layerId: string;
  composition: MineralEntry[];
  elevation: number; // -1 to +1
  notes: string;
}

export interface Layer {
  id: string;
  name: string;
  radius: number;
  isVisible: boolean;
  markers: Marker[];
  color?: string;
}

export interface PatientData {
  name: string;
  age: string;
  sex: string;
  hospitalId: string;
  diagnosis: string;
  stoneCount: string;
  size: string;
  shape: string;
  color: string;
  consistency: string;
  stereoscopicExam: string;
  history: string;
  chemicalTest: string;
  radiologicalExam: string;
}

export interface CaseData {
  id: string;
  name: string;
  createdAt: string;
  layers: Layer[];
  patientData?: PatientData;
  filePath?: string;
}

export interface SavedCase {
  id: string;
  name: string;
  createdAt: string;
  layers: Layer[];
  patientData?: PatientData;
  filePath?: string;
}

export function createDefaultCase(): CaseData {
  return {
    id: crypto.randomUUID(),
    name: 'Untitled Case',
    createdAt: new Date().toISOString(),
    layers: [
      {
        id: crypto.randomUUID(),
        name: 'Surface A',
        radius: 2,
        isVisible: true,
        markers: [],
      },
    ],
  };
}

export function createLayer(index: number, outerRadius: number): Layer {
  const radius = Math.max(outerRadius - 0.4 * index, 0.4);
  const letter = String.fromCharCode(65 + index);
  return {
    id: crypto.randomUUID(),
    name: `Surface ${letter}`,
    radius,
    isVisible: true,
    markers: [],
  };
}
