import { useEffect, useState } from "react";
import { motion, useMotionValue, useAnimationControls } from "framer-motion";

interface Slot {
  label: string;
  type: "win" | "lose";
}

const SLOTS: Slot[] = [
  { label: "FREI!", type: "win" },
  { label: "x2", type: "lose" },
  { label: "FREI!", type: "win" },
  { label: "x2", type: "lose" },
  { label: "FREI!", type: "win" },
  { label: "x2", type: "lose" },
  { label: "FREI!", type: "win" },
  { label: "x2", type: "lose" },
];

const SLOT_COUNT = SLOTS.length;
const SLOT_ANGLE = 360 / SLOT_COUNT;

interface Props {
  spinning: boolean;
  result: "won" | "lost" | null;
  onSpinComplete?: () => void;
}

export function Wheel({ spinning, result, onSpinComplete }: Props) {
  const controls = useAnimationControls();
  const rotation = useMotionValue(0);
  const [hasSpun, setHasSpun] = useState(false);

  useEffect(() => {
    if (!spinning || !result || hasSpun) return;
    setHasSpun(true);

    const winSlots = SLOTS.map((s, i) => ({ slot: s, index: i })).filter((s) =>
      result === "won" ? s.slot.type === "win" : s.slot.type === "lose",
    );
    const target = winSlots[Math.floor(Math.random() * winSlots.length)].index;
    const targetAngle = -(target * SLOT_ANGLE + SLOT_ANGLE / 2);
    const fullSpins = 6 + Math.floor(Math.random() * 3);
    const finalRotation = fullSpins * 360 + targetAngle;

    controls
      .start({
        rotate: finalRotation,
        transition: {
          duration: 5,
          ease: [0.17, 0.67, 0.18, 1],
        },
      })
      .then(() => {
        if (navigator.vibrate) {
          navigator.vibrate(result === "won" ? [80, 60, 80, 60, 200] : [400]);
        }
        onSpinComplete?.();
      });
  }, [spinning, result, controls, hasSpun, onSpinComplete]);

  return (
    <div className="relative mx-auto aspect-square w-72 max-w-full">
      <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-2">
        <div
          className="h-0 w-0"
          style={{
            borderLeft: "14px solid transparent",
            borderRight: "14px solid transparent",
            borderTop: "24px solid hsl(var(--primary))",
          }}
        />
      </div>
      <motion.div
        animate={controls}
        style={{ rotate: rotation }}
        className="h-full w-full rounded-full border-4 border-primary shadow-2xl shadow-primary/30"
      >
        <svg viewBox="-100 -100 200 200" className="h-full w-full" aria-hidden>
          {SLOTS.map((slot, i) => {
            const startAngle = i * SLOT_ANGLE - 90;
            const endAngle = startAngle + SLOT_ANGLE;
            const startRad = (startAngle * Math.PI) / 180;
            const endRad = (endAngle * Math.PI) / 180;
            const x1 = Math.cos(startRad) * 100;
            const y1 = Math.sin(startRad) * 100;
            const x2 = Math.cos(endRad) * 100;
            const y2 = Math.sin(endRad) * 100;
            const labelAngle = startAngle + SLOT_ANGLE / 2;
            const labelRad = (labelAngle * Math.PI) / 180;
            const labelX = Math.cos(labelRad) * 65;
            const labelY = Math.sin(labelRad) * 65;
            return (
              <g key={i}>
                <path
                  d={`M 0 0 L ${x1} ${y1} A 100 100 0 0 1 ${x2} ${y2} Z`}
                  fill={slot.type === "win" ? "hsl(142 71% 35%)" : "hsl(0 72% 41%)"}
                  stroke="hsl(var(--background))"
                  strokeWidth="1.5"
                />
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="white"
                  fontSize="14"
                  fontWeight="800"
                  transform={`rotate(${labelAngle + 90} ${labelX} ${labelY})`}
                >
                  {slot.label}
                </text>
              </g>
            );
          })}
          <circle cx="0" cy="0" r="14" fill="hsl(var(--primary))" stroke="white" strokeWidth="3" />
        </svg>
      </motion.div>
    </div>
  );
}
