import { Text, View } from 'react-native'
import { apiUrl } from '../services/api'

export default function ProjectStatusCard() {
  return (
    <View className="rounded-[28px] bg-[#173b3f] p-6">
      <Text className="text-sm font-semibold uppercase tracking-[2px] text-[#f2b84b]">
        Expo Go listo
      </Text>
      <Text className="mt-3 text-3xl font-bold leading-9 text-white">
        Frontend móvil conectado al backend.
      </Text>
      <Text className="mt-4 text-base leading-6 text-[#c5d5d1]">
        Esta pantalla ya corre sobre React Native y usa NativeWind para sus estilos.
      </Text>
      <View className="mt-6 rounded-2xl bg-[#24555a] px-4 py-3">
        <Text className="text-xs font-semibold uppercase tracking-[1px] text-[#a9d6c9]">
          API configurada
        </Text>
        <Text className="mt-1 text-sm text-white" numberOfLines={1}>
          {apiUrl}
        </Text>
      </View>
    </View>
  )
}