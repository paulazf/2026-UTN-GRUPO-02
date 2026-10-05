import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { SafeAreaView, ScrollView, Text, View } from 'react-native'
import MedicalTestsTab from '../components/medical-tests/MedicalTestsTab'
import { colors } from '../components/medical-tests/theme'
import { getPet, type PetSummary } from '../services/pets'

interface Props {
  petId: number
}

/**
 * Pantalla provisoria para probar la pestaña "Estudios".
 * Cuando exista el detalle de mascota en el front (EP02) y la navegación, se usa
 * <MedicalTestsTab petId={...} /> dentro de esa pantalla y esta se puede borrar.
 */
export default function PetMedicalTestsScreen({ petId }: Props) {
  const [pet, setPet] = useState<PetSummary | null>(null)
  const [petError, setPetError] = useState<string | null>(null)

  useEffect(() => {
    getPet(petId)
      .then(setPet)
      .catch((e: unknown) => setPetError(e instanceof Error ? e.message : 'No se encontró la mascota.'))
  }, [petId])

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <StatusBar style="dark" />
      <ScrollView contentContainerClassName="px-5 pb-10 pt-6">
        <Text className="text-sm font-semibold uppercase tracking-widest" style={{ color: colors.primary }}>
          Historia clínica
        </Text>
        <Text className="mt-1 text-3xl font-bold" style={{ color: colors.text }}>
          {pet?.name ?? (petError ? 'Mascota no encontrada' : '...')}
        </Text>
        {pet && (
          <Text className="mt-1 text-base" style={{ color: colors.muted }}>
            {pet.breed.name}
            {pet.age !== null ? ` · ${pet.age} ${pet.age === 1 ? 'año' : 'años'}` : ''}
          </Text>
        )}

        <View className="mb-5 mt-5 flex-row">
          <View className="rounded-full px-4 py-2" style={{ backgroundColor: colors.primary }}>
            <Text className="text-sm font-semibold text-white">Estudios</Text>
          </View>
        </View>

        {pet && <MedicalTestsTab petId={pet.id} />}
        {petError && (
          <Text className="text-center text-sm" style={{ color: colors.muted }}>
            Creá una mascota desde POST /api/v1/pets/ y usá su id en App.tsx.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
