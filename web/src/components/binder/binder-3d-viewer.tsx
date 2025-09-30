"use client";

import { Canvas } from "@react-three/fiber";
import { Float, Html, OrbitControls } from "@react-three/drei";
import { memo, useMemo, useState } from "react";
import type { BinderSheet } from "@/types/binder";

const CARD_WIDTH = 1.25;
const CARD_HEIGHT = 1.75;
const EMPTY_SLOT_IMAGE = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iNDIwIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwJSIgeDI9IjAlIiB5MT0iMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjMmMxYjNiIi8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjMTYwZDIxIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjMwMCIgaGVpZ2h0PSI0MjAiIGZpbGw9InVybCgjZykiIHJ4PSIyNCIvPjxyZWN0IHg9IjMyIiB5PSIzMiIgd2lkdGg9IjIzNiIgaGVpZ2h0PSIzNTYiIGZpbGw9IiMwMDAwMDAyMiIgcng9IjE4Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiNmZmZmZmY1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjI4Ij5FbXB0eSBTbG90PC90ZXh0Pjwvc3ZnPg==";

type Binder3DViewerProps = {
  sheet: BinderSheet;
};

type CardEntry = {
  key: string;
  name: string;
  quantity: number;
  imageUrl: string;
  origin: string;
};

export function Binder3DViewer({ sheet }: Binder3DViewerProps) {
  const cards = useMemo(() => mapSheetToEntries(sheet), [sheet]);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);

  return (
    <div className="h-[560px] w-full overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-[rgba(31,16,47,0.85)] to-[rgba(10,6,16,0.65)] shadow-[0_40px_120px_rgba(10,6,16,0.45)]">
      <Canvas camera={{ position: [0, 2.6, 5.8], fov: 38 }}>
        <color attach="background" args={["#0b0612"]} />
        <hemisphereLight args={["#f5d4ff", "#14071f", 0.35]} />
        <directionalLight position={[6, 8, 6]} intensity={1.6} castShadow />
        <BinderStage hoveredCardId={hoveredCardId} cards={cards} onHover={setHoveredCardId} />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          minPolarAngle={Math.PI / 2.6}
          maxPolarAngle={Math.PI / 2.2}
          minAzimuthAngle={-Math.PI / 6}
          maxAzimuthAngle={Math.PI / 6}
          autoRotate
          autoRotateSpeed={0.7}
        />
      </Canvas>
    </div>
  );
}

type StageProps = {
  cards: CardEntry[];
  hoveredCardId: string | null;
  onHover: (id: string | null) => void;
};

const BinderStage = memo(function BinderStage({ cards, hoveredCardId, onHover }: StageProps) {
  return (
    <group position={[0, 0.2, 0]}>
      <Float rotationIntensity={0.08} floatIntensity={0.4} speed={1.6}>
        <group>
          <BinderShell />
          {cards.map((card, index) => (
            <CardPanel
              key={card.key}
              index={index}
              card={card}
              hovered={hoveredCardId === card.key}
              onHover={onHover}
            />
          ))}
        </group>
      </Float>
    </group>
  );
});

const BinderShell = memo(function BinderShell() {
  return (
    <group>
      <mesh position={[0, 0, 0]} rotation={[-0.08, 0, 0]}>
        <boxGeometry args={[5.8, 4.4, 0.2]} />
        <meshStandardMaterial color="#1c1129" metalness={0.12} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.08, 0.05]} rotation={[-0.08, 0, 0]}>
        <boxGeometry args={[5.6, 4.2, 0.04]} />
        <meshStandardMaterial color="#29173d" emissive="#2c0949" emissiveIntensity={0.08} roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.2, 0.06]} rotation={[-0.08, 0, 0]}>
        <boxGeometry args={[0.12, 4.2, 0.22]} />
        <meshStandardMaterial color="#351f4f" metalness={0.2} roughness={0.4} />
      </mesh>
    </group>
  );
});

type CardPanelProps = {
  index: number;
  card: CardEntry;
  hovered: boolean;
  onHover: (id: string | null) => void;
};

const CardPanel = memo(function CardPanel({ index, card, hovered, onHover }: CardPanelProps) {
  const col = index % 3;
  const row = Math.floor(index / 3);
  const x = (col - 1) * (CARD_WIDTH + 0.25);
  const y = (1 - row) * (CARD_HEIGHT + 0.32);
  const z = 0.16;

  return (
    <group position={[x, y, z]}>
      <mesh
        rotation={[-0.08, 0, 0]}
        onPointerOver={() => onHover(card.key)}
        onPointerOut={() => onHover(null)}
      >
        <boxGeometry args={[CARD_WIDTH, CARD_HEIGHT, 0.05]} />
        <meshStandardMaterial color={hovered ? "#f4e1ff" : "#241530"} metalness={0.35} roughness={0.45} />
      </mesh>
      <Html position={[0, 0, 0.04]} center transform>
        <div
          className="relative h-[220px] w-[150px] overflow-hidden rounded-[18px] border border-white/10 shadow-[0_20px_40px_rgba(10,6,16,0.45)]"
          style={{
            transform: "rotateX(5deg)",
            boxShadow: hovered ? "0 18px 42px rgba(210,189,255,0.45)" : undefined,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={card.imageUrl}
            alt={card.name}
            className="h-full w-full object-cover"
            draggable={false}
          />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 via-black/10 to-transparent px-2 py-1 text-[10px] uppercase tracking-[1.5px] text-white/80">
            <span className="truncate">{card.name}</span>
            {card.quantity > 1 ? <span className="font-semibold">x{card.quantity}</span> : null}
          </div>
          <div className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-[2px] text-[9px] uppercase tracking-[1.5px] text-white/70">
            {card.origin}
          </div>
        </div>
      </Html>
    </group>
  );
});

function mapSheetToEntries(sheet: BinderSheet): CardEntry[] {
  return sheet.slots.map((slot) => {
    const primary = slot.variants[0];
    if (!primary) {
      return {
        key: `slot-${slot.slotIndex}`,
        name: "Empty Slot",
        quantity: 0,
        imageUrl: EMPTY_SLOT_IMAGE,
        origin: "open",
      } satisfies CardEntry;
    }
    return {
      key: primary.id ?? `slot-${slot.slotIndex}`,
      name: primary.name,
      quantity: primary.quantity,
      imageUrl: primary.scan?.imageUrl ?? EMPTY_SLOT_IMAGE,
      origin: primary.acquisition.source.replace("-", " "),
    } satisfies CardEntry;
  });
}






