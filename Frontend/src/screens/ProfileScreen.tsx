import React from 'react';
import { SafeAreaView, ScrollView, Text, View } from 'react-native';

export default function ProfileScreen() {
  return (
    <SafeAreaView className="flex-1 bg-[#FAF6F3]">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-16">
        {/* Tapa Rosa Superior con Esquinas Redondeadas */}
        <View className="rounded-b-[40px] bg-[#E87A8E] px-6 pt-6 pb-10 shadow-sm items-center">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-white/25 shadow-sm">
            <Text className="text-4xl">👤</Text>
          </View>
          <Text className="mt-3 text-2xl font-bold text-white">Mi Perfil</Text>
        </View>

        {/* Contenido Limpio */}
        <View className="px-5 mt-6">
          <View className="rounded-3xl border border-[#F0E4DF] bg-white p-6 items-center justify-center shadow-xs">
            <Text className="text-3xl mb-2">👤</Text>
            <Text className="text-base font-bold text-[#2B1D1D]">Módulo de Perfil</Text>
            <Text className="text-xs text-[#8C7B77] mt-1 text-center leading-5">
              Aquí figurarán los datos del tutor una vez integrado el módulo de Owner / Usuario.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}