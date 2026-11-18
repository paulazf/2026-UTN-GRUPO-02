import React, { useContext, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSeasonTheme } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';
import SeasonDecor from '../components/brand/SeasonDecor';
import {
  ONBOARDING_SLIDES,
  markOnboardingAsSeen,
} from '../services/onboardingService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type RouteParams = {
  Onboarding?: {
    isHelpMode?: boolean;
  };
};

export default function OnboardingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<RouteProp<RouteParams, 'Onboarding'>>();
  const { season, palette } = useSeasonTheme();

  const authContext = useContext(AuthContext);
  const isLoggedIn = Boolean(authContext?.userToken);
  const isHelpMode = Boolean(route.params?.isHelpMode) || isLoggedIn;
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    if (index >= 0 && index < ONBOARDING_SLIDES.length && index !== currentIndex) {
      setCurrentIndex(index);
    }
  };

  const goToNextSlide = () => {
    if (currentIndex < ONBOARDING_SLIDES.length - 1) {
      const nextIndex = currentIndex + 1;
      scrollRef.current?.scrollTo({ x: nextIndex * SCREEN_WIDTH, animated: true });
      setCurrentIndex(nextIndex);
    } else {
      handleFinish();
    }
  };

  const handleSkip = async () => {
    await markOnboardingAsSeen();
    if (isLoggedIn) {
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('MainTabs' as never);
      }
    } else {
      navigation.replace('Register');
    }
  };

  const handleFinish = async () => {
    await markOnboardingAsSeen();
    if (isHelpMode || isLoggedIn) {
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('MainTabs' as never);
      }
      return;
    }
    navigation.replace('Register');
  };

  const handleGoToLogin = async () => {
    await markOnboardingAsSeen();
    navigation.replace('Login');
  };

  const isLastSlide = currentIndex === ONBOARDING_SLIDES.length - 1;

  return (
    <SafeAreaView className="flex-1 bg-[#FFF5F3]">
      <SeasonDecor season={season} variant="splash" color={palette.accent} opacity={0.16} />

      {/* Barra Superior */}
      <View className="flex-row items-center justify-between px-6 pt-3 pb-2 z-10">
        <View className="flex-row items-center">
          <View
            className="w-8 h-8 rounded-full items-center justify-center mr-2 shadow-xs"
            style={{ backgroundColor: palette.accent }}
          >
            <Ionicons name="paw" size={16} color="#FFFFFF" />
          </View>
          <Text className="text-[17px] font-extrabold text-[#1A202C]">PetLife</Text>
        </View>

        {isHelpMode ? (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="w-10 h-10 rounded-full bg-white border border-slate-200 items-center justify-center shadow-xs active:opacity-70"
            accessibilityLabel="Cerrar tutorial"
          >
            <Ionicons name="close" size={20} color="#4A5568" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleSkip}
            className="px-4 py-2 rounded-full bg-white border border-slate-200 shadow-xs active:opacity-70"
            accessibilityLabel="Saltar tutorial e ir a registrarse"
          >
            <Text className="text-[14px] font-bold text-[#718096]">Saltar</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Carrusel de Diapositivas */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        className="flex-1"
      >
        {ONBOARDING_SLIDES.map((slide) => (
          <View
            key={slide.id}
            style={{ width: SCREEN_WIDTH }}
            className="flex-1 px-8 items-center justify-center py-6"
          >
            {/* Ilustración / Badge Central */}
            <View className="relative items-center justify-center mb-8">
              <View
                className="w-44 h-44 rounded-full items-center justify-center shadow-sm"
                style={{ backgroundColor: `${palette.header}20` }}
              >
                <View
                  className="w-32 h-32 rounded-full items-center justify-center shadow-md"
                  style={{ backgroundColor: palette.header }}
                >
                  <Ionicons name={slide.icon as any} size={64} color="#FFFFFF" />
                </View>
              </View>

              {/* Burbuja secundaria decorativa */}
              {slide.secondaryIcon ? (
                <View
                  className="absolute bottom-1 right-2 w-12 h-12 rounded-full bg-white border-2 items-center justify-center shadow-md"
                  style={{ borderColor: palette.accent }}
                >
                  <Ionicons name={slide.secondaryIcon as any} size={22} color={palette.accent} />
                </View>
              ) : null}
            </View>

            {/* Píldora de Categoría */}
            <View
              className="px-3.5 py-1.5 rounded-full mb-3"
              style={{ backgroundColor: `${palette.accent}15` }}
            >
              <Text className="text-xs font-bold" style={{ color: palette.accent }}>
                {slide.tag.toUpperCase()}
              </Text>
            </View>

            {/* Título y Descripción */}
            <Text className="text-[25px] font-extrabold text-[#1A202C] text-center mb-3">
              {slide.title}
            </Text>
            <Text className="text-[15px] text-[#718096] text-center leading-relaxed px-2">
              {slide.description}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Pie de Pantalla: Paginación y Botones */}
      <View className="px-8 pb-8 pt-4">
        {/* Indicadores de Página (Dots) */}
        <View className="flex-row justify-center items-center mb-6 space-x-2">
          {ONBOARDING_SLIDES.map((_, index) => {
            const isActive = index === currentIndex;
            return (
              <View
                key={index}
                className="h-2 rounded-full mx-1 transition-all"
                style={{
                  width: isActive ? 24 : 8,
                  backgroundColor: isActive ? palette.accent : '#CBD5E0',
                }}
              />
            );
          })}
        </View>

        {/* Botón Principal */}
        <TouchableOpacity
          onPress={goToNextSlide}
          className="rounded-full h-[54px] justify-center items-center shadow-sm flex-row active:opacity-90"
          style={{ backgroundColor: palette.accent }}
          accessibilityLabel={isLastSlide ? (isHelpMode ? 'Cerrar' : 'Crear mi cuenta') : 'Siguiente'}
        >
          <Text className="text-white text-[16px] font-bold mr-2">
            {isLastSlide
              ? isHelpMode
                ? 'Entendido, volver a la app'
                : 'Crear mi cuenta'
              : 'Siguiente'}
          </Text>
          <Ionicons
            name={isLastSlide ? (isHelpMode ? 'checkmark-circle' : 'arrow-forward') : 'arrow-forward'}
            size={18}
            color="#FFFFFF"
          />
        </TouchableOpacity>

        {/* Link Secundario (solo fuera de modo ayuda y en la última pantalla) */}
        {!isHelpMode && (
          <TouchableOpacity
            onPress={handleGoToLogin}
            className="mt-4 py-2 items-center justify-center active:opacity-70"
          >
            <Text className="text-[14px] text-[#718096]">
              ¿Ya tenés una cuenta?{' '}
              <Text className="font-bold" style={{ color: palette.accent }}>
                Iniciar sesión
              </Text>
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}
