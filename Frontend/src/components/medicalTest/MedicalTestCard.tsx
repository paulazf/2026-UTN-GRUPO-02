import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MedicalTest, MedicalTestStatus, MedicalTestType, STATUS_LABELS } from '../../types/medicalTest';
import { isoToDisplay } from '../../utils/dates';

interface MedicalTestCardProps {
  test: MedicalTest;
  onOpenFile: (test: MedicalTest) => void;
  onShare: (test: MedicalTest) => void;
  onEdit: (test: MedicalTest) => void;
  onDelete: (test: MedicalTest) => void;
}

const TYPE_ICONS: Record<MedicalTestType, keyof typeof Ionicons.glyphMap> = {
  laboratory: 'eyedrop-outline',
  imaging: 'scan-outline',
  other: 'document-text-outline',
};

const BADGE_CLASSES: Record<MedicalTestStatus, { bg: string; text: string }> = {
  normal: { bg: 'bg-[#E8F7F1]', text: 'text-[#1A7A50]' },
  altered: { bg: 'bg-[#FCEAEA]', text: 'text-[#B92020]' },
  pending: { bg: 'bg-[#FEF0E2]', text: 'text-[#C16A10]' },
};

export default function MedicalTestCard({
  test,
  onOpenFile,
  onShare,
  onEdit,
  onDelete,
}: MedicalTestCardProps) {
  const [expanded, setExpanded] = useState(false);
  const badge = BADGE_CLASSES[test.status];
  const isAltered = test.status === 'altered';
  const subtitle = [isoToDisplay(test.date), test.veterinarian].filter(Boolean).join(' · ');
  const isImage = test.file ? /\.(jpe?g|png)$/i.test(test.file) : false;

  return (
    <View
      className="overflow-hidden rounded-3xl bg-white"
      style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 16, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}
    >
      {/* Fila principal: se toca para abrir el resultado */}
      <Pressable
        onPress={() => setExpanded((prev) => !prev)}
        className="flex-row items-center gap-3 p-4 active:opacity-80"
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <View
          className={`h-10 w-10 items-center justify-center rounded-[20px] ${
            isAltered ? 'bg-[#FCEAEA]' : 'bg-[#E8EAF6]'
          }`}
        >
          <Ionicons name={TYPE_ICONS[test.type]} size={18} color={isAltered ? '#B92020' : '#4A5FA0'} />
        </View>

        <View className="flex-1">
          <Text className="text-sm font-extrabold text-[#3D2020]" numberOfLines={1}>
            {test.name}
          </Text>
          <Text className="text-xs font-medium text-[#A07878]" numberOfLines={1}>
            {subtitle}
          </Text>
        </View>

        <View className="flex-row items-center gap-2">
          <View className={`rounded-full px-2.5 py-0.5 ${badge.bg}`}>
            <Text className={`text-[10px] font-bold ${badge.text}`}>{STATUS_LABELS[test.status]}</Text>
          </View>
          <Ionicons name={expanded ? 'caret-up' : 'caret-down'} size={12} color="#A07878" />
        </View>
      </Pressable>

      {/* Detalle */}
      {expanded && (
        <View className="gap-1 border-t border-[#F0DDD5] px-4 pb-4 pt-3">
          <Text className="text-[10px] font-bold uppercase tracking-[0.5px] text-[#A07878]">Resultado</Text>
          {!!test.resultSummary && (
            <Text className="text-xs font-extrabold leading-5 text-[#3D2020]">{test.resultSummary}</Text>
          )}
          {!!test.resultDetail && (
            <Text className="text-xs font-semibold leading-5 text-[#3D2020]">{test.resultDetail}</Text>
          )}
          {!test.resultSummary && !test.resultDetail && (
            <Text className="text-xs font-semibold text-[#A07878]">Todavía no se cargó el resultado.</Text>
          )}

          {test.file && (
            <View className="flex-row gap-2 pt-2">
              <ActionButton
                icon={isImage ? 'image-outline' : 'document-outline'}
                label={isImage ? 'Ver imagen' : 'Ver PDF'}
                onPress={() => onOpenFile(test)}
              />
              <ActionButton icon="share-outline" label="Compartir" onPress={() => onShare(test)} />
            </View>
          )}

          {/* Editar y eliminar no están en el mockup, pero son parte del CRUD (TDD-0012 y TDD-0013) */}
          <View className="flex-row gap-2 pt-2">
            <ActionButton
              icon="create-outline"
              label={test.status === 'pending' ? 'Cargar resultado' : 'Editar'}
              onPress={() => onEdit(test)}
            />
            <ActionButton icon="trash-outline" label="Eliminar" onPress={() => onDelete(test)} danger />
          </View>
        </View>
      )}
    </View>
  );
}

interface ActionButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
}

function ActionButton({ icon, label, onPress, danger = false }: ActionButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-[20px] p-2 active:opacity-75 ${
        danger ? 'bg-[#FCEAEA]' : 'bg-[#FDF5F0]'
      }`}
    >
      <Ionicons name={icon} size={14} color={danger ? '#B92020' : '#D9627A'} />
      <Text className={`text-xs font-bold ${danger ? 'text-[#B92020]' : 'text-[#D9627A]'}`}>{label}</Text>
    </Pressable>
  );
}
