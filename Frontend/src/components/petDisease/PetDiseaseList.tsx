import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PetDisease } from '../../types/petDisease';
import { fetchPetDiseases } from '../../services/petDiseaseService';
import PetDiseaseCard from './PetDiseaseCard';
import CreatePetDiseaseModal from './CreatePetDiseaseModal';

interface PetDiseaseListProps {
  petId: number;
}

export default function PetDiseaseList({ petId }: PetDiseaseListProps) {
  const [diseases, setDiseases] = useState<PetDisease[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadDiseases = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchPetDiseases(petId);
      setDiseases(data);
    } catch (err: any) {
      setError(err?.message || 'No se pudieron cargar las condiciones de la mascota.');
    } finally {
      setLoading(false);
    }
  }, [petId]);

  useEffect(() => {
    loadDiseases();
  }, [loadDiseases]);

  const handleCreated = (newDisease: PetDisease) => {
    // Inserta al principio de la lista
    setDiseases((prev) => [newDisease, ...prev]);
  };

  const countText = `${diseases.length} ${
    diseases.length === 1 ? 'condición' : 'condiciones'
  }`;

  return (
    <View className="flex-1">
      {/* Cabecera de la sección: Contador y Botón "+ Agregar" */}
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-base font-bold text-[#2B1D1D]">
          {countText}
        </Text>

        <Pressable
          onPress={() => setIsModalOpen(true)}
          className="rounded-full bg-[#D9627A] px-4 py-2 shadow-xs active:opacity-85"
        >
          <Text className="text-xs font-bold text-white">+ Agregar</Text>
        </Pressable>
      </View>

      {/* Contenido: Loading, Error, Vacío o Lista de Tarjetas */}
      {loading ? (
        <View className="items-center py-12">
          <ActivityIndicator size="large" color="#DE6B80" />
          <Text className="mt-3 text-xs text-[#8C7B77]">
            Cargando condiciones...
          </Text>
        </View>
      ) : error ? (
        <View className="items-center rounded-2xl bg-red-50 p-6 border border-red-200">
          <Text className="text-center text-sm font-semibold text-red-600 mb-3">
            {error}
          </Text>
          <Pressable
            onPress={loadDiseases}
            className="rounded-xl bg-[#FCECEF] px-4 py-2 active:opacity-80"
          >
            <Text className="text-xs font-bold text-[#DE6B80]">Reintentar</Text>
          </Pressable>
        </View>
      ) : diseases.length === 0 ? (
        <Pressable
          onPress={() => setIsModalOpen(true)}
          className="items-center rounded-3xl border-2 border-dashed border-[#D9627A] bg-[#FDF0F3] p-8 active:opacity-75"
        >
          <Ionicons name="bandage-outline" size={28} color="#D9627A" />
          <Text className="mt-2 text-sm font-extrabold text-[#D9627A]">
            Todavía no hay condiciones
          </Text>
          <Text className="mt-1 text-center text-xs font-medium text-[#A07878]">
            Tocá acá para agregar la primera.
          </Text>
        </Pressable>
      ) : (
        diseases.map((item) => (
          <PetDiseaseCard key={item.id} disease={item} />
        ))
      )}

      {/* Modal para agregar condición */}
      <CreatePetDiseaseModal
        visible={isModalOpen}
        petId={petId}
        onClose={() => setIsModalOpen(false)}
        onCreated={handleCreated}
      />
    </View>
  );
}

