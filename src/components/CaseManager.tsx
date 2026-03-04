import { CaseData, SavedCase } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Download,
  Upload,
  Save,
  FolderOpen,
  Trash2,
  FilePlus,
  Calendar,
  Clock,
  Layers as LayersIcon,
  MapPin,
  ArrowRight,
  Search,
  User,
  ClipboardList,
  Stethoscope
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useRef, useState, useEffect, useMemo } from 'react';

const STORAGE_KEY = 'ftir-case-library';

function loadLibrary(): SavedCase[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLibrary(cases: SavedCase[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
}

interface CaseManagerProps {
  caseData: CaseData;
  onLoad: (data: CaseData) => void;
  onRename: (name: string) => void;
  onNew: () => void;
  onUpdate: (data: Partial<CaseData>) => void;
}

export function CaseManager({ caseData, onLoad, onRename, onNew, onUpdate }: CaseManagerProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [newStoneDialogOpen, setNewStoneDialogOpen] = useState(false);
  const [library, setLibrary] = useState<SavedCase[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [workingDir, setWorkingDir] = useState<string | null>(null);
  const [patientDialogOpen, setPatientDialogOpen] = useState(false);

  const patientData = caseData.patientData || {
    name: '',
    age: '',
    sex: '',
    hospitalId: '',
    diagnosis: '',
    stoneCount: '',
    size: '',
    shape: '',
    color: '',
    consistency: '',
    stereoscopicExam: '',
    history: '',
    chemicalTest: '',
    radiologicalExam: '',
  };

  const handlePatientDataUpdate = (field: string, value: string) => {
    onUpdate({
      patientData: {
        ...patientData,
        [field]: value,
      },
    });
  };

  const electron = (window as any).electron;

  // Initialize working directory and library
  useEffect(() => {
    const init = async () => {
      if (electron) {
        const dir = await electron.getWorkingDirectory();
        setWorkingDir(dir);
        const cases = await electron.listCases();
        setLibrary(cases);
      }
    };
    init();
  }, [electron]);

  // Refresh library when dashboard opens
  useEffect(() => {
    if (libraryOpen) {
      if (electron) {
        electron.listCases().then(setLibrary);
      } else {
        console.warn("Electron bridge not detected. Local storage features are disabled.");
      }
    }
  }, [libraryOpen, electron]);

  // Autosave logic (debounced)
  useEffect(() => {
    if (!electron || !caseData) return;
    const timer = setTimeout(async () => {
      try {
        // Only autosave if we already have a working directory
        const dir = await electron.getWorkingDirectory();
        if (dir) {
          await electron.saveCase(caseData);
        }
      } catch (err) {
        console.error("Autosave failed:", err);
      }
    }, 2000); // 2 second debounce for autosave
    return () => clearTimeout(timer);
  }, [caseData, electron]);

  const filteredLibrary = useMemo(() => {
    return library.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [library, searchQuery]);

  const handleSetDirectory = async () => {
    if (electron) {
      const dir = await electron.setWorkingDirectory();
      if (dir) {
        setWorkingDir(dir);
        // Also refresh library from the new directory
        const cases = await electron.listCases();
        setLibrary(cases);
      }
    } else {
      alert("System Working Directory can only be configured when running the desktop app (Electron).");
    }
  };

  const handleExportJSON = async (data?: CaseData | SavedCase) => {
    const targetData = data || caseData;
    const filename = `${targetData.name.replace(/\s+/g, '_')}.json`;
    const jsonString = JSON.stringify(targetData, null, 2);

    // Fallback for browsers without File System Access API
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string) as CaseData;
        if (data.layers && data.id) {
          onLoad(data);
        }
      } catch {
        // invalid file
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSave = async () => {
    if (electron) {
      const result = await electron.saveCase(caseData, true);
      if (result) {
        if (result.updatedData) {
          onLoad(result.updatedData);
        }
        if (result.workingDirectory) {
          setWorkingDir(result.workingDirectory);
        }

        // Show non-blocking notification
        toast.success("Saved successfully", {
          duration: 3000,
        });
      }

      // Update the internal library
      const updated = await electron.listCases();
      setLibrary(updated);
    }
  };

  const handleLoadFromLibrary = (saved: SavedCase) => {
    onLoad({
      id: saved.id,
      name: saved.name,
      createdAt: saved.createdAt,
      layers: saved.layers,
      patientData: saved.patientData,
      filePath: saved.filePath,
    });
    setLibraryOpen(false);
  };

  const handleDeleteFromLibrary = async (id: string) => {
    if (electron) {
      await electron.deleteCase(id);
      const updated = await electron.listCases();
      setLibrary(updated);
    }
  };

  const handleNewStone = (saveFirst: boolean) => {
    if (saveFirst) {
      handleExportJSON();
    }
    onNew();
    setNewStoneDialogOpen(false);
  };

  return (
    <div className="space-y-3">
      {/* Working Directory Indicator */}
      <div className="flex items-center justify-between px-2 py-1.5 bg-slate-950/40 rounded-lg border border-white/5 mb-1 group cursor-pointer hover:border-blue-500/20 transition-all" onClick={handleSetDirectory}>
        <div className="flex flex-col">
          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">System Working Directory</span>
          <span className="text-[10px] text-blue-400 font-bold truncate max-w-[200px]">
            {workingDir || 'Not Set'}
          </span>
        </div>
        <FolderOpen className="h-3 w-3 text-slate-500 group-hover:text-blue-400" />
      </div>

      <div className="flex items-center gap-2">
        <Input
          value={caseData.name}
          onChange={(e) => onRename(e.target.value)}
          className="h-8 text-sm font-medium bg-muted border-border flex-1"
          placeholder="Case name"
        />
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0 border-primary/20 hover:border-primary/50 text-primary"
          onClick={() => setNewStoneDialogOpen(true)}
          title="New Stone"
        >
          <FilePlus className="h-4 w-4" />
        </Button>
      </div>

      <AlertDialog open={newStoneDialogOpen} onOpenChange={setNewStoneDialogOpen}>
        <AlertDialogContent className="bg-slate-950 border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Start a new stone?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Would you like to save your current stone data before starting a new one?
              Data is automatically saved to your working directory, but you can also export it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white">Cancel</AlertDialogCancel>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => handleNewStone(false)}
                className="flex-1 sm:flex-none bg-slate-800 text-white hover:bg-slate-700"
              >
                Just New
              </Button>
              <AlertDialogAction
                onClick={() => handleNewStone(true)}
                className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-500 text-white"
              >
                Export & New
              </AlertDialogAction>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid grid-cols-2 gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className={`col-span-2 text-[10px] font-black uppercase tracking-widest h-8 border-blue-500/20 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 hover:border-blue-500/40 transition-all gap-2`}
          onClick={handleSave}
        >
          <Save className="h-3.5 w-3.5" />
          {caseData.filePath ? 'Overwrite Save' : 'Save to System'}
        </Button>
        <Dialog open={libraryOpen} onOpenChange={setLibraryOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="text-[10px] font-black uppercase tracking-widest h-7 border-white/10 hover:bg-white/5">
              <FolderOpen className="h-3 w-3 mr-1.5" />
              Local Records
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 bg-slate-950 border-white/10 text-white overflow-hidden shadow-2xl">
            <DialogHeader className="p-8 pb-4 bg-black/40 border-b border-white/5">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-2xl font-black italic tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                    System Records
                  </DialogTitle>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1.5">
                    Internal Storage: {workingDir}
                  </p>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    placeholder="Filter records..."
                    className="pl-10 h-9 bg-white/5 border-white/10 text-white text-xs"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-auto p-4 px-8">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="w-[30%] text-[10px] uppercase font-black tracking-widest text-slate-500">Stone Identity</TableHead>
                    <TableHead className="text-[10px] uppercase font-black tracking-widest text-slate-500">Analysis Date</TableHead>
                    <TableHead className="text-[10px] uppercase font-black tracking-widest text-slate-500 text-center">Config</TableHead>
                    <TableHead className="text-[10px] uppercase font-black tracking-widest text-slate-500 text-center">Markers</TableHead>
                    <TableHead className="text-right text-[10px] uppercase font-black tracking-widest text-slate-500">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLibrary.length === 0 ? (
                    <TableRow className="border-none hover:bg-transparent">
                      <TableCell colSpan={6} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-500">
                          <div className="p-5 bg-white/5 rounded-2xl mb-4 border border-white/5">
                            <FolderOpen className="h-10 w-10 opacity-20" />
                          </div>
                          <p className="text-xs font-bold uppercase tracking-widest">{searchQuery ? 'Zero results found' : 'No records detected in directory'}</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLibrary.map((saved) => {
                      const markerCount = saved.layers.reduce((s, l) => s + l.markers.length, 0);
                      const date = new Date(saved.createdAt);
                      return (
                        <TableRow key={saved.id} className="border-white/5 group hover:bg-white/[0.02]">
                          <TableCell className="font-bold text-slate-200">
                            {saved.name}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[11px] text-slate-400 font-bold">
                                {date.toLocaleDateString(undefined, {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </span>
                              <span className="text-[9px] text-slate-600 font-black uppercase tracking-tighter">
                                {date.toLocaleTimeString(undefined, {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 text-[9px] font-black uppercase tracking-tighter border border-blue-500/10">
                              {saved.layers.length} Layers
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 text-[9px] font-black uppercase tracking-tighter border border-rose-500/10">
                              {markerCount} Pts
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-500 hover:text-blue-400 hover:bg-white/5"
                                onClick={() => handleExportJSON(saved)}
                                title="Export External"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10"
                                    title="Purge Record"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-slate-950 border-white/10 text-white">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="text-white uppercase font-black italic">Purge Record?</AlertDialogTitle>
                                    <AlertDialogDescription className="text-slate-400 text-xs leading-relaxed">
                                      Warning: This will permanently delete "{saved.name}" from the system directory. This operation cannot be reversed.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white">Abort</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteFromLibrary(saved.id)}
                                      className="bg-rose-600 text-white hover:bg-rose-500 font-black uppercase text-xs"
                                    >
                                      Confirm Purge
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                              <Button
                                size="sm"
                                variant="default"
                                className="h-7 text-[9px] font-black uppercase tracking-widest gap-2 ml-2 bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-600/20"
                                onClick={() => handleLoadFromLibrary(saved)}
                              >
                                Load Cell
                                <ArrowRight className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="h-10 bg-black/60 border-t border-white/5 px-8 flex items-center justify-between text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 italic">
              <p>Active Directory Storage: {filteredLibrary.length} Entries Detected</p>
              <p>System Optimized for Offline Analysis</p>
            </div>
          </DialogContent>
        </Dialog>
        <Button variant="outline" size="sm" className="text-[10px] font-black uppercase tracking-widest h-7 border-white/10 hover:bg-white/5" onClick={() => handleExportJSON()}>
          <Download className="h-3 w-3 mr-1.5" />
          Export
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-[10px] font-black uppercase tracking-widest h-7 border-white/10 hover:bg-white/5"
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="h-3 w-3 mr-1.5" />
          Import
        </Button>
        <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImportJSON} />

        <Dialog open={patientDialogOpen} onOpenChange={setPatientDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="col-span-2 text-[10px] font-black uppercase tracking-widest h-8 border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 text-blue-400 hover:border-blue-500/40 transition-all gap-2"
            >
              <ClipboardList className="h-3.5 w-3.5" />
              Patient Clinical Data
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-950 border-white/10 text-white p-0">
            <div className="sticky top-0 bg-slate-900/80 backdrop-blur-md border-b border-white/5 p-6 z-10 flex items-center justify-between">
              <h2 className="text-xl font-black italic tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                Patient Info
              </h2>
              <Button
                onClick={() => setPatientDialogOpen(false)}
                className="bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-xs px-6 h-8 shadow-lg shadow-blue-600/20"
              >
                Save and Close
              </Button>
            </div>

            <div className="p-8 space-y-8">
              {/* Biographical Section */}
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/5" />
                  <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Demographic Profile</h3>
                  <div className="h-px w-8 bg-white/5" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Patient Name</Label>
                    <Input
                      value={patientData.name}
                      onChange={(e) => handlePatientDataUpdate('name', e.target.value)}
                      className="bg-white/5 border-white/10 text-sm h-9"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Age</Label>
                      <Input
                        value={patientData.age}
                        onChange={(e) => handlePatientDataUpdate('age', e.target.value)}
                        className="bg-white/5 border-white/10 text-sm h-9"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Sex</Label>
                      <Select
                        value={patientData.sex}
                        onValueChange={(val) => handlePatientDataUpdate('sex', val)}
                      >
                        <SelectTrigger className="bg-white/5 border-white/10 text-sm h-9">
                          <SelectValue placeholder="Selection..." />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10 text-white">
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Hospital ID / MRN</Label>
                    <Input
                      value={patientData.hospitalId}
                      onChange={(e) => handlePatientDataUpdate('hospitalId', e.target.value)}
                      className="bg-white/5 border-white/10 text-sm h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Clinical Diagnosis</Label>
                    <Input
                      value={patientData.diagnosis}
                      onChange={(e) => handlePatientDataUpdate('diagnosis', e.target.value)}
                      className="bg-white/5 border-white/10 text-sm h-9"
                    />
                  </div>
                </div>
              </section>

              {/* Physical Stone Characteristics */}
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/5" />
                  <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Macro Morphological Data</h3>
                  <div className="h-px w-8 bg-white/5" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black tracking-widest text-slate-400">No. of Stones</Label>
                    <Input
                      value={patientData.stoneCount}
                      onChange={(e) => handlePatientDataUpdate('stoneCount', e.target.value)}
                      className="bg-white/5 border-white/10 text-sm h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Size (mm)</Label>
                    <Input
                      value={patientData.size}
                      onChange={(e) => handlePatientDataUpdate('size', e.target.value)}
                      className="bg-white/5 border-white/10 text-sm h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Shape</Label>
                    <Input
                      value={patientData.shape}
                      onChange={(e) => handlePatientDataUpdate('shape', e.target.value)}
                      className="bg-white/5 border-white/10 text-sm h-9"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Physical Colour</Label>
                    <Input
                      value={patientData.color}
                      onChange={(e) => handlePatientDataUpdate('color', e.target.value)}
                      className="bg-white/5 border-white/10 text-sm h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Consistency</Label>
                    <Input
                      value={patientData.consistency}
                      onChange={(e) => handlePatientDataUpdate('consistency', e.target.value)}
                      className="bg-white/5 border-white/10 text-sm h-9"
                    />
                  </div>
                </div>
              </section>

              {/* Detailed Examination */}
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/5" />
                  <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Detailed Examination</h3>
                  <div className="h-px w-8 bg-white/5" />
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Stereoscopic Examination</Label>
                    <Textarea
                      value={patientData.stereoscopicExam}
                      onChange={(e) => handlePatientDataUpdate('stereoscopicExam', e.target.value)}
                      className="bg-white/5 border-white/10 text-sm min-h-[80px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Patient History</Label>
                    <Textarea
                      value={patientData.history}
                      onChange={(e) => handlePatientDataUpdate('history', e.target.value)}
                      className="bg-white/5 border-white/10 text-sm min-h-[80px]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Chemical Test Results</Label>
                      <Textarea
                        value={patientData.chemicalTest}
                        onChange={(e) => handlePatientDataUpdate('chemicalTest', e.target.value)}
                        className="bg-white/5 border-white/10 text-sm min-h-[80px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Radiological Examination</Label>
                      <Textarea
                        value={patientData.radiologicalExam}
                        onChange={(e) => handlePatientDataUpdate('radiologicalExam', e.target.value)}
                        className="bg-white/5 border-white/10 text-sm min-h-[80px]"
                      />
                    </div>
                  </div>
                </div>
              </section>
            </div>


          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
