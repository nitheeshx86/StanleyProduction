import { Marker, MineralEntry } from '@/lib/types';
import { getMineralColor } from '@/lib/markerColors';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Trash2, Plus, X, Undo2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState, useEffect } from 'react';

const MINERAL_OPTIONS = [
  { value: 'COM', label: 'COM (Calcium Oxalate Monohydrate)' },
  { value: 'COD', label: 'COD (Calcium Oxalate Dihydrate)' },
  { value: 'UA', label: 'UA (Uric Acid)' },
  { value: 'STR', label: 'STR (Struvite)' },
  { value: 'CAP', label: 'CAP (Carbonate Apatite)' },
  { value: 'BRU', label: 'BRU (Brushite)' },
  { value: 'CYS', label: 'Cystine' },
];

interface MarkerFormProps {
  marker: Marker;
  onChange: (updated: Marker) => void;
  onDelete: (id: string) => void;
}

export function MarkerForm({ marker, onChange, onDelete }: MarkerFormProps) {
  const [manualFields, setManualFields] = useState<Record<number, boolean>>({});

  // Reset manual fields when marker changes
  useEffect(() => {
    setManualFields({});
  }, [marker.id]);

  const addMineral = () => {
    onChange({
      ...marker,
      composition: [...marker.composition, { name: '', percentage: 0 }],
    });
  };

  const updateMineral = (index: number, field: keyof MineralEntry, value: string | number) => {
    const updated = [...marker.composition];
    if (field === 'name') {
      updated[index] = { ...updated[index], name: value as string };
    } else {
      updated[index] = { ...updated[index], percentage: Math.max(0, Math.min(100, value as number)) };
    }
    onChange({ ...marker, composition: updated });
  };

  const removeMineral = (index: number) => {
    const newManualFields = { ...manualFields };
    delete newManualFields[index];
    setManualFields(newManualFields);

    onChange({
      ...marker,
      composition: marker.composition.filter((_, i) => i !== index),
    });
  };

  const setElevation = (value: number) => {
    onChange({ ...marker, elevation: value });
  };

  const isPreset = (name: string) => MINERAL_OPTIONS.some(opt => opt.value === name);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Marker Composition {marker.name && <span className="text-blue-500 ml-1">[{marker.name}]</span>}
        </h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={() => onDelete(marker.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Dynamic mineral entries */}
      <div className="space-y-2">
        {marker.composition.map((entry, idx) => {
          const showManual = manualFields[idx] || (entry.name && !isPreset(entry.name));

          return (
            <div key={idx} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full shrink-0 border border-border"
                style={{ background: entry.name ? getMineralColor(entry.name) : 'hsl(var(--muted))' }}
              />

              {showManual ? (
                <div className="flex-1 flex gap-1 items-center">
                  <Input
                    value={entry.name}
                    onChange={(e) => updateMineral(idx, 'name', e.target.value)}
                    placeholder="Manual name..."
                    className="h-7 text-xs bg-muted border-border flex-1"
                    autoFocus
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    title="Switch to Dropdown"
                    onClick={() => {
                      setManualFields(prev => ({ ...prev, [idx]: false }));
                      updateMineral(idx, 'name', '');
                    }}
                  >
                    <Undo2 className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <Select
                  value={entry.name}
                  onValueChange={(val) => {
                    if (val === 'manual') {
                      setManualFields(prev => ({ ...prev, [idx]: true }));
                    } else {
                      updateMineral(idx, 'name', val);
                    }
                  }}
                >
                  <SelectTrigger className="h-7 text-xs bg-muted border-border flex-1">
                    <SelectValue placeholder="Select Mineral" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border text-popover-foreground">
                    {MINERAL_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                    <SelectItem value="manual" className="font-bold text-blue-500 dark:text-blue-400 italic">Custom...</SelectItem>
                  </SelectContent>
                </Select>
              )}

              <Input
                type="number"
                min={0}
                max={100}
                value={entry.percentage === 0 ? '' : entry.percentage}
                onChange={(e) => updateMineral(idx, 'percentage', e.target.value === '' ? 0 : Number(e.target.value))}
                placeholder="0"
                className="h-7 text-xs bg-muted border-border w-16"
              />
              <span className="text-[10px] text-muted-foreground">%</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeMineral(idx)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          );
        })}
        <Button variant="outline" size="sm" className="w-full text-xs h-7" onClick={addMineral}>
          <Plus className="h-3 w-3 mr-1" />
          Add Mineral
        </Button>
      </div>

      {/* Elevation / Depth slider */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">
          Elevation / Depth ({marker.elevation > 0 ? '+' : ''}{marker.elevation.toFixed(2)})
        </Label>
        <Slider
          min={-100}
          max={100}
          step={5}
          value={[marker.elevation * 100]}
          onValueChange={([v]) => setElevation(v / 100)}
          className="py-1"
        />
        <div className="flex justify-between text-[9px] text-muted-foreground">
          <span>Depth</span>
          <span>Surface</span>
          <span>Peak</span>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Notes</Label>
        <Textarea
          value={marker.notes}
          onChange={(e) => onChange({ ...marker, notes: e.target.value })}
          placeholder="Optional observations..."
          className="min-h-[60px] text-sm bg-muted border-border resize-none"
        />
      </div>
    </div>
  );
}

