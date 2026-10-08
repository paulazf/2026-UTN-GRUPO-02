import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Pet } from '../../types/pet';
import { fetchPetById } from '../../services/petService';

interface PetDetailScreenProps {
  petId: number;
  onBack: () => void;
}

export default function PetDetailScreen({ petId, onBack }: PetDetailScreenProps) {
  const [pet, setPet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDetail() {
      try {
        setLoading(true);
        const data = await fetchPetById(petId);
        setPet(data);
      } catch (err) {
        console.warn('Error loading pet details:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDetail();
  }, [petId]);

  if (loading || !pet) {
    return (
      <SafeAreaView className="flex-1 bg-[#FAF6F3] items-center justify-center">
        <ActivityIndicator size="large" color="#DE6B80" />
        <Text className="mt-3 text-sm text-[#8C7B77]">Cargando datos de la mascota...</Text>
      </SafeAreaView>
    );
  }

  const formattedBirthDate = pet.birthDate
    ? pet.birthDate.split('-').reverse().join('/')
    : 'No registrada';

  const speciesLabel = pet.breed.species === 'CAT' ? 'Gata' : 'Perro';

  return (
    <SafeAreaView className="flex-1 bg-[#FAF6F3]">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-16">
        <View className="rounded-b-[40px] bg-[#FCECEF] px-5 pt-4 pb-6 shadow-sm">
          <Pressable
            onPress={onBack}
            className="mb-4 h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm active:opacity-70"
          >
            <Text className="text-lg font-bold text-[#2B1D1D]">←</Text>
          </Pressable>

          <View className="flex-row items-center gap-4">
            {pet.photo ? (
              <Image
                source={{ uri: pet.photo }}
                className="h-24 w-24 rounded-3xl bg-[#EFE6E2]"
                resizeMode="cover"
              />
            ) : (
              <View className="h-24 w-24 items-center justify-center rounded-3xl border border-[#F0E4DF] bg-white shadow-xs">
                <Ionicons name="paw" size={32} color="#DE6B80" />
                <Text className="mt-1 text-[10px] font-semibold text-[#8C7B77]">Sin foto</Text>
              </View>
            )}

            <View className="flex-1 justify-center">
              <Text className="text-3xl font-bold tracking-tight text-[#2B1D1D]">{pet.name}</Text>
              <Text className="text-base font-medium text-[#8C7B77]">{pet.breed.name}</Text>

              <View className="mt-2 flex-row flex-wrap gap-2">
                <View
                  className={`rounded-full px-3 py-1 ${
                    pet.neutered ? 'bg-[#E6F7EC]' : 'bg-[#F0E4DF]'
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      pet.neutered ? 'text-[#2E7D32]' : 'text-[#8C7B77]'
                    }`}
                  >
                    {pet.neutered ? 'Castrado/a' : 'Sin castrar'}
                  </Text>
                </View>
                <View className="rounded-full bg-[#FFF3E0] px-3 py-1">
                  <Text className="text-xs font-semibold text-[#E65100]">{speciesLabel}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Bloques de Métricas Pet */}
          <View className="mt-6 flex-row gap-3">
            <View className="flex-1 items-center rounded-2xl bg-white/80 py-3 shadow-xs">
              <Text className="text-base font-bold text-[#2B1D1D]">
                {pet.age} {pet.age === 1 ? 'año' : 'años'}
              </Text>
              <Text className="mt-0.5 text-xs text-[#8C7B77]">Edad</Text>
            </View>

            <View className="flex-1 items-center rounded-2xl bg-white/80 py-3 shadow-xs">
              <Text className="text-base font-bold text-[#2B1D1D]">{pet.weight} kg</Text>
              <Text className="mt-0.5 text-xs text-[#8C7B77]">Peso</Text>
            </View>

            <View className="flex-1 items-center rounded-2xl bg-white/80 py-3 shadow-xs">
              <Text className="text-sm font-bold text-[#2B1D1D]">{formattedBirthDate}</Text>
              <Text className="mt-0.5 text-xs text-[#8C7B77]">Nacimiento</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}