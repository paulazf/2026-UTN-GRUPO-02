import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Pet } from '../../types/pet';

interface PetCarouselCardProps {
  pet: Pet;
  onPress: () => void;
}

export default function PetCarouselCard({ pet, onPress }: PetCarouselCardProps) {
  return (
    <Pressable
      onPress={onPress}
      className="mr-3 w-36 overflow-hidden rounded-3xl border border-[#F0E4DF] bg-white p-3 shadow-xs active:scale-95"
    >
      {pet.photo ? (
        <Image
          source={{ uri: pet.photo }}
          className="h-24 w-full rounded-2xl bg-[#EFE6E2]"
          resizeMode="cover"
        />
      ) : (
        <View className="h-24 w-full items-center justify-center rounded-2xl bg-[#FCECEF]">
          <Ionicons name="paw" size={32} color="#DE6B80" style={{ opacity: 0.6 }} />
        </View>
      )}
      <Text className="mt-2.5 text-base font-bold text-[#2B1D1D]" numberOfLines={1}>
        {pet.name}
      </Text>
      <Text className="text-xs text-[#8C7B77]" numberOfLines={1}>
        {pet.breed.name} · {pet.age} {pet.age === 1 ? 'año' : 'años'}
      </Text>
    </Pressable>
  );
}