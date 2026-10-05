import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { STATUS_LABELS, type MedicalTest } from '../../types/medicalTest'
import { isoToDisplay } from '../../utils/dates'
import { colors, typeIcons } from './theme'

interface Props {
  test: MedicalTest
  onOpenFile: (test: MedicalTest) => void
  onShare: (test: MedicalTest) => void
  onEdit: (test: MedicalTest) => void
  onDelete: (test: MedicalTest) => void
}

const badgeStyles = {
  normal: { bg: colors.normalBg, text: colors.normalText },
  altered: { bg: colors.alteredBg, text: colors.alteredText },
  pending: { bg: colors.pendingBg, text: colors.pendingText },
}

export default function MedicalTestCard({ test, onOpenFile, onShare, onEdit, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false)
  const badge = badgeStyles[test.status]
  const subtitle = [isoToDisplay(test.date), test.veterinarian].filter(Boolean).join(' · ')
  const isImage = test.file ? /\.(jpe?g|png)$/i.test(test.file) : false

  return (
    <View className="mb-3 rounded-3xl bg-white" style={{ shadowOpacity: 0.05, shadowRadius: 8 }}>
      <Pressable
        onPress={() => setExpanded((value) => !value)}
        className="flex-row items-center px-4 py-4"
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <View
          className="h-11 w-11 items-center justify-center rounded-full"
          style={{ backgroundColor: test.status === 'altered' ? colors.alteredBg : '#E9EAF6' }}
        >
          <Text className="text-lg">{typeIcons[test.type]}</Text>
        </View>

        <View className="ml-3 flex-1">
          <Text className="text-base font-bold" style={{ color: colors.text }} numberOfLines={1}>
            {test.name}
          </Text>
          <Text className="mt-0.5 text-sm" style={{ color: colors.muted }} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>

        <View className="ml-2 rounded-full px-2.5 py-1" style={{ backgroundColor: badge.bg }}>
          <Text className="text-xs font-semibold" style={{ color: badge.text }}>
            {STATUS_LABELS[test.status]}
          </Text>
        </View>
        <Text className="ml-2 text-xs" style={{ color: colors.muted }}>
          {expanded ? '▲' : '▼'}
        </Text>
      </Pressable>

      {expanded && (
        <View className="border-t px-4 pb-4 pt-3" style={{ borderColor: colors.border }}>
          <Text className="text-xs font-semibold uppercase tracking-wider" style={{ color: colors.muted }}>
            Resultado
          </Text>
          <Text className="mt-1 text-sm leading-5" style={{ color: colors.text }}>
            {test.resultDetail || test.resultSummary || 'Todavía no se cargó el resultado.'}
          </Text>

          {test.file && (
            <View className="mt-4 flex-row gap-3">
              <ActionButton label={isImage ? '🖼  Ver imagen' : '📄  Ver PDF'} onPress={() => onOpenFile(test)} />
              <ActionButton label="⤴  Compartir" onPress={() => onShare(test)} />
            </View>
          )}

          <View className="mt-3 flex-row gap-3">
            <ActionButton
              label={test.status === 'pending' ? '✎  Cargar resultado' : '✎  Editar'}
              onPress={() => onEdit(test)}
            />
            <ActionButton label="🗑  Eliminar" onPress={() => onDelete(test)} danger />
          </View>
        </View>
      )}
    </View>
  )
}

function ActionButton({ label, onPress, danger }: { label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 items-center rounded-full py-2.5 active:opacity-70"
      style={{ backgroundColor: danger ? colors.alteredBg : colors.primarySoft }}
    >
      <Text className="text-sm font-semibold" style={{ color: danger ? colors.alteredText : colors.primary }}>
        {label}
      </Text>
    </Pressable>
  )
}
