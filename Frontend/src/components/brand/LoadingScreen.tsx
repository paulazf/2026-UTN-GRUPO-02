import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Text, View } from 'react-native';
import { useSeasonTheme } from '../../context/ThemeContext';
import PawLogo from './PawLogo';
import SeasonDecor from './SeasonDecor';

const STEPS = [
  { left: -32, top: 62, rotate: '-16deg' },
  { left: 14, top: 34, rotate: '14deg' },
  { left: -16, top: 0, rotate: '-10deg' },
];
const STEP_MS = 240;

/** Pantalla de carga: logo de la temporada, nombre y tres huellitas que avanzan. */
export default function LoadingScreen() {
  const { season, palette } = useSeasonTheme();
  const [reduceMotion, setReduceMotion] = useState(false);
  const steps = useRef(STEPS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      steps.forEach((v) => v.setValue(1));
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.stagger(
          STEP_MS,
          steps.map((v) => Animated.timing(v, { toValue: 1, duration: 180, useNativeDriver: true })),
        ),
        Animated.delay(STEP_MS),
        Animated.parallel(steps.map((v) => Animated.timing(v, { toValue: 0, duration: 220, useNativeDriver: true }))),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduceMotion, steps]);

  return (
    <View
      className="flex-1 items-center justify-center"
      style={{ backgroundColor: palette.header }}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="PetLife. Cargando"
    >
      <SeasonDecor season={season} variant="splash" />

      <PawLogo season={season} size={128} color="#FFFFFF" cut={palette.header} />
      <Text className="mt-3 text-4xl font-extrabold tracking-tight text-white">PetLife</Text>
      <Text className="mt-2 text-[15px] font-medium text-white/90">La libreta de salud de tu mascota</Text>

      <View className="mt-24 h-24 w-6">
        {STEPS.map((step, i) => (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: step.left,
              top: step.top,
              opacity: steps[i],
              transform: [
                { rotate: step.rotate },
                { scale: steps[i].interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
              ],
            }}
          >
            <PawLogo season="original" size={26} color="#FFFFFF" cut={palette.header} />
          </Animated.View>
        ))}
      </View>
      <Text className="mt-3 text-sm font-medium text-white/85">Cargando...</Text>
    </View>
  );
}
