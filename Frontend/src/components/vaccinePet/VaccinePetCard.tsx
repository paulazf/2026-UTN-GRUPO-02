import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { STATUS_LABELS, VaccinePet, VaccinePetStatus, VaccineType } from '../../types/vaccinePet';
import { isoToDisplay } from '../../utils/dates';

interface VaccinePetCardProps {
  item: VaccinePet;
  onBooster: (item: VaccinePet) => void;
  onEdit: (item: VaccinePet) => void;
  onDelete: (item: VaccinePet) => void;
}

// Colores del mockup: Vigente verde, Por vencer naranja, Vencida rojo
const STATUS_STYLES: Record<VaccinePetStatus, { badgeBg: string; text: string; date: string }> = {
  VALID: { badgeBg: 'bg-[#E6F7EC]', text: 'text-[#2E7D32]', date: 'text-[#2B1D1D]' },
  EXPIRING: { badgeBg: 'bg-[#FFF3E0]', text: 'text-[#E65100]', date: 'text-[#E65100]' },
  EXPIRED: { badgeBg: 'bg-[#FDECEC]', text: 'text-[#C62828]', date: 'text-[#C62828]' },
  RENEWED: { badgeBg: 'bg-[#F0E4DF]', text: 'text-[#8C7B77]', date: 'text-[#8C7B77]' },
};

const ICONS: Record<VaccineType, 'needle' | 'eyedropper' | 'pill'> = {
  VACCINE: 'needle',
  EXTERNAL_ANTIPARASITIC: 'eyedropper',
  INTERNAL_ANTIPARASITIC: 'pill',
};

export default function VaccinePetCard({ item, onBooster, onEdit, onDelete }: VaccinePetCardProps) {
  const [expanded, setExpanded] = useState(false);
  const style = STATUS_STYLES[item.status];
  const isVaccine = item.vaccineType === 'VACCINE';

  return (
    <View
      className="mb-4 overflow-hidden rounded-3xl bg-white"
      style={{
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      }}
    >
      <Pressable onPress={() => setExpanded((v) => !v)} className="p-5 active:opacity-90">
        {/* Encabezado: ícono, nombre, laboratorio y badge */}
        <View className="flex-row items-start gap-3">
          <View className="h-11 w-11 items-center justify-center rounded-full bg-[#EFEAFB]">
            <MaterialCommunityIcons name={ICONS[item.vaccineType]} size={20} color="#7B61C9" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-[#2B1D1D]" numberOfLines={2}>
              {item.vaccineName}
            </Text>
            {!!item.laboratory && (
              <Text className="text-sm text-[#8C7B77]" numberOfLines={1}>
                {item.laboratory}
              </Text>
            )}
          </View>
          <View className={`rounded-full px-3 py-1 ${style.badgeBg}`}>
            <Text className={`text-xs font-bold ${style.text}`}>{STATUS_LABELS[item.status]}</Text>
          </View>
        </View>

        {/* Fila Dosis / Aplicada / Vence */}
        <View className="mt-4 flex-row border-t border-[#F0E4DF] pt-3">
          {isVaccine && (
            <View className="flex-1">
              <Text className="text-[11px] text-[#8C7B77]">Dosis</Text>
              <Text className="text-sm font-bold text-[#2B1D1D]">
                {item.doseNumber ? `${item.doseNumber}ª dosis` : '-'}
              </Text>
            </View>
          )}
          <View className="flex-1">
            <Text className="text-[11px] text-[#8C7B77]">Aplicada</Text>
            <Text className="text-sm font-bold text-[#2B1D1D]">{isoToDisplay(item.applicationDate)}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-[11px] text-[#8C7B77]">Vence</Text>
            <Text className={`text-sm font-bold ${style.date}`}>{isoToDisplay(item.expirationDate)}</Text>
          </View>
        </View>

        {!!item.notes && (
          <View className="mt-3 rounded-2xl border border-[#F0E4DF]/50 bg-[#FAF5F2] p-3">
            <Text className="text-xs leading-5 text-[#4A3B37]">{item.notes}</Text>
          </View>
        )}
      </Pressable>

      {/* Acciones (al tocar la tarjeta) */}
      {expanded && (
        <View className="flex-row gap-2 border-t border-[#F0E4DF] px-5 py-3">
          <ActionButton icon="refresh" label={isVaccine ? 'Refuerzo' : 'Nueva aplicación'} onPress={() => onBooster(item)} />
          <ActionButton icon="create-outline" label="Editar" onPress={() => onEdit(item)} />
          <ActionButton icon="trash-outline" label="Eliminar" onPress={() => onDelete(item)} danger />
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
  icon: 'refresh' | 'create-outline' | 'trash-outline';
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 flex-row items-center justify-center gap-1 rounded-full py-2 active:opacity-75 ${
        danger ? 'bg-[#FDECEC]' : 'bg-[#FCECEF]'
      }`}
    >
      <Ionicons name={icon} size={14} color={danger ? '#C62828' : '#D9627A'} />
      <Text className={`text-xs font-bold ${danger ? 'text-[#C62828]' : 'text-[#D9627A]'}`} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}
