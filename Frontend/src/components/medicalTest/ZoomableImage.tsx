import React from 'react';
import { Image } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const MAX_SCALE = 5;
const DOUBLE_TAP_SCALE = 2.5;

interface ZoomableImageProps {
  uri: string;
  width: number;
  height: number;
  onZoomChange?: (zoomed: boolean) => void; // para bloquear el deslizamiento entre imágenes mientras hay zoom
}

// Imagen con zoom de dos dedos, arrastre cuando está agrandada y doble toque (iOS y Android).
export default function ZoomableImage({ uri, width, height, onZoomChange }: ZoomableImageProps) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  const notifyZoom = (zoomed: boolean) => onZoomChange?.(zoomed);

  // Limita el arrastre para que la imagen no se vaya de la pantalla
  const clamp = (value: number, currentScale: number, size: number) => {
    'worklet';
    const max = ((currentScale - 1) * size) / 2;
    return Math.min(Math.max(value, -max), max);
  };

  const reset = () => {
    'worklet';
    scale.value = withTiming(1);
    savedScale.value = 1;
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedX.value = 0;
    savedY.value = 0;
    runOnJS(notifyZoom)(false);
  };

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.min(Math.max(savedScale.value * e.scale, 0.8), MAX_SCALE);
    })
    .onEnd(() => {
      if (scale.value <= 1) {
        reset();
      } else {
        savedScale.value = scale.value;
        translateX.value = withTiming(clamp(translateX.value, scale.value, width));
        translateY.value = withTiming(clamp(translateY.value, scale.value, height));
        savedX.value = clamp(translateX.value, scale.value, width);
        savedY.value = clamp(translateY.value, scale.value, height);
        runOnJS(notifyZoom)(true);
      }
    });

  // El arrastre solo se activa con zoom; sin zoom el dedo mueve el carrusel de imágenes
  const pan = Gesture.Pan()
    .manualActivation(true)
    .onTouchesMove((_, state) => {
      if (savedScale.value > 1) state.activate();
      else state.fail();
    })
    .onUpdate((e) => {
      translateX.value = clamp(savedX.value + e.translationX, scale.value, width);
      translateY.value = clamp(savedY.value + e.translationY, scale.value, height);
    })
    .onEnd(() => {
      savedX.value = translateX.value;
      savedY.value = translateY.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (savedScale.value > 1) {
        reset();
      } else {
        scale.value = withTiming(DOUBLE_TAP_SCALE);
        savedScale.value = DOUBLE_TAP_SCALE;
        runOnJS(notifyZoom)(true);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={Gesture.Simultaneous(pinch, pan, doubleTap)}>
      <Animated.View style={[{ width, height, alignItems: 'center', justifyContent: 'center' }, animatedStyle]}>
        <Image source={{ uri }} style={{ width, height }} resizeMode="contain" />
      </Animated.View>
    </GestureDetector>
  );
}
