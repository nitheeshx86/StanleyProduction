import { useRef, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Canvas, useThree, ThreeEvent, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { CaseData, Marker } from '@/lib/types';
import { getDominantColor } from '@/lib/markerColors';

export interface StoneSceneHandle {
  capture: () => string | null;
}

// Internal component to access three.js state
function CaptureHelper({ onCapture }: { onCapture: (fn: () => string) => void }) {
  const { gl, scene, camera } = useThree();

  useMemo(() => {
    onCapture(() => {
      // Force a render before capture to ensure context is up to date
      gl.render(scene, camera);
      return gl.domElement.toDataURL('image/png');
    });
  }, [gl, scene, camera, onCapture]);

  return null;
}

interface StoneSceneProps {
  caseData: CaseData;
  activeLayerId: string;
  selectedMarkerId: string | null;
  clipPosition: number;
  clipEnabled: boolean;
  onSurfaceClick: (position: [number, number, number], layerId: string) => void;
  onMarkerClick: (markerId: string) => void;
  focusMarkerId: string | null;
  hoveredLayerId: string | null;
  mode: 'view' | 'edit';
  showLabels?: boolean;
}

function ReferenceOrigin({ radius }: { radius: number }) {
  return (
    <group>
      {/* Reference origin dot */}
      <mesh position={[0, radius, 0]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color="#111111" roughness={0.4} />
      </mesh>
      {/* Label */}
      <Html position={[0, radius + 0.15, 0]} center style={{ pointerEvents: 'none' }} zIndexRange={[0, 0]}>
        <div className="text-[9px] text-muted-foreground bg-card/80 px-1.5 py-0.5 rounded border border-border whitespace-nowrap backdrop-blur-sm">
          Reference Origin
        </div>
      </Html>
      {/* Subtle axis lines */}
      <axesHelper args={[0.5]} />
    </group>
  );
}

function LayerSphere({
  radius,
  layerId,
  layerIndex,
  isActive,
  markers,
  selectedMarkerId,
  clipPlanes,
  clipEnabled,
  isHovered,
  isDimmed,
  onSurfaceClick,
  onMarkerClick,
  mode,
  showLabels,
  layerColor,
}: {
  radius: number;
  layerId: string;
  layerIndex: number;
  isActive: boolean;
  markers: Marker[];
  selectedMarkerId: string | null;
  clipPlanes: THREE.Plane[];
  clipEnabled: boolean;
  isHovered: boolean;
  isDimmed: boolean;
  onSurfaceClick: (position: [number, number, number], layerId: string) => void;
  onMarkerClick: (markerId: string) => void;
  mode: 'view' | 'edit';
  showLabels?: boolean;
  layerColor?: string;
}) {
  const handleDoubleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      if (!isActive || mode === 'view') return;
      e.stopPropagation();
      const p = e.point;
      const dir = new THREE.Vector3(p.x, p.y, p.z).normalize();
      const surface = dir.multiplyScalar(radius);
      onSurfaceClick([surface.x, surface.y, surface.z], layerId);
    },
    [isActive, mode, radius, layerId, onSurfaceClick]
  );

  const layerHues = [210, 170, 35, 330, 260, 100, 15]; // Blue, Cyan, Orange, Pink, Purple, Lime, Red
  const hue = layerHues[layerIndex % layerHues.length];
  const saturation = isHovered ? 45 : isActive ? 30 : 20;
  const baseLight = isActive ? 50 : 40;
  const adjustedLight = baseLight * (1 - layerIndex * 0.05);

  // Use custom color if provided, otherwise fallback to index-based HSL
  const baseColor = layerColor || `hsl(${hue}, ${saturation}%, ${adjustedLight}%)`;
  const emissiveColor = layerColor || `hsl(${hue}, 60%, 50%)`;
  const wireframeColor = layerColor || `hsl(${hue}, 70%, 70%)`;

  const opacity = isDimmed ? 0.05 : isActive ? 0.55 : 0.25;
  const emissiveIntensity = isHovered ? 0.4 : isActive ? 0.15 : 0;

  return (
    <group>
      {/* Main sphere */}
      <mesh onDoubleClick={handleDoubleClick}>
        <sphereGeometry args={[radius, 64, 48]} />
        <meshStandardMaterial
          color={baseColor}
          transparent
          opacity={opacity}
          side={THREE.DoubleSide}
          clippingPlanes={clipPlanes}
          roughness={0.6}
          metalness={0.1}
          emissive={isHovered || isActive ? emissiveColor : '#000000'}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>

      {/* Inner cut face (brighter, smoother) - only when clipping */}
      {clipEnabled && (
        <mesh>
          <sphereGeometry args={[radius, 64, 48]} />
          <meshStandardMaterial
            color={layerColor || `hsl(${hue}, ${saturation + 10}%, ${adjustedLight + 10}%)`}
            transparent
            opacity={isDimmed ? 0.05 : isActive ? 0.65 : 0.35}
            side={THREE.BackSide}
            clippingPlanes={clipPlanes}
            roughness={0.3}
            metalness={0.05}
          />
        </mesh>
      )}

      {/* Wireframe for active layer - synced with layer color */}
      {isActive && (
        <mesh>
          <sphereGeometry args={[radius, 32, 24]} />
          <meshBasicMaterial
            wireframe
            color={wireframeColor}
            transparent
            opacity={0.15}
            clippingPlanes={clipPlanes}
          />
        </mesh>
      )}

      {/* Markers */}
      {markers.map((marker) => {
        const isSelected = marker.id === selectedMarkerId;
        const color = getDominantColor(marker.composition);

        // Apply elevation along surface normal
        const basePos = new THREE.Vector3(...marker.position);
        const normal = basePos.clone().normalize();
        const elevatedPos = basePos.clone().add(normal.multiplyScalar(marker.elevation * 0.2));

        return (
          <group key={marker.id} position={[elevatedPos.x, elevatedPos.y, elevatedPos.z]}>
            <mesh
              onClick={(e) => {
                e.stopPropagation();
                onMarkerClick(marker.id);
              }}
            >
              <sphereGeometry args={[0.08, 16, 16]} />
              <meshStandardMaterial
                color={color}
                emissive={isSelected ? color : '#000000'}
                emissiveIntensity={isSelected ? 0.6 : 0}
                roughness={0.3}
                clippingPlanes={clipPlanes}
              />
            </mesh>

            {showLabels && marker.composition.length > 0 && (
              <Html distanceFactor={6} position={[0, 0.15, 0]} center style={{ pointerEvents: 'none' }} zIndexRange={[0, 0]}>
                <div className="flex flex-col items-center gap-0 whitespace-nowrap">
                  {marker.composition.map((c, i) => (
                    <span
                      key={i}
                      className="text-[6px] font-bold text-white uppercase tracking-tighter drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                    >
                      {(c.name || 'UNK').slice(0, 3)}-{c.percentage}%
                    </span>
                  ))}
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}

function CameraFocus({ target }: { target: [number, number, number] | null }) {
  const { camera } = useThree();
  const prevTarget = useRef<string | null>(null);

  const key = target ? target.join(',') : null;
  if (key && key !== prevTarget.current) {
    prevTarget.current = key;
    const dir = new THREE.Vector3(...target!).normalize();
    const camPos = dir.multiplyScalar(5);
    camera.position.lerp(camPos, 0.3);
    camera.lookAt(0, 0, 0);
  }

  return null;
}

export const StoneScene = forwardRef<StoneSceneHandle, StoneSceneProps>(({
  caseData,
  activeLayerId,
  selectedMarkerId,
  clipPosition,
  clipEnabled,
  onSurfaceClick,
  onMarkerClick,
  focusMarkerId,
  hoveredLayerId,
  mode,
  showLabels,
}, ref) => {
  const captureFn = useRef<(() => string) | null>(null);

  useImperativeHandle(ref, () => ({
    capture: () => {
      if (!captureFn.current) return null;
      return captureFn.current();
    }
  }));
  const clipPlane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(-1, 0, 0), clipPosition * 4 - 2),
    [clipPosition]
  );
  const clipPlanes = clipEnabled ? [clipPlane] : [];

  const focusTarget = useMemo(() => {
    if (!focusMarkerId) return null;
    for (const layer of caseData.layers) {
      const m = layer.markers.find((mk) => mk.id === focusMarkerId);
      if (m) return m.position;
    }
    return null;
  }, [focusMarkerId, caseData.layers]);

  const visibleLayers = caseData.layers.filter((l) => l.isVisible);
  const outerRadius = caseData.layers[0]?.radius || 2;

  return (
    <Canvas
      camera={{ position: [4, 2, 4], fov: 45 }}
      onCreated={(state) => {
        state.gl.localClippingEnabled = true;
      }}
      gl={{ preserveDrawingBuffer: true }}
      style={{ background: 'transparent' }}
    >
      <CaptureHelper onCapture={(fn) => { captureFn.current = fn; }} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={0.7} />
      <directionalLight position={[-3, -2, -4]} intensity={0.3} />

      <OrbitControls makeDefault enableDamping dampingFactor={0.08} minDistance={2} maxDistance={12} />

      <ReferenceOrigin radius={outerRadius} />

      {visibleLayers.map((layer, idx) => (
        <LayerSphere
          key={layer.id}
          radius={layer.radius}
          layerId={layer.id}
          layerIndex={idx}
          isActive={layer.id === activeLayerId}
          markers={layer.markers}
          selectedMarkerId={selectedMarkerId}
          clipPlanes={clipPlanes}
          clipEnabled={clipEnabled}
          isHovered={hoveredLayerId === layer.id}
          isDimmed={hoveredLayerId !== null && hoveredLayerId !== layer.id}
          onSurfaceClick={onSurfaceClick}
          onMarkerClick={onMarkerClick}
          mode={mode}
          showLabels={showLabels}
          layerColor={layer.color}
        />
      ))}

      <CameraFocus target={focusTarget} />
    </Canvas>
  );
});
