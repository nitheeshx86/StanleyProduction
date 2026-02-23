import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Scissors } from 'lucide-react';

interface ClipSliderProps {
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  position: number;
  onPositionChange: (v: number) => void;
}

export function ClipSlider({ enabled, onEnabledChange, position, onPositionChange }: ClipSliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Switch
          checked={enabled}
          onCheckedChange={onEnabledChange}
          className="data-[state=checked]:bg-primary"
        />
        <Label className="flex items-center gap-1.5 text-xs cursor-pointer text-foreground">
          <Scissors className="h-3.5 w-3.5 text-primary" />
          Section View
        </Label>
      </div>
      {enabled && (
        <Slider
          min={0}
          max={100}
          step={1}
          value={[position * 100]}
          onValueChange={([v]) => onPositionChange(v / 100)}
          className="py-1"
        />
      )}
    </div>
  );
}
