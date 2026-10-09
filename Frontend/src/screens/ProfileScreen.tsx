import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const authContext = useContext(AuthContext);

  const owner = authContext?.userData;
  const firstName = owner?.firstName || '';
  const lastName = owner?.lastName || '';
  const email = owner?.email || '';
  
  const userFullName = `${firstName} ${lastName}`.trim() || 'Cargando...';

  return (
    <SafeAreaView className="flex-1 bg-[#FFF5F3]" edges={['top']}>
      {/* Header section with solid background instead of gradient */}
      <View 
        className="bg-[#D8657B] rounded-b-[40px] pt-4 pb-8 px-6 relative items-center"
      >
        <TouchableOpacity 
          className="absolute left-6 top-6 w-10 h-10 bg-white/20 rounded-full justify-center items-center"
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        
        {/* Avatar mock */}
        <View className="w-20 h-20 bg-white/30 rounded-full items-center justify-center mt-2 mb-3">
          <View className="w-[72px] h-[72px] bg-white rounded-full items-center justify-center">
            <Ionicons name="person" size={40} color="#CBD5E0" />
          </View>
        </View>
        
        <Text className="text-white text-[22px] font-bold">{userFullName}</Text>
        <Text className="text-white/80 text-[14px] mt-1">{email}</Text>
      </View>

      {/* Menu Options */}
      <ScrollView className="flex-1 px-6 pt-6">
        
        <TouchableOpacity className="flex-row items-center bg-white p-4 rounded-3xl mb-3 shadow-sm">
          <View className="w-12 h-12 bg-[#FFF5F3] rounded-full justify-center items-center mr-4">
            <Ionicons name="paw-outline" size={24} color="#D8657B" />
          </View>
          <View className="flex-1 justify-center">
            <Text className="text-[#2D3748] text-[16px] font-bold">Mis mascotas</Text>
            <Text className="text-[#A0AEC0] text-[13px] mt-0.5">2 registradas</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#CBD5E0" />
        </TouchableOpacity>

        <TouchableOpacity className="flex-row items-center bg-white p-4 rounded-3xl mb-3 shadow-sm">
          <View className="w-12 h-12 bg-[#FFF5F3] rounded-full justify-center items-center mr-4">
            <Ionicons name="notifications-outline" size={24} color="#D8657B" />
          </View>
          <View className="flex-1 justify-center">
            <Text className="text-[#2D3748] text-[16px] font-bold">Notificaciones</Text>
            <Text className="text-[#A0AEC0] text-[13px] mt-0.5">Recordatorios activados</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#CBD5E0" />
        </TouchableOpacity>

        <TouchableOpacity className="flex-row items-center bg-white p-4 rounded-3xl mb-3 shadow-sm">
          <View className="w-12 h-12 bg-[#FFF5F3] rounded-full justify-center items-center mr-4">
            <Ionicons name="medkit-outline" size={24} color="#D8657B" />
          </View>
          <View className="flex-1 justify-center">
            <Text className="text-[#2D3748] text-[16px] font-bold">Mis veterinarios</Text>
            <Text className="text-[#A0AEC0] text-[13px] mt-0.5">Dr. Acosta, Dra. Ríos</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#CBD5E0" />
        </TouchableOpacity>

        <TouchableOpacity className="flex-row items-center bg-white p-4 rounded-3xl mb-3 shadow-sm">
          <View className="w-12 h-12 bg-[#FFF5F3] rounded-full justify-center items-center mr-4">
            <Ionicons name="document-text-outline" size={24} color="#D8657B" />
          </View>
          <View className="flex-1 justify-center">
            <Text className="text-[#2D3748] text-[16px] font-bold">Historial completo</Text>
            <Text className="text-[#A0AEC0] text-[13px] mt-0.5">Exportar PDF</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#CBD5E0" />
        </TouchableOpacity>

        <TouchableOpacity 
          className="flex-row items-center bg-white p-4 rounded-3xl mb-8 shadow-sm"
          onPress={() => navigation.navigate('Settings' as never)}
        >
          <View className="w-12 h-12 bg-[#FFF5F3] rounded-full justify-center items-center mr-4">
            <Ionicons name="settings-outline" size={24} color="#D8657B" />
          </View>
          <View className="flex-1 justify-center">
            <Text className="text-[#2D3748] text-[16px] font-bold">Configuración</Text>
            <Text className="text-[#A0AEC0] text-[13px] mt-0.5">Cuenta y privacidad</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#CBD5E0" />
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
