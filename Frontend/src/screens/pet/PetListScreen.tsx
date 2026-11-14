import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pet } from '../../types/pet';
import { fetchPets } from '../../services/petService';
import PetCard from '../../components/pet/PetCard';
import { brand } from '../../theme/brand';

interface PetListScreenProps {
  onSelectPet: (petId: number) => void;
  onOpenCreatePet: () => void;
  refreshTrigger?: number;
}

export default function PetListScreen({
  onSelectPet,
  onOpenCreatePet,
  refreshTrigger,
}: PetListScreenProps) {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPets = async () => {
    try {
      const data = await fetchPets();
      setPets(data);
    } catch (err) {
      console.warn('Error loading pets:', err);
    } finally {
      setLoading(false);
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
        contentContainerClassName="px-5 pt-8 pb-16"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brand.accent} />
        }
      >
        <View className="mb-6">
          <Text className="text-3xl font-bold tracking-tight text-[#2B1D1D]">Mis mascotas</Text>
          <Text className="mt-1 text-sm font-medium text-[#8C7B77]">
            {pets.length === 1 ? '1 registrada' : `${pets.length} registradas`}
          </Text>
        </View>

        {loading && !refreshing ? (
          <View className="py-20 items-center justify-center">
            <ActivityIndicator size="large" color={brand.accent} />
            <Text className="mt-3 text-sm text-[#8C7B77]">Cargando mascotas...</Text>
          </View>
        ) : (
          <View className="gap-5">
            {pets.map((pet) => (
              <PetCard
                key={pet.id}
                pet={pet}
                onPress={() => onSelectPet(pet.id)}
              />
            ))}

            {/* Botón "+ Agregar mascota" */}
            <Pressable
              onPress={onOpenCreatePet}
              className="mt-2 items-center justify-center rounded-3xl border-2 border-dashed border-brand bg-brand-soft py-5 active:opacity-75"
            >
              <Text className="text-base font-bold text-brand">+ Agregar mascota</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}