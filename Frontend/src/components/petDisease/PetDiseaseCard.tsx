import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PetDisease } from '../../types/petDisease';
import { isoToDisplay } from '../../utils/dates';

interface PetDiseaseCardProps {
  disease: PetDisease;
  onEdit?: (disease: PetDisease) => void;
  onDelete?: (disease: PetDisease) => void;
}

export default function PetDiseaseCard({ disease, onEdit, onDelete }: PetDiseaseCardProps) {
  const [expanded, setExpanded] = useState(false);
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
      <Pressable onPress={() => setExpanded((v) => !v)} className="active:opacity-90">
        {/* Fila superior: Título a la izquierda, Badge y Chevron a la derecha */}
        <View className="flex-row items-start justify-between gap-2">
          <Text
            className="flex-1 text-base font-bold text-[#2B1D1D]"
            numberOfLines={2}
          >
            {disease.diseaseName}
          </Text>

          <View className="flex-row items-center gap-1.5 shrink-0">
            <View
              className={`rounded-full px-2.5 py-1 ${
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
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color="#8C7B77" />
          </View>
        </View>

        {/* Fechas */}
        <Text className="mt-2 text-xs font-medium text-[#8C7B77]">
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
      </Pressable>

      {/* Botones de acción desplegables (al tocar la tarjeta) */}
      {expanded && (onEdit || onDelete) && (
        <View className="mt-3 flex-row gap-2 border-t border-[#F0E4DF] pt-3">
          {onEdit && (
            <ActionButton
              icon="create-outline"
              label="Editar"
              onPress={() => onEdit(disease)}
            />
          )}
          {onDelete && (
            <ActionButton
              icon="trash-outline"
              label="Eliminar"
              onPress={() => onDelete(disease)}
              danger
            />
          )}
        </View>
      )}
    </View>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: 'create-outline' | 'trash-outline';
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-[20px] p-2 active:opacity-75 ${
        danger ? 'bg-[#FCEAEA]' : 'bg-[#FDF5F0]'
      }`}
    >
      <Ionicons name={icon} size={14} color={danger ? '#B92020' : '#D9627A'} />
      <Text
        className={`text-xs font-bold ${danger ? 'text-[#B92020]' : 'text-[#D9627A]'}`}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}
