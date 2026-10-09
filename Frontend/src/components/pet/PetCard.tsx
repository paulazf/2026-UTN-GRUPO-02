import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Pet } from '../../types/pet';

interface PetCardProps {
  pet: Pet;
  onPress: () => void;
}

export default function PetCard({ pet, onPress }: PetCardProps) {
  return (
    <Pressable
      onPress={onPress}
      className="overflow-hidden rounded-3xl border border-[#F0E4DF] bg-white shadow-xs active:scale-[0.99]"
    >
      <View className="relative h-48 w-full bg-[#FAF5F2]">
        {pet.photo ? (
          <>
            <Image source={{ uri: pet.photo }} className="h-full w-full" resizeMode="cover" />

            <View className="absolute inset-0 justify-between bg-black/25 p-4">
              <View className="flex-row justify-end gap-2">
                {pet.neutered && (
                  <View className="rounded-full bg-white/90 px-3 py-1 shadow-sm backdrop-blur-md">
                    <Text className="text-xs font-semibold text-[#2B1D1D]">Castrado/a</Text>
                  </View>
                )}
                <View className="rounded-full bg-white/90 px-3 py-1 shadow-sm backdrop-blur-md">
                  <Text className="text-xs font-semibold text-[#2B1D1D]">{pet.weight} kg</Text>
                </View>
              </View>

              {/* Nombre, Raza y Edad */}
              <View>
                <Text className="text-2xl font-bold text-white shadow-sm">{pet.name}</Text>
                <Text className="text-sm font-medium text-white/95 shadow-sm">
                  {pet.breed.name} · {pet.age} {pet.age === 1 ? 'año' : 'años'}
                </Text>
              </View>
            </View>
          </>
        ) : (
          <View className="h-full w-full justify-between bg-[#FCECEF] p-4">
            <View className="flex-row items-center justify-between">
              <View className="h-9 w-9 items-center justify-center rounded-2xl bg-white shadow-xs">
                <Ionicons name="paw" size={18} color="#DE6B80" />
              </View>
              <View className="flex-row gap-2">
                {pet.neutered && (
                  <View className="rounded-full bg-white px-3 py-1 shadow-xs">
                    <Text className="text-xs font-semibold text-[#2B1D1D]">Castrado/a</Text>
                  </View>
                )}
                <View className="rounded-full bg-white px-3 py-1 shadow-xs">
                  <Text className="text-xs font-semibold text-[#2B1D1D]">{pet.weight} kg</Text>
                </View>
              </View>
            </View>

            <View className="items-center justify-center">
              <Ionicons name="paw-outline" size={44} color="#DE6B80" style={{ opacity: 0.25 }} />
            </View>

            {/* Nombre, Raza y Edad */}
            <View>
              <Text className="text-2xl font-bold text-[#2B1D1D]">{pet.name}</Text>
              <Text className="text-sm font-medium text-[#8C7B77]">
                {pet.breed.name} · {pet.age} {pet.age === 1 ? 'año' : 'años'}
              </Text>
            </View>
          </View>
        )}
      </View>
    </Pressable>
  );
}