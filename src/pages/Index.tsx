import { useState, useCallback, useRef } from 'react';
import { CaseData, Marker, Layer, createDefaultCase, createLayer } from '@/lib/types';
import { StoneScene, StoneSceneHandle } from '@/components/stone/StoneScene';
import { MarkerForm } from '@/components/MarkerForm';
import { LayerPanel } from '@/components/LayerPanel';
import { MarkerList } from '@/components/MarkerList';
import { CaseManager } from '@/components/CaseManager';
import { ClipSlider } from '@/components/ClipSlider';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Microscope, Undo2, Eye, MousePointer2, Linkedin, Mail, ExternalLink, ChevronDown, ChevronUp, Tag, FileText } from 'lucide-react';
import { getMineralColor } from '@/lib/markerColors';
import { ThemeToggle } from '@/components/ThemeToggle';
import { generatePDFReport } from '@/lib/pdfReport';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const MAX_UNDO = 30;

const Index = () => {
  const [caseData, setCaseData] = useState<CaseData>(createDefaultCase());
  const [activeLayerId, setActiveLayerId] = useState(caseData.layers[0].id);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [focusMarkerId, setFocusMarkerId] = useState<string | null>(null);
  const [clipEnabled, setClipEnabled] = useState(false);
  const [clipPosition, setClipPosition] = useState(0.5);
  const [hoveredLayerId, setHoveredLayerId] = useState<string | null>(null);
  const [viewerMode, setViewerMode] = useState<'view' | 'edit'>('edit');
  const [minimizeComposition, setMinimizeComposition] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [minimizeMarkers, setMinimizeMarkers] = useState(false);
  const [minimizeLayers, setMinimizeLayers] = useState(false);
  const [minimizeCase, setMinimizeCase] = useState(false);
  const undoStack = useRef<Layer[][]>([]);
  const stoneSceneRef = useRef<StoneSceneHandle>(null);

  const handleGenerateReport = useCallback(() => {
    const stoneImage = stoneSceneRef.current?.capture();
    generatePDFReport(caseData, stoneImage || undefined);
  }, [caseData]);

  const pushUndo = useCallback(() => {
    undoStack.current = [
      ...undoStack.current.slice(-(MAX_UNDO - 1)),
      JSON.parse(JSON.stringify(caseData.layers)),
    ];
  }, [caseData.layers]);

  const handleUndo = useCallback(() => {
    if (undoStack.current.length === 0) return;
    const prev = undoStack.current.pop()!;
    setCaseData((c) => ({ ...c, layers: prev }));
    if (prev.length > 0 && !prev.find((l) => l.id === activeLayerId)) {
      setActiveLayerId(prev[0].id);
    }
    setSelectedMarkerId(null);
  }, [activeLayerId]);

  const selectedMarker = (() => {
    for (const layer of caseData.layers) {
      const m = layer.markers.find((mk) => mk.id === selectedMarkerId);
      if (m) return m;
    }
    return null;
  })();

  const handleSurfaceClick = useCallback(
    (position: [number, number, number], layerId: string) => {
      if (viewerMode === 'view') return;
      pushUndo();

      const markerId = crypto.randomUUID();

      setCaseData((prev) => {
        const layerIndex = prev.layers.findIndex((l) => l.id === layerId);
        if (layerIndex === -1) return prev;

        const layer = prev.layers[layerIndex];
        const prefix = `S${String.fromCharCode(65 + layerIndex)}`;
        const markerNumber = layer.markers.length + 1;
        const name = `${prefix}-${markerNumber}`;

        const newMarker: Marker = {
          id: markerId,
          name,
          position,
          layerId,
          composition: [],
          elevation: 0,
          notes: '',
        };

        return {
          ...prev,
          layers: prev.layers.map((l) =>
            l.id === layerId ? { ...l, markers: [...l.markers, newMarker] } : l
          ),
        };
      });

      setSelectedMarkerId(markerId);
    },
    [pushUndo, viewerMode]
  );

  const handleMarkerClick = useCallback((markerId: string) => {
    setSelectedMarkerId(markerId);
  }, []);

  const handleMarkerUpdate = useCallback(
    (updated: Marker) => {
      pushUndo();
      setCaseData((prev) => ({
        ...prev,
        layers: prev.layers.map((l) => ({
          ...l,
          markers: l.markers.map((m) => (m.id === updated.id ? updated : m)),
        })),
      }));
    },
    [pushUndo]
  );

  const handleMarkerDelete = useCallback(
    (id: string) => {
      pushUndo();
      setCaseData((prev) => ({
        ...prev,
        layers: prev.layers.map((l) => ({
          ...l,
          markers: l.markers.filter((m) => m.id !== id),
        })),
      }));
      if (selectedMarkerId === id) setSelectedMarkerId(null);
    },
    [selectedMarkerId, pushUndo]
  );

  const handleAddLayer = useCallback(() => {
    pushUndo();
    setCaseData((prev) => {
      const newLayer = createLayer(prev.layers.length, prev.layers[0]?.radius || 2);
      return { ...prev, layers: [...prev.layers, newLayer] };
    });
  }, [pushUndo]);

  const handleDeleteLayer = useCallback(
    (id: string) => {
      pushUndo();
      setCaseData((prev) => ({
        ...prev,
        layers: prev.layers.filter((l) => l.id !== id),
      }));
      if (activeLayerId === id) {
        setCaseData((prev) => {
          if (prev.layers.length > 0) setActiveLayerId(prev.layers[0].id);
          return prev;
        });
      }
    },
    [activeLayerId, pushUndo]
  );

  const handleRenameLayer = useCallback((id: string, name: string) => {
    setCaseData((prev) => ({
      ...prev,
      layers: prev.layers.map((l) => (l.id === id ? { ...l, name } : l)),
    }));
  }, []);

  const handleUpdateLayerColor = useCallback((id: string, color: string) => {
    setCaseData((prev) => ({
      ...prev,
      layers: prev.layers.map((l) => (l.id === id ? { ...l, color } : l)),
    }));
  }, []);

  const handleToggleVisibility = useCallback((id: string) => {
    setCaseData((prev) => ({
      ...prev,
      layers: prev.layers.map((l) =>
        l.id === id ? { ...l, isVisible: !l.isVisible } : l
      ),
    }));
  }, []);

  const handleSelectMarker = useCallback((id: string) => {
    setSelectedMarkerId(id);
    setFocusMarkerId(id);
    setTimeout(() => setFocusMarkerId(null), 500);
  }, []);

  const handleResetCase = useCallback(() => {
    const newCase = createDefaultCase();
    setCaseData(newCase);
    setActiveLayerId(newCase.layers[0].id);
    setSelectedMarkerId(null);
    setFocusMarkerId(null);
    undoStack.current = [];
  }, []);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      {/* Institution Header (Premium Top Ribbon) */}
      <header className="bg-card py-4 px-8 flex items-center justify-between border-b border-border shrink-0 z-50 shadow-2xl relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 left-1/4 w-1/2 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>

        <div className="flex items-center gap-5 relative z-10">
          <div className="relative group">
            <div className="absolute -inset-2 bg-blue-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition duration-700"></div>
            <img
              src="logo.png"
              alt="Govt. Stanley Medical College Logo"
              className="relative h-14 w-auto object-contain transition-all duration-500 group-hover:scale-105 brightness-110 filter drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]"
            />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-extrabold text-foreground leading-tight tracking-tight drop-shadow-sm">
              Govt. Stanley Medical College Hospital, Chennai - 600001
            </h1>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.8)] animate-pulse" />
              <p className="text-[12px] font-bold text-muted-foreground uppercase tracking-[0.25em]">
                Department of Biochemistry
              </p>
            </div>
          </div>
        </div>

        {/* Ultra-Fancy Station Badge (Theme Aware) */}
        <div className="relative group cursor-default z-10">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-indigo-600 rounded blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
          <div className="relative flex items-center gap-4 bg-card px-5 py-2.5 rounded border border-border shadow-2xl overflow-hidden backdrop-blur-md">
            <div className="absolute top-0 left-0 w-full h-1/2 bg-accent/5 skew-y-[-10deg] -translate-y-full group-hover:translate-y-0 transition-transform duration-700"></div>

            <div className="flex flex-col items-end leading-none">
              <h2 className="text-2xl font-black italic tracking-[0.18em] text-transparent bg-clip-text bg-gradient-to-b from-foreground via-foreground/90 to-foreground/60 drop-shadow-lg">
                LITHOMAP
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <div className="h-[2px] w-10 bg-blue-400/60 shadow-[0_0_10px_rgba(96,165,250,0.5)]" />
                <span className="text-[9px] font-black text-blue-500 dark:text-blue-300 uppercase tracking-[0.3em]">
                  Spatial Mapping Tool
                </span>
              </div>
            </div>
            <div className="h-10 w-[1px] bg-border mx-1" />
            <div className="p-1.5 bg-blue-400/10 rounded-full border border-blue-400/20 group-hover:border-blue-400/40 transition-colors">
              <Microscope className="h-6 w-6 text-blue-500 dark:text-blue-300 group-hover:text-blue-400 transition-colors" />
            </div>
          </div>
        </div>
      </header>

      {/* App Header (Technical Sub-Ribbon) */}
      <header className="h-12 flex items-center justify-between px-8 border-b border-border bg-background/95 backdrop-blur-3xl shrink-0 z-40">
        {/* Left Side — Technical Specs */}
        <div className="flex items-center gap-6">
          <div className="flex items-center bg-muted/50 px-2.5 py-1 rounded border border-border shadow-inner">
            <span className="text-[10px] font-black text-blue-500 dark:text-blue-400 tracking-wider">v1.2.0-STABLE</span>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.18em]">
            <div className="flex items-center gap-2 group cursor-default">
              <span className="text-muted-foreground group-hover:text-blue-500 transition-colors">ENGINEERED BY:</span>
              <Dialog>
                <DialogTrigger asChild>
                  <span className="text-foreground font-black cursor-pointer hover:text-blue-500 transition-all hover:underline decoration-blue-500/50 underline-offset-4">
                    NITHEESH K
                  </span>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[800px] h-[600px] bg-background border-border text-foreground shadow-2xl backdrop-blur-3xl p-0 overflow-hidden flex flex-col">
                  <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar / Profile Intro */}
                    <div className="w-[300px] bg-card border-r border-border p-8 flex flex-col items-start shrink-0">
                      <div className="relative group mb-6 self-center">
                        <div className="absolute -inset-1 bg-gradient-to-b from-blue-600 to-indigo-600 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
                        <div className="relative h-40 w-40 rounded-2xl bg-muted border border-border overflow-hidden shadow-2xl">
                          <img
                            src="me.png"
                            alt="Nitheesh K"
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "https://api.dicebear.com/7.x/bottts/svg?seed=Nitheesh";
                            }}
                          />
                        </div>
                        <div className="absolute -bottom-2 -right-2 h-8 w-8 rounded-lg bg-blue-600 border-2 border-background flex items-center justify-center shadow-lg">
                          <Microscope className="h-4 w-4 text-white" />
                        </div>
                      </div>

                      <h2 className="text-2xl font-black italic tracking-widest text-foreground mb-1 uppercase">
                        Nitheesh K
                      </h2>
                      <p className="text-blue-500 dark:text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mb-8">Engineer</p>

                      <div className="space-y-5 w-full">
                        <div className="space-y-1.5">
                          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">LinkedIn</p>
                          <a
                            href="https://www.linkedin.com/in/nitheeshx86"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-blue-500 dark:text-blue-400 font-bold hover:underline block break-all leading-relaxed"
                          >
                            linkedin.com/in/nitheeshx86
                          </a>
                        </div>

                        <div className="space-y-1.5">
                          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Personal Email</p>
                          <a
                            href="mailto:knitheesh0360@gmail.com"
                            className="text-[11px] text-foreground font-bold hover:text-blue-500 transition-colors block break-all leading-relaxed"
                          >
                            knitheesh0360@gmail.com
                          </a>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Academic Email</p>
                            <span className="text-[8px] text-muted-foreground/60 font-black uppercase">Until 2028</span>
                          </div>
                          <a
                            href="mailto:nitheesh.k2024@vitstudent.ac.in"
                            className="text-[11px] text-foreground font-bold hover:text-blue-500 transition-colors block break-all leading-relaxed"
                          >
                            nitheesh.k2024@vitstudent.ac.in
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-card/30">
                      <div className="space-y-8">
                        {/* Bio Section */}
                        <section>
                          <div className="flex items-center gap-3 mb-4">
                            <div className="h-px flex-1 bg-border" />
                            <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Developer Biography</h3>
                            <div className="h-px w-8 bg-border" />
                          </div>
                          <p className="text-foreground/80 text-sm leading-relaxed font-medium">
                            I work at the intersection of computational systems and biochemical research, developing precision tools that translate complex molecular data into structured, spatially meaningful visualizations.
                            <span className="text-blue-500 dark:text-blue-400 font-bold ml-1">LithoMap</span> was created to enable accurate morphochemical documentation of renal calculi using FTIR-driven analysis.
                          </p>
                        </section>

                        {/* Technical Core Section */}
                        <section>
                          <div className="flex items-center gap-3 mb-4">
                            <div className="h-px flex-1 bg-border" />
                            <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Project Stack</h3>
                            <div className="h-px w-8 bg-border" />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              { label: 'Platform Architecture', value: 'Electron / Node.js' },
                              { label: '3D Simulation', value: 'Three.js / WebGL' },
                              { label: 'Reactive Engine', value: 'React / TypeScript' },
                              { label: 'Data Processing', value: 'FTIR JSON Schema' },
                            ].map((item, i) => (
                              <div key={i} className="p-3 rounded-lg bg-accent/50 border border-border">
                                <p className="text-[9px] text-muted-foreground uppercase font-black tracking-wider mb-1">{item.label}</p>
                                <p className="text-xs font-bold text-foreground">{item.value}</p>
                              </div>
                            ))}
                          </div>
                        </section>

                        {/* Mission Statement */}
                        <section className="p-6 rounded-2xl bg-blue-500/5 border border-blue-500/10 relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <ExternalLink className="h-12 w-12 text-blue-500" />
                          </div>
                          <h4 className="text-xs font-black text-blue-500 dark:text-blue-400 uppercase tracking-widest mb-2">Primary Objective</h4>
                          <p className="text-foreground/70 text-xs italic leading-relaxed">
                            To push the boundaries of how technology and life sciences converge, creating systems that elevate research, diagnosis, and scientific exploration.                          </p>
                        </section>
                      </div>
                    </div>
                  </div>

                  {/* Footer Status Bar */}
                  <div className="h-10 bg-card border-t border-border px-6 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping" />
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Last Updated:</span>
                    </div>
                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest italic">Est. 2026 • Build stable-v1.x</span>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="h-3 w-px bg-white/10" />
            <span className="italic font-semibold text-slate-500 normal-case tracking-normal">Core Spatial Processing Cluster</span>
          </div>
        </div>

        {/* Right Side — Command Module */}
        <div className="flex items-center gap-6">
          <div className="flex items-center bg-muted/50 p-1 rounded-xl border border-border backdrop-blur-sm shadow-inner overflow-hidden">
            <button
              onClick={() => setViewerMode('view')}
              className={`flex items-center gap-2.5 px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all duration-300 ${viewerMode === 'view'
                ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] scale-[1.02]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
            >
              <Eye className="h-3.5 w-3.5" />
              View
            </button>
            <button
              onClick={() => setViewerMode('edit')}
              className={`flex items-center gap-2.5 px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all duration-300 ${viewerMode === 'edit'
                ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] scale-[1.02]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
            >
              <MousePointer2 className="h-3.5 w-3.5" />
              Edit
            </button>
          </div>

          <div className="h-6 w-px bg-white/10" />

          <ThemeToggle />

          <div className="h-6 w-px bg-white/10" />

          <Button
            variant="ghost"
            size="icon"
            className={`h-9 w-9 rounded-lg border border-white/10 transition-all ${showLabels
              ? 'bg-blue-600/20 text-blue-400 border-blue-500/30'
              : 'bg-black/20 text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            onClick={() => setShowLabels(!showLabels)}
            title={showLabels ? "Hide Mineral Labels" : "Show Mineral Labels"}
          >
            <Tag className="h-[1.2rem] w-[1.2rem]" />
          </Button>

          <div className="h-6 w-px bg-white/10" />

          <Button
            variant="ghost"
            size="sm"
            className="h-9 px-4 text-[11px] font-black uppercase tracking-[0.1em] text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all active:scale-95 border border-transparent hover:border-rose-500/20"
            onClick={handleUndo}
            disabled={undoStack.current.length === 0}
          >
            <Undo2 className="h-3.5 w-3.5 mr-2" />
            Undo Step
          </Button>

          <div className="h-6 w-px bg-white/10" />

          <Button
            variant="ghost"
            size="sm"
            className="h-9 px-4 text-[11px] font-black uppercase tracking-[0.1em] text-blue-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all active:scale-95 border border-transparent hover:border-blue-500/20 group"
            onClick={handleGenerateReport}
          >
            <FileText className="h-3.5 w-3.5 mr-2 group-hover:scale-110 transition-transform" />
            Generate Clinical Report
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* 3D Viewer */}
        <main className="flex-1 relative viewer-bg">
          <StoneScene
            ref={stoneSceneRef}
            caseData={caseData}
            activeLayerId={activeLayerId}
            selectedMarkerId={selectedMarkerId}
            clipPosition={clipPosition}
            clipEnabled={clipEnabled}
            onSurfaceClick={handleSurfaceClick}
            onMarkerClick={handleMarkerClick}
            focusMarkerId={focusMarkerId}
            hoveredLayerId={hoveredLayerId}
            mode={viewerMode}
            showLabels={showLabels}
          />

          {/* Active layer hint */}
          <div className="absolute top-4 left-4 bg-card/80 backdrop-blur-sm rounded-md px-3 py-1.5 border border-border z-20">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Active Layer
            </div>
            <div className="text-sm font-medium text-foreground">
              {caseData.layers.find((l) => l.id === activeLayerId)?.name || '—'}
            </div>
          </div>

          {/* Instruction hint */}
          <div className="absolute top-4 right-4 z-20">
            {viewerMode === 'edit' && !selectedMarker && (
              <div className="max-w-[220px] bg-card/80 backdrop-blur-sm rounded-md px-3 py-2 border border-border animate-in fade-in slide-in-from-top-2 duration-300">
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  <span className="text-primary font-medium">Double-click</span> on the active layer sphere to place a composition marker.
                </p>
              </div>
            )}
          </div>

          {/* Selected marker composition display */}
          {selectedMarker && (
            <div className="absolute top-4 right-4 z-20 w-72 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="bg-card/95 backdrop-blur-2xl rounded-xl border border-border shadow-[0_20px_50px_rgba(0,0,0,0.3)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
                <div className="bg-accent/50 px-4 py-2.5 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                      <div className="absolute inset-0 h-2 w-2 rounded-full bg-blue-500 animate-ping opacity-75" />
                    </div>
                    <span className="text-[10px] font-black text-foreground uppercase tracking-[0.2em]">Point Composition {selectedMarker.name && <span className="text-blue-500 ml-1">[{selectedMarker.name}]</span>}</span>
                  </div>
                  <button
                    onClick={() => setMinimizeComposition(!minimizeComposition)}
                    className="p-1 hover:bg-white/10 rounded transition-colors"
                  >
                    {minimizeComposition ? (
                      <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                    ) : (
                      <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                    )}
                  </button>
                </div>

                {!minimizeComposition && (
                  <div className="p-4 space-y-5">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">Mineral Composition</h4>
                        {selectedMarker.composition.length > 0 && (
                          <span className="text-[9px] font-bold text-slate-400 bg-white/5 py-0.5 px-2 rounded-full border border-white/5">
                            {selectedMarker.composition.length} Component(s)
                          </span>
                        )}
                      </div>

                      {selectedMarker.composition.length > 0 ? (
                        <div className="space-y-3.5">
                          {selectedMarker.composition.map((entry, idx) => (
                            <div key={idx} className="space-y-2">
                              <div className="flex items-center justify-between text-[11px] font-bold">
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: getMineralColor(entry.name) }}
                                  />
                                  <span className="text-slate-100 uppercase tracking-wide truncate max-w-[120px]">
                                    {entry.name || 'Unidentified'}
                                  </span>
                                </div>
                                <span className="text-blue-400 font-mono tracking-tighter">{entry.percentage}%</span>
                              </div>
                              <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5">
                                <div
                                  className="h-full transition-all duration-1000 ease-out rounded-full"
                                  style={{
                                    width: `${entry.percentage}%`,
                                    backgroundColor: getMineralColor(entry.name),
                                    boxShadow: `0 0 15px ${getMineralColor(entry.name)}55`
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-10 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-xl bg-white/[0.02]">
                          <Microscope className="h-8 w-8 text-slate-800 mb-3 stroke-[1.5]" />
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] text-center px-6 leading-relaxed">
                            No composition data<br />assigned to point
                          </p>
                        </div>
                      )}
                    </div>

                    {selectedMarker.notes && (
                      <div className="pt-4 border-t border-white/5">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-px w-3 bg-blue-500/50" />
                          <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Observation</h4>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed pl-5 relative italic">
                          <span className="absolute left-0 top-0 text-blue-500/50 text-2xl font-serif leading-none">"</span>
                          {selectedMarker.notes}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Sidebar */}
        <aside className="w-[320px] shrink-0 border-l border-border overflow-y-auto bg-card/10 backdrop-blur-sm shadow-xl custom-scrollbar">
          <div className="p-4 space-y-4">
            {/* Case Section */}
            <div>
              <div
                className="flex items-center justify-between cursor-pointer group mb-2"
                onClick={() => setMinimizeCase(!minimizeCase)}
              >
                <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] group-hover:text-foreground transition-colors">
                  System Records
                </h3>
                <button className="p-1 hover:bg-accent rounded transition-colors group-hover:bg-accent">
                  {minimizeCase ? (
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  ) : (
                    <ChevronUp className="h-3 w-3 text-muted-foreground" />
                  )}
                </button>
              </div>
              {!minimizeCase && (
                <CaseManager
                  caseData={caseData}
                  onLoad={(data) => {
                    setCaseData(data);
                    setActiveLayerId(data.layers[0]?.id || '');
                    setSelectedMarkerId(null);
                  }}
                  onRename={(name) => setCaseData((prev) => ({ ...prev, name }))}
                  onNew={handleResetCase}
                  onUpdate={(updates) => setCaseData((prev) => ({ ...prev, ...updates }))}
                />
              )}
            </div>

            <Separator className="bg-border opacity-50" />

            {selectedMarker && (
              <div className="pb-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                    Marker Composition
                  </h3>
                </div>
                <MarkerForm
                  marker={selectedMarker}
                  onChange={handleMarkerUpdate}
                  onDelete={handleMarkerDelete}
                />
                <Separator className="bg-border opacity-50 mt-4" />
              </div>
            )}

            <ClipSlider
              enabled={clipEnabled}
              onEnabledChange={setClipEnabled}
              position={clipPosition}
              onPositionChange={setClipPosition}
            />

            <Separator className="bg-border opacity-50" />

            {/* Markers Section */}
            <div>
              <div
                className="flex items-center justify-between cursor-pointer group mb-2"
                onClick={() => setMinimizeMarkers(!minimizeMarkers)}
              >
                <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] group-hover:text-foreground transition-colors">
                  Point Catalog
                </h3>
                <button className="p-1 hover:bg-accent rounded transition-colors group-hover:bg-accent">
                  {minimizeMarkers ? (
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  ) : (
                    <ChevronUp className="h-3 w-3 text-muted-foreground" />
                  )}
                </button>
              </div>
              {!minimizeMarkers && (
                <MarkerList
                  caseData={caseData}
                  selectedMarkerId={selectedMarkerId}
                  onSelectMarker={handleSelectMarker}
                />
              )}
            </div>

            <Separator className="bg-border opacity-50" />

            {/* Layers Section */}
            <div>
              <div
                className="flex items-center justify-between cursor-pointer group mb-2"
                onClick={() => setMinimizeLayers(!minimizeLayers)}
              >
                <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] group-hover:text-foreground transition-colors">
                  Layer Management
                </h3>
                <button className="p-1 hover:bg-accent rounded transition-colors group-hover:bg-accent">
                  {minimizeLayers ? (
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  ) : (
                    <ChevronUp className="h-3 w-3 text-muted-foreground" />
                  )}
                </button>
              </div>
              {!minimizeLayers && (
                <LayerPanel
                  layers={caseData.layers}
                  activeLayerId={activeLayerId}
                  onSelectLayer={setActiveLayerId}
                  onAddLayer={handleAddLayer}
                  onDeleteLayer={handleDeleteLayer}
                  onRenameLayer={handleRenameLayer}
                  onUpdateLayerColor={handleUpdateLayerColor}
                  onToggleVisibility={handleToggleVisibility}
                  onHoverLayer={setHoveredLayerId}
                />
              )}
            </div>

          </div>
        </aside>
      </div>
    </div>
  );
};

export default Index;
