import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Breed, PetSpecies } from '../../types/pet';
import { fetchBreeds } from '../../services/petService';

interface BreedPickerProps {
  species: PetSpecies;
  selectedBreedId: number | null;
  onSelectBreed: (breedId: number) => void;
}

export default function BreedPicker({
  species,
  selectedBreedId,
  onSelectBreed,
}: BreedPickerProps) {
  const [breeds, setBreeds] = useState<Breed[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const loadBreeds = async (sp: PetSpecies) => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchBreeds(sp);
      setBreeds(data);
      if (data.length > 0) {
        const defaultBreed =
          data.find((b) => b.name.toLowerCase().includes('mestizo')) || data[0];
        if (defaultBreed) {
          onSelectBreed(defaultBreed.id);
        }
      }
    } catch {
      setError('No se pudieron obtener las razas del servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBreeds(species);
  }, [species]);

  const normalize = (text: string) =>
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

  const selectedBreed = breeds.find((b) => b.id === selectedBreedId);
  const normalizedSearch = normalize(search);
  const filteredBreeds = breeds.filter((b) =>
    normalize(b.name).includes(normalizedSearch)
  );

  return (
    <View className="mb-4">
      <View className="mb-1.5 flex-row items-center justify-between">
        <Text className="text-xs font-bold tracking-wider text-[#8C7B77]">RAZA</Text>
        {breeds.length > 0 && (
          <Text className="text-[11px] text-[#A89B98]">
            {breeds.length} {species === 'DOG' ? 'razas de perro' : 'razas de gato'}
          </Text>
        )}
      </View>

      <Pressable
        onPress={() => setIsOpen(!isOpen)}
        className={`flex-row items-center justify-between rounded-2xl border px-4 py-3 active:opacity-80 ${
          isOpen ? 'border-[#DE6B80] bg-[#FFF8F9]' : 'border-[#F0E4DF] bg-[#FAF5F2]'
        }`}
      >
        <Text
          className={`text-base font-medium ${
            selectedBreed ? 'text-[#2B1D1D]' : 'text-[#B5A7A3]'
          }`}
        >
          {selectedBreed ? selectedBreed.name : 'Seleccionar raza...'}
        </Text>
        <Ionicons
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={18}
          color="#8C7B77"
        />
      </Pressable>

      {isOpen && (
        <View className="mt-2 rounded-2xl border border-[#F0E4DF] bg-[#FAF5F2] p-3 shadow-xs">
          <View className="mb-2.5 flex-row items-center rounded-xl border border-[#EFE6E2] bg-white px-3 py-2">
            <Ionicons name="search" size={16} color="#8C7B77" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar raza (ej. Labrador, Siamés)..."
              placeholderTextColor="#B5A7A3"
              className="ml-2 flex-1 text-sm text-[#2B1D1D]"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => {
                if (filteredBreeds.length > 0) {
                  onSelectBreed(filteredBreeds[0].id);
                  setIsOpen(false);
                  setSearch('');
                }
              }}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={16} color="#8C7B77" />
              </Pressable>
            )}
          </View>

          {loading ? (
            <View className="py-4 items-center">
              <ActivityIndicator color="#DE6B80" />
              <Text className="mt-2 text-xs text-[#8C7B77]">Cargando razas...</Text>
            </View>
          ) : error ? (
            <View className="py-3 items-center">
              <Text className="text-center text-xs text-red-500 mb-2">{error}</Text>
              <Pressable
                onPress={() => loadBreeds(species)}
                className="rounded-xl bg-[#FCECEF] px-4 py-2 active:opacity-80"
              >
                <Text className="text-xs font-bold text-[#DE6B80]">Reintentar cargar razas</Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView
              nestedScrollEnabled={true}
              style={{ maxHeight: 200 }}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="always"
            >
              {filteredBreeds.length === 0 ? (
                <View className="py-4 items-center">
                  <Text className="text-center text-xs text-[#8C7B77]">
                    No se encontraron razas que coincidan con "{search}"
                  </Text>
                </View>
              ) : (
                filteredBreeds.map((breed) => {
                  const isSelected = selectedBreedId === breed.id;
                  return (
                    <Pressable
                      key={breed.id}
                      onPress={() => {
                        onSelectBreed(breed.id);
                        setIsOpen(false);
                        setSearch('');
                      }}
                      className={`flex-row items-center justify-between rounded-xl px-3 py-2.5 active:bg-[#FCECEF] ${
                        isSelected ? 'bg-[#FCECEF]' : ''
                      }`}
                    >
                      <Text
                        className={`text-sm ${
                          isSelected ? 'font-bold text-[#DE6B80]' : 'text-[#2B1D1D]'
                        }`}
                      >
                        {breed.name}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark" size={16} color="#DE6B80" />
                      )}
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
}

