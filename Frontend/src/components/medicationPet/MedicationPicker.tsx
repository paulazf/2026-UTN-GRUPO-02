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
import { Medication } from '../../types/medicationPet';
import { fetchMedications } from '../../services/medicationPetService';

interface MedicationPickerProps {
  selectedMedicationId: number | null;
  onSelectMedication: (medication: Medication) => void;
}

export default function MedicationPicker({
  selectedMedicationId,
  onSelectMedication,
}: MedicationPickerProps) {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const loadCatalog = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const data = await fetchMedications();
      setMedications(data);
    } catch {
      setLoadError('No se pudo cargar el catálogo de medicamentos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  const normalize = (text: string) =>
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

  const selectedMedication = medications.find((m) => m.idMedication === selectedMedicationId);
  const normalizedSearch = normalize(search);
  const filteredMedications = medications.filter((m) =>
    normalize(m.name).includes(normalizedSearch) ||
    (m.description ? normalize(m.description).includes(normalizedSearch) : false)
  );

  const formatMedicationLabel = (med: Medication) => {
    const doseNum = parseFloat(String(med.dose));
    if (doseNum > 0) {
      return `${med.name} (${doseNum} mg)`;
    }
    return med.name;
  };

  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-xs font-bold tracking-wider text-[#8C7B77]">
        MEDICAMENTO
      </Text>

      <Pressable
        onPress={() => setIsOpen(!isOpen)}
        className={`flex-row items-center justify-between rounded-2xl border px-4 py-3 active:opacity-80 ${
          isOpen
            ? 'border-[#DE6B80] bg-[#FFF8F9]'
            : 'border-[#F0E4DF] bg-[#FAF5F2]'
        }`}
      >
        <Text
          className={`text-base font-medium ${
            selectedMedication ? 'text-[#2B1D1D]' : 'text-[#B5A7A3]'
          }`}
          numberOfLines={1}
        >
          {selectedMedication ? formatMedicationLabel(selectedMedication) : 'Seleccionar medicamento...'}
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
              placeholder="Buscar medicamento (ej. Amoxicilina, Meloxicam)..."
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
            <View className="py-4 items-center">
              <ActivityIndicator color="#DE6B80" />
              <Text className="mt-2 text-xs text-[#8C7B77]">Cargando catálogo...</Text>
            </View>
          ) : loadError ? (
            <View className="py-3 items-center">
              <Text className="text-center text-xs text-red-500 mb-2">{loadError}</Text>
              <Pressable
                onPress={loadCatalog}
                className="rounded-xl bg-[#FCECEF] px-4 py-2 active:opacity-80"
              >
                <Text className="text-xs font-bold text-[#DE6B80]">Reintentar</Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView
              nestedScrollEnabled={true}
              style={{ maxHeight: 200 }}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="always"
            >
              {filteredMedications.length === 0 ? (
                <View className="py-4 items-center">
                  <Text className="text-center text-xs text-[#8C7B77]">
                    No se encontraron medicamentos con "{search}"
                  </Text>
                </View>
              ) : (
                filteredMedications.map((medication) => {
                  const isSelected = selectedMedicationId === medication.idMedication;
                  return (
                    <Pressable
                      key={medication.idMedication}
                      onPress={() => {
                        onSelectMedication(medication);
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
                          {formatMedicationLabel(medication)}
                        </Text>
                        {!!medication.description && (
                          <Text className="text-xs text-[#8C7B77]" numberOfLines={1}>
                            {medication.description}
                          </Text>
                        )}
                      </View>
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