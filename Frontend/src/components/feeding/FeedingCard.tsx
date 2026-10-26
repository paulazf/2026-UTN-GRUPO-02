import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Feeding, FEEDING_TYPE_LABELS } from '../../types/feeding';
import { isoToDisplay } from '../../utils/dates';

interface FeedingCardProps {
  feeding: Feeding;
  isCurrent: boolean;
  onEdit: (feeding: Feeding) => void;
  onDelete: (feeding: Feeding) => void;
}

export default function FeedingCard({ feeding, isCurrent, onEdit, onDelete }: FeedingCardProps) {
  const [expanded, setExpanded] = useState(false);
  const mealsLabel = /^\d+$/.test(feeding.frequency.trim())
    ? `${feeding.frequency} ${feeding.frequency === '1' ? 'comida' : 'comidas'} al día`
    : feeding.frequency;

  return (
    <View
      className="mb-3 overflow-hidden rounded-3xl bg-white p-4"
      style={{
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      }}
    >
      <Pressable
        onPress={() => setExpanded((value) => !value)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        className="active:opacity-90"
      >
        <View className="flex-row items-start justify-between gap-2">
          <Text className="flex-1 text-sm font-extrabold text-[#3D2020]" numberOfLines={2}>
            {feeding.food}
          </Text>
          <View className="flex-row items-center gap-1.5">
            {isCurrent && (
              <View className="rounded-full bg-[#E8F7F1] px-2.5 py-1">
                <Text className="text-[10px] font-bold text-[#1A7A50]">Actual</Text>
              </View>
            )}
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color="#A07878" />
          </View>
        </View>

        <Text className="mt-1 text-xs font-medium text-[#A07878]">
          {FEEDING_TYPE_LABELS[feeding.type] ?? feeding.typeDisplay} · Desde{' '}
          {isoToDisplay(feeding.sinceDate)}
        </Text>

        <View className="mt-3 flex-row gap-2">
          <InfoBlock label="Porción diaria" value={feeding.portion || 'Sin especificar'} tone="peach" />
          <InfoBlock label="Frecuencia" value={mealsLabel || 'Sin especificar'} tone="lilac" />
        </View>

        {!!feeding.notes?.trim() && (
          <View className="mt-2 rounded-2xl bg-[#FDF5F0] px-3 py-2.5">
            <Text className="text-[10px] font-bold text-[#A07878]">Notas y restricciones</Text>
            <Text className="mt-1 text-xs leading-5 text-[#6C5551]">{feeding.notes}</Text>
          </View>
        )}
      </Pressable>

      {expanded && (
        <View className="mt-3 flex-row gap-2 border-t border-[#F0DDD5] pt-3">
          <ActionButton icon="create-outline" label="Editar" onPress={() => onEdit(feeding)} />
          <ActionButton
            icon="trash-outline"
            label="Eliminar"
            onPress={() => onDelete(feeding)}
            danger
          />
        </View>
      )}
    </View>
  );
}

function InfoBlock({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'peach' | 'lilac';
}) {
  return (
    <View className={`flex-1 rounded-2xl px-3 py-2 ${tone === 'peach' ? 'bg-[#FFF0E3]' : 'bg-[#F5EFF8]'}`}>
      <Text className="text-[10px] font-medium text-[#A07878]">{label}</Text>
      <Text className="mt-0.5 text-xs font-extrabold text-[#3D2020]" numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
  danger = false,
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
      <Text className={`text-xs font-bold ${danger ? 'text-[#B92020]' : 'text-[#D9627A]'}`}>
        {label}
      </Text>
    </Pressable>
  );
}
