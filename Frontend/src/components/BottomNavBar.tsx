import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export type NavTab = 'INICIO' | 'MASCOTAS' | 'CALENDARIO' | 'PERFIL';

interface BottomNavBarProps {
  currentTab: NavTab; //La pantalla actual (inicio, mascotas, calendario o perfil)
  isDetailActive?: boolean; 
  onSelectTab: (tab: NavTab) => void;
}

export default function BottomNavBar({
  currentTab,
  isDetailActive = false,
  onSelectTab,
}: BottomNavBarProps) {
  const isTabActive = (tab: NavTab) => {
    if (tab === 'MASCOTAS') {
      return (currentTab === 'MASCOTAS' && !isDetailActive) || isDetailActive;
    }
    return currentTab === tab && !isDetailActive;
  };

  return (
    <SafeAreaView edges={['bottom']} className="border-t border-[#F5ECE8] bg-white">
      <View className="flex-row items-center justify-around pt-2 pb-1.5">
        {/* 1. Inicio */}
        <Pressable
          onPress={() => onSelectTab('INICIO')}
          className="items-center py-1 px-3 active:opacity-70"
        >
          <Ionicons
            name={isTabActive('INICIO') ? 'home' : 'home-outline'}
            size={22}
            color={isTabActive('INICIO') ? '#DE6B80' : '#A89B98'}
          />
          <Text
            className={`mt-1 text-[11px] ${
              isTabActive('INICIO')
                ? 'font-bold text-[#DE6B80]'
                : 'font-medium text-[#A89B98]'
            }`}
          >
            Inicio
          </Text>
          {isTabActive('INICIO') ? (
            <View className="mt-1 h-1 w-1 rounded-full bg-[#DE6B80]" />
          ) : (
            <View className="mt-1 h-1 w-1" />
          )}
        </Pressable>

        {/* 2. Mascotas */}
        <Pressable
          onPress={() => onSelectTab('MASCOTAS')}
          className="items-center py-1 px-3 active:opacity-70"
        >
          <Ionicons
            name={isTabActive('MASCOTAS') ? 'paw' : 'paw-outline'}
            size={22}
            color={isTabActive('MASCOTAS') ? '#DE6B80' : '#A89B98'}
          />
          <Text
            className={`mt-1 text-[11px] ${
              isTabActive('MASCOTAS')
                ? 'font-bold text-[#DE6B80]'
                : 'font-medium text-[#A89B98]'
            }`}
          >
            Mascotas
          </Text>
          {isTabActive('MASCOTAS') ? (
            <View className="mt-1 h-1 w-1 rounded-full bg-[#DE6B80]" />
          ) : (
            <View className="mt-1 h-1 w-1" />
          )}
        </Pressable>

        {/* 3. Calendario */}
        <Pressable
          onPress={() => onSelectTab('CALENDARIO')}
          className="items-center py-1 px-3 active:opacity-70"
        >
          <Ionicons
            name={isTabActive('CALENDARIO') ? 'calendar' : 'calendar-outline'}
            size={22}
            color={isTabActive('CALENDARIO') ? '#DE6B80' : '#A89B98'}
          />
          <Text
            className={`mt-1 text-[11px] ${
              isTabActive('CALENDARIO')
                ? 'font-bold text-[#DE6B80]'
                : 'font-medium text-[#A89B98]'
            }`}
          >
            Calendario
          </Text>
          {isTabActive('CALENDARIO') ? (
            <View className="mt-1 h-1 w-1 rounded-full bg-[#DE6B80]" />
          ) : (
            <View className="mt-1 h-1 w-1" />
          )}
        </Pressable>

        {/* 4. Perfil */}
        <Pressable
          onPress={() => onSelectTab('PERFIL')}
          className="items-center py-1 px-3 active:opacity-70"
        >
          <Ionicons
            name={isTabActive('PERFIL') ? 'person' : 'person-outline'}
            size={22}
            color={isTabActive('PERFIL') ? '#DE6B80' : '#A89B98'}
          />
          <Text
            className={`mt-1 text-[11px] ${
              isTabActive('PERFIL')
                ? 'font-bold text-[#DE6B80]'
                : 'font-medium text-[#A89B98]'
            }`}
          >
            Perfil
          </Text>
          {isTabActive('PERFIL') ? (
            <View className="mt-1 h-1 w-1 rounded-full bg-[#DE6B80]" />
          ) : (
            <View className="mt-1 h-1 w-1" />
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}