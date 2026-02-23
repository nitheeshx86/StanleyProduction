# LithoMap: Renal Calculi Spatial Mapping System

**LithoMap** is a specialized spatial analysis tool developed for the **Department of Biochemistry at Govt. Stanley Medical College**. It provides advanced 3D visualization and composition mapping for renal calculi (kidney stones) analyzed via Fourier-Transform Infrared Spectroscopy (FTIR).

![LithoMap Logo](./public/logo.png)

## 🔬 Project Overview

This system allows biochemists and medical researchers to:
- Map mineral compositions onto a high-fidelity 3D stone model.
- Manage multi-layered stone structures (from core to surface).
- Visualize elevation and depth of specific mineral deposits.
- Export and import spatial mapping data for research clinical records.

## 🚀 Technical Stack

- **Engine**: React + Vite
- **3D Rendering**: Three.js (@react-three/fiber)
- **UI Architecture**: Tailwind CSS + ShadcnUI
- **Desktop Wrapper**: Electron

## 🛠️ Development & Build

### Prerequisites
- Node.js (v18 or higher)
- npm or bun

### Local Development
To start the web development server:
```bash
npm run dev
```

To start the Electron application:
```bash
npm run electron:start
```

### Building for Distribution
To package the application as a standalone desktop installer (.dmg for Mac, .exe for Windows):
```bash
npm run electron:build
```

## 📂 System Architecture

- `src/components/stone`: Core 3D scene logic and sphere layer rendering.
- `src/lib/markerColors.ts`: Logic for mapping mineral chemistry to visual heatmaps.
- `src/components/CaseManager.tsx`: Local storage and JSON-based library management.

---
**Developed by Nitheesh K**  
© 2026 Govt. Stanley Medical College - Department of Biochemistry
