import { Layer } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Layers, Trash2, Palette, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
  ContextMenuLabel,
} from '@/components/ui/context-menu';

interface LayerPanelProps {
  layers: Layer[];
  activeLayerId: string;
  onSelectLayer: (id: string) => void;
  onAddLayer: () => void;
  onDeleteLayer: (id: string) => void;
  onRenameLayer: (id: string, name: string) => void;
  onUpdateLayerColor: (id: string, color: string) => void;
  onToggleVisibility: (id: string) => void;
  onHoverLayer: (id: string | null) => void;
}

const PRESET_COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f43f5e', // Red
  '#f59e0b', // Yellow
  '#8b5cf6', // Violet
  '#06b6d4', // Cyan
  '#64748b', // Slate
  '#ec4899', // Pink
  '#f97316', // Orange
];

export function LayerPanel({
  layers,
  activeLayerId,
  onSelectLayer,
  onAddLayer,
  onDeleteLayer,
  onRenameLayer,
  onUpdateLayerColor,
  onToggleVisibility,
  onHoverLayer,
}: LayerPanelProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5" />
          Layers
        </h3>
        <Button variant="ghost" size="sm" className="h-7 text-xs text-primary" onClick={onAddLayer}>
          <Plus className="h-3 w-3 mr-1" />
          Add Layer
        </Button>
      </div>

      <div className="space-y-1">
        {layers.map((layer, i) => {
          const isActive = layer.id === activeLayerId;
          const defaultHue = [210, 170, 35, 330, 260, 100, 15][i % 7];
          const defaultColor = `hsl(${defaultHue}, ${isActive ? 50 : 30}%, ${isActive ? 50 : 40}%)`;
          const displayColor = layer.color || defaultColor;

          return (
            <ContextMenu key={layer.id}>
              <ContextMenuTrigger>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        'flex items-center gap-2 px-2.5 py-1.5 rounded-md cursor-pointer transition-colors text-sm group',
                        isActive
                          ? 'bg-primary/15 text-primary border border-primary/30'
                          : 'hover:bg-muted text-muted-foreground border border-transparent'
                      )}
                      onClick={() => onSelectLayer(layer.id)}
                      onMouseEnter={() => onHoverLayer(layer.id)}
                      onMouseLeave={() => onHoverLayer(null)}
                    >
                      <Checkbox
                        checked={layer.isVisible}
                        onCheckedChange={() => onToggleVisibility(layer.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-3.5 w-3.5"
                      />
                      <div
                        className="w-3 h-3 rounded-full border shrink-0 transition-all duration-300"
                        style={{
                          borderColor: layer.color || (isActive ? `hsl(${defaultHue}, 60%, 60%)` : 'hsl(var(--border))'),
                          background: displayColor,
                          boxShadow: isActive ? `0 0 10px ${layer.color || `hsl(${defaultHue}, 60%, 40%, 0.4)`}` : 'none',
                        }}
                      />
                      <Input
                        value={layer.name}
                        onChange={(e) => onRenameLayer(layer.id, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-6 text-xs bg-transparent border-none p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        r={layer.radius.toFixed(1)}
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {layer.markers.length}pt
                      </span>
                      {layers.length > 1 && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 shrink-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Layer</AlertDialogTitle>
                              <AlertDialogDescription>
                                Delete "{layer.name}" and all its {layer.markers.length} markers? This cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => onDeleteLayer(layer.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="text-xs">
                    Right-click to change color
                  </TooltipContent>
                </Tooltip>
              </ContextMenuTrigger>
              <ContextMenuContent className="w-48 bg-slate-950 border-white/10 text-white">
                <ContextMenuLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500 py-2">
                  Layer Coloration
                </ContextMenuLabel>
                <ContextMenuSeparator className="bg-white/5" />
                <div className="grid grid-cols-5 gap-2 p-2 pt-0">
                  {PRESET_COLORS.map((color) => (
                    <ContextMenuItem
                      key={color}
                      onClick={() => onUpdateLayerColor(layer.id, color)}
                      className="p-0 h-6 w-6 rounded-full cursor-pointer hover:scale-110 transition-transform flex items-center justify-center border border-white/10"
                      style={{ background: color }}
                    >
                      <span className="sr-only">{color}</span>
                    </ContextMenuItem>
                  ))}
                </div>
                <ContextMenuSeparator className="bg-white/5" />
                <ContextMenuItem
                  onClick={() => onUpdateLayerColor(layer.id, '')}
                  className="flex items-center gap-3 cursor-pointer py-2 hover:bg-white/5 text-slate-400"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span className="text-xs font-black uppercase tracking-widest text-[9px]">Reset Default</span>
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          );
        })}
      </div>
    </div>
  );
}

