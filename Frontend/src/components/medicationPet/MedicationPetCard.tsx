import { Text, View } from 'react-native';
import { MedicationPet } from '../../types/medicationPet';
import { isoToDisplay } from '../../utils/dates';

interface MedicationPetCardProps {
  medication: MedicationPet;
}

export default function MedicationPetCard({ medication }: MedicationPetCardProps) {
  const formattedStartDate = isoToDisplay(medication.startDate);
  const doseLabel = `${medication.quantityDose} ${
    medication.quantityDose === 1 ? 'unidad' : 'unidades'
  }`;

  return (
    <View
      className="mb-4 overflow-hidden rounded-3xl bg-white p-5"
      style={{
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      }}
    >
      {/* Fila superior: Título y Frecuencia */}
      <View className="flex-row items-start justify-between gap-3">
        <Text
          className="flex-1 text-base font-bold text-[#2B1D1D]"
          numberOfLines={2}
        >
          {medication.medicationName}
        </Text>

        <View className="rounded-full bg-[#FCECEF] px-3 py-1">
          <Text className="text-xs font-bold text-[#B8324E]">
            Cada {medication.frequencyHours} hs
          </Text>
        </View>
      </View>

      {/* Dosis y Fecha de Inicio */}
      <Text className="mt-1.5 text-xs font-medium text-[#8C7B77]">
        {doseLabel} · Desde el {formattedStartDate}
      </Text>

      {/* Bloque de Notas u Observaciones */}
      {!!medication.notes && medication.notes.trim().length > 0 && (
        <View className="mt-3 rounded-2xl bg-[#FAF5F2] p-3.5 border border-[#F0E4DF]/50">
          <Text className="text-xs font-normal leading-5 text-[#4A3B37]">
            {medication.notes}
          </Text>
        </View>
      )}
    </View>
  );
}