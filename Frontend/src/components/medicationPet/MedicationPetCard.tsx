import { Text, View } from 'react-native';
import { MedicationPet } from '../../types/medicationPet';
import { isoToDisplay } from '../../utils/dates';

interface MedicationPetCardProps {
  medication: MedicationPet;
}

export default function MedicationPetCard({ medication }: MedicationPetCardProps) {
  const isEnTratamiento = !medication.endDate;
  const formattedStartDate = isoToDisplay(medication.startDate);
  const formattedEndDate = medication.endDate ? isoToDisplay(medication.endDate) : null;
  const formattedDates = isEnTratamiento
    ? `Desde el ${formattedStartDate}`
    : `${formattedStartDate} - ${formattedEndDate}`;

  const doseLabel = `${medication.quantityDose} ${
    medication.quantityDose === 1 ? 'toma' : 'tomas'
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
      {/* Fila superior: Título y Badge de Estado */}
      <View className="flex-row items-start justify-between gap-3">
        <Text
          className="flex-1 text-base font-bold text-[#2B1D1D]"
          numberOfLines={2}
        >
          {medication.medicationName}
        </Text>

        <View
          className={`rounded-full px-3 py-1 ${
            isEnTratamiento ? 'bg-[#FCECEF]' : 'bg-[#E6F7EC]'
          }`}
        >
          <Text
            className={`text-xs font-bold ${
              isEnTratamiento ? 'text-[#B8324E]' : 'text-[#2E7D32]'
            }`}
          >
            {isEnTratamiento ? 'En tratamiento' : 'Finalizado'}
          </Text>
        </View>
      </View>

      {/* Frecuencia y Dosis */}
      <View className="mt-2 flex-row flex-wrap items-center gap-2">
        <View className="rounded-full bg-[#FAF5F2] px-2.5 py-0.5 border border-[#F0E4DF]">
          <Text className="text-[11px] font-semibold text-[#8C7B77]">
            Cada {medication.frequencyHours} hs
          </Text>
        </View>
        <View className="rounded-full bg-[#FAF5F2] px-2.5 py-0.5 border border-[#F0E4DF]">
          <Text className="text-[11px] font-semibold text-[#8C7B77]">
            {doseLabel}
          </Text>
        </View>
      </View>

      {/* Fechas */}
      <Text className="mt-2 text-xs font-medium text-[#8C7B77]">
        {formattedDates}
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