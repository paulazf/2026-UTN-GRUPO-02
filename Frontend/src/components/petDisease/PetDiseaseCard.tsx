import React from 'react';
import { Text, View } from 'react-native';
import { PetDisease } from '../../types/petDisease';
import { isoToDisplay } from '../../utils/dates';

interface PetDiseaseCardProps {
  disease: PetDisease;
}

export default function PetDiseaseCard({ disease }: PetDiseaseCardProps) {
  const isEnSeguimiento = !disease.endDate;

  // Formato de fechas: si es en seguimiento solo startDate, si tiene endDate: "startDate - endDate"
  const formattedDates = isEnSeguimiento
    ? isoToDisplay(disease.startDate)
    : `${isoToDisplay(disease.startDate)} - ${isoToDisplay(disease.endDate!)}`;

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
          {disease.diseaseName}
        </Text>

        <View
          className={`rounded-full px-3 py-1 ${
            isEnSeguimiento ? 'bg-[#FCECEF]' : 'bg-[#E6F7EC]'
          }`}
        >
          <Text
            className={`text-xs font-bold ${
              isEnSeguimiento ? 'text-[#B8324E]' : 'text-[#2E7D32]'
            }`}
          >
            {isEnSeguimiento ? 'En seguimiento' : 'Controlado'}
          </Text>
        </View>
      </View>

      {/* Fechas */}
      <Text className="mt-1.5 text-xs font-medium text-[#8C7B77]">
        {formattedDates}
      </Text>

      {/* Bloque de Notas u Observaciones */}
      {!!disease.notes && disease.notes.trim().length > 0 && (
        <View className="mt-3 rounded-2xl bg-[#FAF5F2] p-3.5 border border-[#F0E4DF]/50">
          <Text className="text-xs font-normal leading-5 text-[#4A3B37]">
            {disease.notes}
          </Text>
        </View>
      )}
    </View>
  );
}

