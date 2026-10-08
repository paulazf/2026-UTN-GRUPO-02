import React, { useEffect, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Pet } from '../types/pet';
import { fetchPets } from '../services/petService';
import PetCarouselCard from '../components/pet/PetCarouselCard';

interface DashboardScreenProps {
  onSelectPet: (petId: number) => void;
  onViewAllPets: () => void;
  onOpenCreatePet: () => void;
  refreshTrigger?: number;
}

export default function DashboardScreen({
  onSelectPet,
  onViewAllPets,
  onOpenCreatePet,
  refreshTrigger,
}: DashboardScreenProps) {
  const [pets, setPets] = useState<Pet[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadPets = async () => {
    try {
      const data = await fetchPets();
      setPets(data);
    } catch (err) {
      console.warn('Error loading dashboard pets:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPets();
  }, [refreshTrigger]);

  const onRefresh = () => {
    setRefreshing(true);
    loadPets();
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FAF6F3]">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-16"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#DE6B80" />
        }
      >
        {/* Espacio para integrar datos del usuario */}
        <View className="h-24 rounded-b-[40px] bg-[#E87A8E] shadow-sm justify-center px-6">
        </View>

        <View className="px-5 mt-6">
          {/* Sección mis mascotas */}
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-[#2B1D1D]">Mis mascotas</Text>
            <Pressable onPress={onViewAllPets} className="active:opacity-70">
              <Text className="text-xs font-semibold text-[#DE6B80]">Ver todas</Text>
            </Pressable>
          </View>

          {/* Carrusel de Mascotas */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row py-1">
            {pets.map((pet) => (
              <PetCarouselCard
                key={pet.id}
                pet={pet}
                onPress={() => onSelectPet(pet.id)}
              />
            ))}

            {/* Tarjeta para agregar mascota */}
            <Pressable
              onPress={onOpenCreatePet}
              className="w-32 items-center justify-center rounded-3xl border-2 border-dashed border-[#DE6B80] bg-[#FFF8F9] p-4 active:opacity-75"
            >
              <View className="mb-1 h-9 w-9 items-center justify-center rounded-full bg-[#FCECEF]">
                <Text className="text-lg font-bold text-[#DE6B80]">+</Text>
              </View>
              <Text className="text-center text-xs font-bold text-[#DE6B80]">Agregar</Text>
              <Text className="text-center text-[10px] text-[#8C7B77]">Nueva...</Text>
            </Pressable>
          </ScrollView>

          {/* Sección próximos eventos (aca se van a mostrar los eventos próximos en un futuro) */}
          <View className="mt-8">
            <Text className="text-lg font-bold text-[#2B1D1D]">Próximos eventos</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}