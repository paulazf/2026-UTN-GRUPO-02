import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const authContext = useContext(AuthContext);

  return (
    <SafeAreaView className="flex-1 bg-[#FFF5F3]" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-6 pt-6 pb-2">
        <TouchableOpacity 
          className="w-10 h-10 bg-white rounded-full justify-center items-center shadow-sm"
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color="#D8657B" />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-[18px] font-bold text-[#2D3748] mr-10">
          Configuración
        </Text>
      </View>

      <ScrollView className="flex-1 px-6 pt-6">
        
        <Text className="text-[12px] font-bold text-[#A0AEC0] mb-4 ml-2 tracking-widest uppercase">
          Cuenta y Privacidad
        </Text>

        <TouchableOpacity 
          className="flex-row items-center bg-white p-4 rounded-3xl mb-3 shadow-sm border border-slate-50"
          onPress={() => navigation.navigate('EditProfile' as never)}
        >
          <View className="w-10 h-10 bg-[#FCE8E8] rounded-full justify-center items-center mr-4">
            <Ionicons name="person-outline" size={20} color="#D8657B" />
          </View>
          <Text className="flex-1 text-[#2D3748] text-[16px] font-semibold">Editar perfil</Text>
          <Ionicons name="chevron-forward" size={20} color="#CBD5E0" />
        </TouchableOpacity>

        <TouchableOpacity 
          className="flex-row items-center bg-white p-4 rounded-3xl mb-3 shadow-sm border border-slate-50"
          onPress={() => navigation.navigate('ChangePassword' as never)}
        >
          <View className="w-10 h-10 bg-[#E2E8F0] rounded-full justify-center items-center mr-4">
            <Ionicons name="lock-closed-outline" size={20} color="#4A5568" />
          </View>
          <Text className="flex-1 text-[#2D3748] text-[16px] font-semibold">Cambiar contraseña</Text>
          <Ionicons name="chevron-forward" size={20} color="#CBD5E0" />
        </TouchableOpacity>

        <TouchableOpacity className="flex-row items-center bg-white p-4 rounded-3xl mb-8 shadow-sm border border-slate-50">
          <View className="w-10 h-10 bg-[#FEE2E2] rounded-full justify-center items-center mr-4">
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </View>
          <Text className="flex-1 text-red-500 text-[16px] font-semibold">Eliminar cuenta</Text>
          <Ionicons name="chevron-forward" size={20} color="#CBD5E0" />
        </TouchableOpacity>

        {/* Logout Button */}
        <TouchableOpacity 
          className="mt-8 mb-10 flex-row justify-center items-center"
          onPress={() => authContext?.logout()}
        >
          <Ionicons name="log-out-outline" size={24} color="#D8657B" className="mr-2" />
          <Text className="text-[#D8657B] text-[16px] font-bold">Cerrar sesión</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
