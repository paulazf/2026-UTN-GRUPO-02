import React from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSeasonTheme } from '../../context/ThemeContext';
import PawLogo from './PawLogo';
import SeasonDecor from './SeasonDecor';

/** Header de Inicio: logo y nombre de la app sobre el color (y los adornos) de la temporada. */
export default function BrandHeader() {
  const insets = useSafeAreaInsets();
  const { season, palette } = useSeasonTheme();

  return (
    <View
      className="overflow-hidden rounded-b-[40px] shadow-sm"
      style={{ backgroundColor: palette.header, paddingTop: Math.max(insets.top, 24), paddingBottom: 22 }}
    >
      <SeasonDecor season={season} variant="header" />
      <View className="h-11 flex-row items-center gap-2 px-6" accessible accessibilityRole="header" accessibilityLabel="PetLife">
        <PawLogo season={season} size={44} color="#FFFFFF" cut={palette.header} />
        <Text className="text-2xl font-extrabold tracking-tight text-white">PetLife</Text>
      </View>
    </View>
  );
}
