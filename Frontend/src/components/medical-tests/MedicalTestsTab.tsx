import { Directory, File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, Linking, Pressable, Text, View } from 'react-native'
import { deleteMedicalTest, listMedicalTests } from '../../services/medicalTests'
import { TYPE_SECTIONS, type MedicalTest, type MedicalTestType } from '../../types/medicalTest'
import { isoToDisplay } from '../../utils/dates'
import MedicalTestCard from './MedicalTestCard'
import MedicalTestFormSheet from './MedicalTestFormSheet'
import { colors } from './theme'

const SECTION_ORDER: MedicalTestType[] = ['laboratory', 'imaging', 'other']

interface Props {
  petId: number
}

/**
 * Contenido de la pestaña "Estudios" del detalle de una mascota.
 * Se puede embeber en la pantalla de detalle de mascota (EP02) dentro de un ScrollView.
 */
export default function MedicalTestsTab({ petId }: Props) {
  const [tests, setTests] = useState<MedicalTest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<MedicalTest | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setTests(await listMedicalTests({ idPet: petId }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los estudios.')
    } finally {
      setLoading(false)
    }
  }, [petId])

  useEffect(() => {
    load()
  }, [load])

  const pending = useMemo(() => tests.filter((t) => t.status === 'pending'), [tests])
  const sections = useMemo(
    () =>
      SECTION_ORDER.map((type) => ({ type, items: tests.filter((t) => t.type === type) })).filter(
        (section) => section.items.length > 0,
      ),
    [tests],
  )

  function openCreate() {
    setEditing(null)
    setSheetOpen(true)
  }

  function openEdit(test: MedicalTest) {
    setEditing(test)
    setSheetOpen(true)
  }

  function handleSaved(saved: MedicalTest) {
    setSheetOpen(false)
    setTests((prev) => {
      const rest = prev.filter((t) => t.idMedicalTest !== saved.idMedicalTest)
      return [saved, ...rest].sort((a, b) => b.date.localeCompare(a.date) || b.idMedicalTest - a.idMedicalTest)
    })
  }

  function confirmDelete(test: MedicalTest) {
    Alert.alert('Eliminar estudio', `¿Eliminar "${test.name}" de la historia clínica?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMedicalTest(test.idMedicalTest)
            setTests((prev) => prev.filter((t) => t.idMedicalTest !== test.idMedicalTest))
          } catch (e) {
            Alert.alert('No se pudo eliminar', e instanceof Error ? e.message : 'Probá de nuevo.')
          }
        },
      },
    ])
  }

  async function openFile(test: MedicalTest) {
    if (!test.file) return
    try {
      await Linking.openURL(test.file)
    } catch {
      Alert.alert('No se pudo abrir el archivo')
    }
  }

  async function shareFile(test: MedicalTest) {
    if (!test.file) return
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Compartir no está disponible en este dispositivo')
        return
      }
      const folder = new Directory(Paths.cache, `medical-test-${test.idMedicalTest}`)
      if (folder.exists) folder.delete()
      folder.create()
      const downloaded = await File.downloadFileAsync(test.file, folder)
      await Sharing.shareAsync(downloaded.uri, { dialogTitle: test.name })
    } catch {
      Alert.alert('No se pudo compartir el archivo')
    }
  }

  return (
    <View>
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-base font-bold" style={{ color: colors.text }}>
          {tests.length} {tests.length === 1 ? 'estudio' : 'estudios'}
        </Text>
        <Pressable
          onPress={openCreate}
          className="rounded-full px-4 py-2 active:opacity-80"
          style={{ backgroundColor: colors.primary }}
        >
          <Text className="text-sm font-bold text-white">+ Subir</Text>
        </Pressable>
      </View>

      {loading && <ActivityIndicator color={colors.primary} className="mt-8" />}

      {!loading && error && (
        <View className="items-center rounded-3xl bg-white p-6">
          <Text className="text-center text-sm" style={{ color: colors.text }}>
            {error}
          </Text>
          <Pressable onPress={load} className="mt-3">
            <Text className="font-semibold" style={{ color: colors.primary }}>
              Reintentar
            </Text>
          </Pressable>
        </View>
      )}

      {!loading && !error && tests.length === 0 && (
        <View className="items-center rounded-3xl bg-white p-8">
          <Text className="text-3xl">🧪</Text>
          <Text className="mt-2 text-center text-sm" style={{ color: colors.muted }}>
            Todavía no hay estudios. Tocá "+ Subir" para cargar el primero.
          </Text>
        </View>
      )}

      {!loading &&
        pending.map((test) => (
          <Pressable
            key={`pending-${test.idMedicalTest}`}
            onPress={() => openEdit(test)}
            className="mb-4 flex-row items-center rounded-2xl border px-4 py-3"
            style={{ backgroundColor: colors.pendingBg, borderColor: colors.pendingBorder }}
          >
            <Text className="text-xl">⏳</Text>
            <View className="ml-3 flex-1">
              <Text className="text-sm font-bold" style={{ color: colors.pendingText }}>
                Resultado pendiente
              </Text>
              <Text className="text-sm" style={{ color: colors.pendingText }}>
                {test.name} · {isoToDisplay(test.date)}
              </Text>
            </View>
            <Text className="text-xs font-semibold" style={{ color: colors.pendingText }}>
              Cargar ›
            </Text>
          </Pressable>
        ))}

      {!loading &&
        sections.map((section) => (
          <View key={section.type} className="mb-2">
            <Text className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: colors.muted }}>
              {TYPE_SECTIONS[section.type]}
            </Text>
            {section.items.map((test) => (
              <MedicalTestCard
                key={test.idMedicalTest}
                test={test}
                onOpenFile={openFile}
                onShare={shareFile}
                onEdit={openEdit}
                onDelete={confirmDelete}
              />
            ))}
          </View>
        ))}

      <MedicalTestFormSheet
        visible={sheetOpen}
        petId={petId}
        editing={editing}
        onClose={() => setSheetOpen(false)}
        onSaved={handleSaved}
      />
    </View>
  )
}
