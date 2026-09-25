import { StatusBar } from 'expo-status-bar'
import { Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native'
import ProjectStatusCard from '../components/ProjectStatusCard'

export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-[#f4f1ea]">
      <StatusBar style="dark" />
      <ScrollView contentContainerClassName="px-6 pb-10 pt-8">
        <View className="mb-10 flex-row items-center justify-between">
          <View>
            <Text className="text-sm font-semibold uppercase tracking-[3px] text-[#d05b3f]">
              UTN Grupo 02
            </Text>
            <Text className="mt-2 text-4xl font-bold text-[#173b3f]">Tu proyecto,</Text>
            <Text className="text-4xl font-bold text-[#173b3f]">en movimiento.</Text>
          </View>
          <View className="h-14 w-14 items-center justify-center rounded-full bg-[#173b3f]">
            <Text className="text-2xl text-[#f4f1ea]">02</Text>
          </View>
        </View>

        <ProjectStatusCard />

        <View className="mt-6 flex-row gap-4">
          <View className="flex-1 rounded-2xl border border-[#d9d1c3] bg-[#fffdf8] p-5">
            <Text className="text-3xl font-bold text-[#d05b3f]">01</Text>
            <Text className="mt-2 text-base font-semibold text-[#173b3f]">Mobile</Text>
            <Text className="mt-1 text-sm leading-5 text-[#6a7772]">React Native + Expo</Text>
          </View>
          <View className="flex-1 rounded-2xl border border-[#d9d1c3] bg-[#fffdf8] p-5">
            <Text className="text-3xl font-bold text-[#d05b3f]">02</Text>
            <Text className="mt-2 text-base font-semibold text-[#173b3f]">Backend</Text>
            <Text className="mt-1 text-sm leading-5 text-[#6a7772]">Django + PostgreSQL</Text>
          </View>
        </View>

        <Pressable className="mt-8 rounded-2xl bg-[#d05b3f] px-5 py-4 active:opacity-80">
          <Text className="text-center text-base font-bold text-white">Comenzar recorrido</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}