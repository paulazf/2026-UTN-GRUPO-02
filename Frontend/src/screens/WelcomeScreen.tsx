import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useGoogleAuth } from '../services/googleAuth';
import { useSeasonTheme } from '../context/ThemeContext';
import PawLogo from '../components/brand/PawLogo';
import SeasonDecor from '../components/brand/SeasonDecor';

export default function WelcomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { season, palette } = useSeasonTheme();
  const [errorMsg, setErrorMsg] = useState('');
  const { signInWithGoogle, isGoogleLoading } = useGoogleAuth((msg) => {
    setErrorMsg(msg);
    Alert.alert('Google Sign-In', msg);
  });

  return (
    <SafeAreaView className="flex-1 bg-[#FFF5F3]">
      {/* Adornos de la temporada, en el color de acento sobre el fondo claro */}
      <SeasonDecor season={season} variant="splash" color={palette.accent} opacity={0.22} />
      <View className="flex-1 px-6 items-center justify-center pt-10">

        {/* LOGO DE LA TEMPORADA */}
        <View
          className="w-[200px] h-[200px] rounded-full justify-center items-center mb-8 border-[6px] border-[#FFF5F3] shadow-sm"
          style={{ backgroundColor: palette.header }}
        >
          <PawLogo season={season} size={112} color="#FFFFFF" cut={palette.header} />
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
            className="rounded-full h-[52px] justify-center items-center shadow-sm"
            style={{ backgroundColor: palette.accent }}
            onPress={() => navigation.navigate('Login')}
          >
            <Text className="text-white text-[16px] font-bold">Iniciar sesión</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            className="bg-transparent border rounded-full h-[52px] justify-center items-center mt-4"
            style={{ borderColor: palette.accent }}
            onPress={() => navigation.navigate('Register')}
          >
            <Text className="text-[16px] font-bold" style={{ color: palette.accent }}>Crear cuenta</Text>
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
            <ActivityIndicator color={palette.accent} />
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
