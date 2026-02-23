import { CaseData, Marker } from '@/lib/types';
import { getDominantColor, getDominantMineral } from '@/lib/markerColors';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MarkerListProps {
  caseData: CaseData;
  selectedMarkerId: string | null;
  onSelectMarker: (markerId: string) => void;
}

export function MarkerList({ caseData, selectedMarkerId, onSelectMarker }: MarkerListProps) {
  const allMarkers: { marker: Marker; layerName: string }[] = [];
  caseData.layers.forEach((layer) => {
    layer.markers.forEach((m) => allMarkers.push({ marker: m, layerName: layer.name }));
  });

  if (allMarkers.length === 0) {
    return (
      <div className="text-xs text-muted-foreground text-center py-4">
        Click on the active layer to place markers
      </div>
    );
  }

  return (
    <div className="space-y-1 max-h-[300px] overflow-y-auto">
      {allMarkers.map(({ marker, layerName }) => {
        const dominant = getDominantMineral(marker.composition);
        const isSelected = marker.id === selectedMarkerId;

        return (
          <div
            key={marker.id}
            className={cn(
              'flex items-center gap-2 px-2.5 py-1.5 rounded-md cursor-pointer transition-colors text-xs',
              isSelected
                ? 'bg-primary/15 border border-primary/30'
                : 'hover:bg-muted border border-transparent'
            )}
            onClick={() => onSelectMarker(marker.id)}
          >
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: getDominantColor(marker.composition) }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-foreground font-medium truncate">
                {marker.name && <span className="text-blue-500 mr-2">{marker.name}</span>}
                {dominant && dominant.percentage > 0 ? `${dominant.name} ${dominant.percentage}%` : 'No composition'}
              </div>
              <div className="text-muted-foreground truncate">{layerName}</div>
            </div>
            <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
          </div>
        );
      })}
    </div>
  );
}
