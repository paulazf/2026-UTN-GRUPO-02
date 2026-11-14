import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSeasonTheme } from '../context/ThemeContext';

export type NavTab = 'INICIO' | 'MASCOTAS' | 'CALENDARIO' | 'PERFIL';

interface BottomNavBarProps {
  currentTab: NavTab; //La pantalla actual (inicio, mascotas, calendario o perfil)
  isDetailActive?: boolean;
  onSelectTab: (tab: NavTab) => void;
}

type IconName = keyof typeof Ionicons.glyphMap;

const TABS: { tab: NavTab; label: string; icon: IconName; iconOutline: IconName }[] = [
  { tab: 'INICIO', label: 'Inicio', icon: 'home', iconOutline: 'home-outline' },
  { tab: 'MASCOTAS', label: 'Mascotas', icon: 'paw', iconOutline: 'paw-outline' },
  { tab: 'CALENDARIO', label: 'Calendario', icon: 'calendar', iconOutline: 'calendar-outline' },
  { tab: 'PERFIL', label: 'Perfil', icon: 'person', iconOutline: 'person-outline' },
];

const INACTIVE = '#A89B98';

export default function BottomNavBar({
  currentTab,
  isDetailActive = false,
  onSelectTab,
}: BottomNavBarProps) {
  const { palette } = useSeasonTheme();

  const isTabActive = (tab: NavTab) => {
    if (tab === 'MASCOTAS') {
      return (currentTab === 'MASCOTAS' && !isDetailActive) || isDetailActive;
    }
    return currentTab === tab && !isDetailActive;
  };

  return (
    <SafeAreaView edges={['bottom']} className="border-t border-[#F5ECE8] bg-white">
      <View className="flex-row items-center justify-around pt-2 pb-1.5">
        {TABS.map(({ tab, label, icon, iconOutline }) => {
          const active = isTabActive(tab);
          const color = active ? palette.accent : INACTIVE;
          return (
            <Pressable
              key={tab}
              onPress={() => onSelectTab(tab)}
              className="items-center py-1 px-3 active:opacity-70"
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={label}
            >
              <Ionicons name={active ? icon : iconOutline} size={22} color={color} />
              <Text className={`mt-1 text-[11px] ${active ? 'font-bold' : 'font-medium'}`} style={{ color }}>
                {label}
              </Text>
              <View
                className="mt-1 h-1 w-1 rounded-full"
                style={{ backgroundColor: active ? palette.accent : 'transparent' }}
              />
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}
