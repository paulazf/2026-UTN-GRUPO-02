import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import { SeasonId } from '../../theme/seasons';
import { HEART } from './PawLogo';

interface SeasonDecorProps {
  season: SeasonId;
  /** "header": franja de 390 x 112 alineada a la derecha. "splash": pantalla completa de 390 x 844. */
  variant: 'header' | 'splash';
}

const STROKE = { stroke: '#FFFFFF', strokeOpacity: 0.3, strokeWidth: 1.5, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
const n = (v: number) => Math.round(v * 10) / 10;

// ---------- piezas (todas de línea blanca, en coordenadas de un lienzo de 390 de ancho)

const Bauble = ({ x, len, r }: { x: number; len: number; r: number }) => (
  <G>
    <Path d={`M${x} 0L${x} ${len}M${x - 3} ${len}L${x + 3} ${len}`} {...STROKE} />
    <Circle cx={x} cy={len + r} r={r} {...STROKE} />
  </G>
);

const Flake = ({ cx, cy, r }: { cx: number; cy: number; r: number }) => {
  const d = [0, 60, 120]
    .map((a) => {
      const t = (a * Math.PI) / 180;
      return `M${n(cx - r * Math.cos(t))} ${n(cy - r * Math.sin(t))}L${n(cx + r * Math.cos(t))} ${n(cy + r * Math.sin(t))}`;
    })
    .join('');
  return <Path d={d} {...STROKE} />;
};

const Sparkle = ({ cx, cy, r }: { cx: number; cy: number; r: number }) => (
  <Path
    d={`M${cx} ${cy - r}Q${cx} ${cy} ${cx + r} ${cy}Q${cx} ${cy} ${cx} ${cy + r}Q${cx} ${cy} ${cx - r} ${cy}Q${cx} ${cy} ${cx} ${cy - r}Z`}
    {...STROKE}
  />
);

const HeartLine = ({ cx, cy, w, rot }: { cx: number; cy: number; w: number; rot: number }) => {
  const s = w / 40;
  return (
    <G transform={`translate(${cx} ${cy}) rotate(${rot}) scale(${s}) translate(-100 -139.5)`}>
      <Path d={HEART} {...STROKE} strokeWidth={1.5 / s} />
    </G>
  );
};

const Moon = ({ cx, cy, r }: { cx: number; cy: number; r: number }) => (
  <Path
    d={`M${n(cx + r * 0.3)} ${n(cy - r * 0.95)}A${r} ${r} 0 1 0 ${n(cx + r * 0.95)} ${n(cy + r * 0.3)}A${n(r * 0.8)} ${n(r * 0.8)} 0 0 1 ${n(cx + r * 0.3)} ${n(cy - r * 0.95)}Z`}
    {...STROKE}
  />
);

/** Telaraña en la esquina superior derecha (390, 0). */
const Web = ({ R }: { R: number }) => {
  const W = 390;
  const angles = [0, 18, 36, 54, 72, 90].map((a) => (a * Math.PI) / 180);
  const pt = (rr: number, t: number) => `${n(W - rr * Math.cos(t))} ${n(rr * Math.sin(t))}`;
  let d = angles.map((t) => `M${W} 0L${pt(R, t)}`).join('');
  for (const k of [0.35, 0.6, 0.85]) {
    d += angles.map((t, i) => `${i ? 'L' : 'M'}${pt(R * k * (i % 2 ? 0.93 : 1), t)}`).join('');
  }
  return <Path d={d} {...STROKE} />;
};

const Flower = ({ cx, cy, r }: { cx: number; cy: number; r: number }) => (
  <G>
    {[0, 1, 2, 3, 4].map((i) => {
      const t = (i * 2 * Math.PI) / 5 - Math.PI / 2;
      return <Circle key={i} cx={n(cx + r * 0.55 * Math.cos(t))} cy={n(cy + r * 0.55 * Math.sin(t))} r={n(r * 0.42)} {...STROKE} />;
    })}
    <Circle cx={cx} cy={cy} r={n(r * 0.2)} {...STROKE} />
  </G>
);

const Egg = ({ cx, cy, w, h }: { cx: number; cy: number; w: number; h: number }) => (
  <G>
    <Ellipse cx={cx} cy={cy} rx={w / 2} ry={h / 2} {...STROKE} />
    <Path
      d={`M${n(cx - w * 0.46)} ${n(cy - h * 0.14)}L${n(cx + w * 0.46)} ${n(cy - h * 0.14)}M${n(cx - w * 0.48)} ${n(cy + h * 0.12)}L${n(cx + w * 0.48)} ${n(cy + h * 0.12)}`}
      {...STROKE}
    />
  </G>
);

const Sun = ({ cx, cy, r }: { cx: number; cy: number; r: number }) => {
  const rays = Array.from({ length: 8 }, (_, i) => {
    const t = (i * Math.PI) / 4;
    return `M${n(cx + r * 1.4 * Math.cos(t))} ${n(cy + r * 1.4 * Math.sin(t))}L${n(cx + r * 1.85 * Math.cos(t))} ${n(cy + r * 1.85 * Math.sin(t))}`;
  }).join('');
  return (
    <G>
      <Circle cx={cx} cy={cy} r={r} {...STROKE} />
      <Path d={rays} {...STROKE} />
    </G>
  );
};

const Cockade = ({ cx, cy, r }: { cx: number; cy: number; r: number }) => (
  <G>
    <Circle cx={cx} cy={cy} r={r} {...STROKE} />
    <Circle cx={cx} cy={cy} r={n(r * 0.62)} {...STROKE} />
    <Circle cx={cx} cy={cy} r={n(r * 0.26)} {...STROKE} />
  </G>
);

// ---------- composición por festividad

function headerDecor(season: SeasonId) {
  switch (season) {
    case 'navidad':
      return (<><Bauble x={232} len={34} r={8} /><Bauble x={276} len={58} r={11} /><Bauble x={332} len={44} r={9} /><Flake cx={364} cy={92} r={10} /><Flake cx={204} cy={88} r={7} /></>);
    case 'sanValentin':
      return (<><HeartLine cx={248} cy={78} w={28} rot={-12} /><HeartLine cx={300} cy={56} w={16} rot={12} /><HeartLine cx={346} cy={86} w={22} rot={8} /><HeartLine cx={206} cy={58} w={10} rot={0} /></>);
    case 'pascuas':
      return (<><Egg cx={250} cy={78} w={22} h={30} /><Egg cx={300} cy={64} w={16} h={22} /><Egg cx={346} cy={84} w={24} h={32} /><Sparkle cx={210} cy={62} r={5} /></>);
    case 'halloween':
      return (<><Web R={92} /><Moon cx={232} cy={74} r={15} /><Sparkle cx={200} cy={54} r={5} /><Sparkle cx={280} cy={94} r={4} /></>);
    case 'primavera':
      return (<><Flower cx={246} cy={78} r={16} /><Flower cx={302} cy={58} r={11} /><Flower cx={348} cy={86} r={15} /><Circle cx={210} cy={62} r={3} {...STROKE} /></>);
    case 'patrias':
      return (<><Sun cx={338} cy={76} r={13} /><Cockade cx={262} cy={74} r={13} /><Sparkle cx={214} cy={60} r={5} /><Sparkle cx={298} cy={98} r={4} /></>);
    default:
      return null;
  }
}

function splashDecor(season: SeasonId) {
  switch (season) {
    case 'navidad':
      return (<><Bauble x={60} len={150} r={22} /><Bauble x={120} len={90} r={14} /><Bauble x={300} len={120} r={18} /><Bauble x={345} len={190} r={12} /><Flake cx={70} cy={560} r={22} /><Flake cx={330} cy={620} r={16} /><Flake cx={200} cy={770} r={12} /><Flake cx={40} cy={720} r={9} /></>);
    case 'sanValentin':
      return (<><HeartLine cx={70} cy={140} w={60} rot={-14} /><HeartLine cx={320} cy={110} w={40} rot={12} /><HeartLine cx={340} cy={560} w={50} rot={10} /><HeartLine cx={50} cy={640} w={34} rot={-8} /><HeartLine cx={210} cy={775} w={24} rot={0} /><HeartLine cx={250} cy={200} w={18} rot={8} /></>);
    case 'pascuas':
      return (<><Egg cx={70} cy={150} w={48} h={64} /><Egg cx={320} cy={130} w={36} h={48} /><Egg cx={335} cy={600} w={44} h={58} /><Egg cx={55} cy={660} w={32} h={42} /><Sparkle cx={200} cy={90} r={8} /><Sparkle cx={120} cy={745} r={7} /><Sparkle cx={280} cy={745} r={6} /></>);
    case 'halloween':
      return (<><Web R={220} /><Moon cx={90} cy={150} r={44} /><Sparkle cx={250} cy={215} r={8} /><Sparkle cx={60} cy={560} r={7} /><Sparkle cx={330} cy={640} r={9} /><Sparkle cx={180} cy={775} r={6} /></>);
    case 'primavera':
      return (<><Flower cx={70} cy={150} r={36} /><Flower cx={320} cy={120} r={26} /><Flower cx={335} cy={610} r={32} /><Flower cx={55} cy={650} r={24} /><Flower cx={200} cy={775} r={16} /><Circle cx={250} cy={215} r={4} {...STROKE} /><Circle cx={120} cy={560} r={4} {...STROKE} /></>);
    case 'patrias':
      return (<><Sun cx={310} cy={140} r={34} /><Cockade cx={80} cy={160} r={30} /><Cockade cx={330} cy={620} r={22} /><Sparkle cx={60} cy={600} r={8} /><Sparkle cx={200} cy={775} r={7} /><Sparkle cx={250} cy={235} r={6} /></>);
    default:
      return null;
  }
}

/** Adornos de línea de cada festividad. Son decorativos: no reciben toques ni los lee el lector de pantalla. */
export default function SeasonDecor({ season, variant }: SeasonDecorProps) {
  const content = variant === 'header' ? headerDecor(season) : splashDecor(season);
  if (!content) return null;
  return (
    <Svg
      pointerEvents="none"
      accessible={false}
      style={StyleSheet.absoluteFill}
      width="100%"
      height="100%"
      viewBox={variant === 'header' ? '0 0 390 112' : '0 0 390 844'}
      preserveAspectRatio={variant === 'header' ? 'xMaxYMin slice' : 'xMidYMid slice'}
    >
      {content}
    </Svg>
  );
}
