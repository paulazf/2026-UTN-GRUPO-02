import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useGoogleAuth } from '../services/googleAuth';

export default function WelcomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [errorMsg, setErrorMsg] = useState('');
  const { signInWithGoogle, isGoogleLoading } = useGoogleAuth((msg) => {
    setErrorMsg(msg);
    Alert.alert('Google Sign-In', msg);
  });

  return (
    <SafeAreaView className="flex-1 bg-[#FFF5F3]">
      <View className="flex-1 px-6 items-center justify-center pt-10">
        
        {/* ILUSTRACION CIRCULAR */}
        <View className="w-[200px] h-[200px] bg-[#FDE8E8] rounded-full justify-center items-center mb-8 border-[6px] border-[#FFF5F3] shadow-sm">
           <Ionicons name="paw" size={72} color="#DE6B80" />
        </View>

        {/* TEXTOS */}
        <Text className="text-[28px] font-extrabold text-[#1A202C] mb-4 text-center">
          Bienvenido a PetLife
        </Text>
        <Text className="text-[15px] text-[#718096] text-center mb-10 px-4 leading-relaxed">
          La app pensada para cuidar la salud, vacunas y felicidad de tus mejores amigos de cuatro patas.
        </Text>

        {/* MENSAJE DE ERROR */}
        {errorMsg ? (
          <View className="w-full bg-red-100 border border-red-300 rounded-xl p-3 mb-4">
            <Text className="text-red-700 text-[13px] text-center">{errorMsg}</Text>
          </View>
        ) : null}

        {/* BOTONES */}
        <View className="w-full space-y-4">
          <TouchableOpacity 
            className="bg-[#D8657B] rounded-full h-[52px] justify-center items-center shadow-sm"
            onPress={() => navigation.navigate('Login')}
          >
            <Text className="text-white text-[16px] font-bold">Iniciar sesión</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            className="bg-transparent border border-[#D8657B] rounded-full h-[52px] justify-center items-center mt-4"
            onPress={() => navigation.navigate('Register')}
          >
            <Text className="text-[#D8657B] text-[16px] font-bold">Crear cuenta</Text>
          </TouchableOpacity>
        </View>

        {/* DIVIDER */}
        <View className="flex-row items-center justify-center my-6 w-full">
          <View className="h-[1px] bg-slate-300 flex-1" />
          <View className="w-2 h-2 border border-[#A0AEC0] rounded-full mx-3" />
          <View className="h-[1px] bg-slate-300 flex-1" />
        </View>

        {/* BOTON GOOGLE */}
        <TouchableOpacity 
          className="bg-white border border-slate-200 rounded-full h-[52px] w-full justify-center items-center flex-row shadow-sm"
          onPress={signInWithGoogle}
          disabled={isGoogleLoading}
        >
          {isGoogleLoading ? (
            <ActivityIndicator color="#D8657B" />
          ) : (
            <>
              <Ionicons name="logo-google" size={20} color="#2D3748" className="mr-3" />
              <Text className="text-[#2D3748] text-[15px] font-semibold">Continuar con Google</Text>
            </>
          )}
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}
