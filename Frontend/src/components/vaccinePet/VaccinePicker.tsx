import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PetSpecies } from '../../types/pet';
import { Vaccine, VaccineType } from '../../types/vaccinePet';
import { fetchVaccines } from '../../services/vaccinePetService';

interface VaccinePickerProps {
  species: PetSpecies;
  selectedVaccineId: number | null;
  onSelectVaccine: (vaccine: Vaccine) => void;
  disabled?: boolean;
  /** Nombre a mostrar cuando el producto está fijo (edición o refuerzo) */
  lockedLabel?: { name: string; laboratory: string };
}

const GROUPS: { type: VaccineType; label: string }[] = [
  { type: 'VACCINE', label: 'VACUNAS' },
  { type: 'EXTERNAL_ANTIPARASITIC', label: 'ANTIPARASITARIOS EXTERNOS' },
  { type: 'INTERNAL_ANTIPARASITIC', label: 'ANTIPARASITARIOS INTERNOS' },
];

const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();

export default function VaccinePicker({
  species,
  selectedVaccineId,
  onSelectVaccine,
  disabled = false,
  lockedLabel,
}: VaccinePickerProps) {
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const loadCatalog = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      setVaccines(await fetchVaccines(species));
    } catch {
      setLoadError('No se pudo cargar el catálogo de vacunas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!disabled) loadCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [species, disabled]);

  const selected = vaccines.find((v) => v.idVaccine === selectedVaccineId) ?? lockedLabel;
  const term = normalize(search);
  const filtered = vaccines.filter(
    (v) => normalize(v.name).includes(term) || normalize(v.laboratory).includes(term)
  );

  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-xs font-bold tracking-wider text-[#8C7B77]">
        VACUNA O ANTIPARASITARIO
      </Text>

      <Pressable
        onPress={() => !disabled && setIsOpen(!isOpen)}
        className={`flex-row items-center justify-between rounded-2xl border px-4 py-3 ${
          disabled
            ? 'border-[#F0E4DF] bg-[#F3EEEB]'
            : isOpen
              ? 'border-[#DE6B80] bg-[#FFF8F9] active:opacity-80'
              : 'border-[#F0E4DF] bg-[#FAF5F2] active:opacity-80'
        }`}
      >
        <View className="flex-1 pr-2">
          <Text
            className={`text-base font-medium ${selected ? 'text-[#2B1D1D]' : 'text-[#B5A7A3]'}`}
            numberOfLines={1}
          >
            {selected ? selected.name : 'Seleccionar del catálogo...'}
          </Text>
          {!!selected?.laboratory && (
            <Text className="text-xs text-[#8C7B77]" numberOfLines={1}>
              {selected.laboratory}
            </Text>
          )}
        </View>
        {!disabled && (
          <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#8C7B77" />
        )}
      </Pressable>

      {isOpen && !disabled && (
        <View className="mt-2 rounded-2xl border border-[#F0E4DF] bg-[#FAF5F2] p-3 shadow-xs">
          <View className="mb-2.5 flex-row items-center rounded-xl border border-[#EFE6E2] bg-white px-3 py-2">
            <Ionicons name="search" size={16} color="#8C7B77" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar (ej. Triple, Frontline, Nobivac)..."
              placeholderTextColor="#B5A7A3"
              className="ml-2 flex-1 text-sm text-[#2B1D1D]"
              autoFocus
              returnKeyType="done"
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={16} color="#8C7B77" />
              </Pressable>
            )}
          </View>

          {loading ? (
            <View className="items-center py-4">
              <ActivityIndicator color="#DE6B80" />
              <Text className="mt-2 text-xs text-[#8C7B77]">Cargando catálogo...</Text>
            </View>
          ) : loadError ? (
            <View className="items-center py-3">
              <Text className="mb-2 text-center text-xs text-red-500">{loadError}</Text>
              <Pressable onPress={loadCatalog} className="rounded-xl bg-[#FCECEF] px-4 py-2 active:opacity-80">
                <Text className="text-xs font-bold text-[#DE6B80]">Reintentar</Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView
              nestedScrollEnabled
              style={{ maxHeight: 240 }}
              keyboardShouldPersistTaps="always"
            >
              {filtered.length === 0 ? (
                <Text className="py-4 text-center text-xs text-[#8C7B77]">
                  No se encontraron productos con "{search}"
                </Text>
              ) : (
                GROUPS.map((group) => {
                  const items = filtered.filter((v) => v.type === group.type);
                  if (items.length === 0) return null;
                  return (
                    <View key={group.type} className="mb-1">
                      <Text className="px-3 pb-1 pt-2 text-[10px] font-bold tracking-wider text-[#B5A7A3]">
                        {group.label}
                      </Text>
                      {items.map((vaccine) => {
                        const isSelected = vaccine.idVaccine === selectedVaccineId;
                        return (
                          <Pressable
                            key={vaccine.idVaccine}
                            onPress={() => {
                              onSelectVaccine(vaccine);
                              setIsOpen(false);
                              setSearch('');
                            }}
                            className={`flex-row items-center justify-between rounded-xl px-3 py-2.5 active:bg-[#FCECEF] ${
                              isSelected ? 'bg-[#FCECEF]' : ''
                            }`}
                          >
                            <View className="flex-1 pr-2">
                              <Text
                                className={`text-sm ${
                                  isSelected ? 'font-bold text-[#DE6B80]' : 'text-[#2B1D1D]'
                                }`}
                              >
                                {vaccine.name}
                              </Text>
                              {!!vaccine.laboratory && (
                                <Text className="text-xs text-[#8C7B77]" numberOfLines={1}>
                                  {vaccine.laboratory}
                                </Text>
                              )}
                            </View>
                            {isSelected && <Ionicons name="checkmark" size={16} color="#DE6B80" />}
                          </Pressable>
                        );
                      })}
                    </View>
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
