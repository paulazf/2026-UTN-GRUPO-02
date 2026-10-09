import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { CreatePetPayload, PetPhotoFile, PetSpecies } from '../../types/pet';
import { createPet } from '../../services/petService';
import BreedPicker from './BreedPicker';

interface CreatePetModalProps {
  visible: boolean;
  onClose: () => void;
  onPetCreated: () => void;
}

export default function CreatePetModal({
  visible,
  onClose,
  onPetCreated,
}: CreatePetModalProps) {
  const [name, setName] = useState('');
  const [species, setSpecies] = useState<PetSpecies>('DOG');
  const [selectedBreedId, setSelectedBreedId] = useState<number | null>(null);
  const [birthDateInput, setBirthDateInput] = useState('');
  const [weightInput, setWeightInput] = useState('');
  const [neutered, setNeutered] = useState<boolean>(false);
  const [photoFile, setPhotoFile] = useState<PetPhotoFile | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setName('');
    setBirthDateInput('');
    setWeightInput('');
    setNeutered(false);
    setPhotoFile(null);
    setSelectedBreedId(null);
  };

  const handleSpeciesChange = (sp: PetSpecies) => {
    setSpecies(sp);
    setSelectedBreedId(null);
  };

  const handlePickImage = async () => {
    try {
      const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!granted) {
        Alert.alert('Permiso necesario', 'Se requiere acceso a las fotos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        setPhotoFile({
          uri: asset.uri,
          name: asset.fileName || 'pet.jpg',
          type: asset.mimeType || 'image/jpeg',
          base64: asset.base64 || undefined,
        });
      }
    } catch {
      Alert.alert('Error', 'No se pudo seleccionar la foto.');
    }
  };

  const handleDateChange = (text: string) => {
    const d = text.replace(/\D/g, '').slice(0, 8);
    if (d.length <= 2) setBirthDateInput(d);
    else if (d.length <= 4) setBirthDateInput(`${d.slice(0, 2)}/${d.slice(2)}`);
    else setBirthDateInput(`${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return Alert.alert('Campo requerido', 'Ingresá el nombre de la mascota.');
    if (!selectedBreedId) return Alert.alert('Campo requerido', 'Seleccioná una raza.');

    const [d, m, y] = birthDateInput.split('/');
    if (!d || !m || !y || y.length !== 4) {
      return Alert.alert('Fecha inválida', 'Ingresá la fecha completa DD/MM/AAAA (ej: 15/03/2023).');
    }
    const isoDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    const today = new Date().toISOString().split('T')[0];
    if (isoDate > today) {
      return Alert.alert('Fecha inválida', 'La fecha de nacimiento no puede ser futura.');
    }

    const weight = parseFloat(weightInput.replace(',', '.'));
    if (isNaN(weight) || weight <= 0 || weight > 150) {
      return Alert.alert('Peso inválido', 'El peso debe ser mayor a 0 y no puede superar los 150 kg.');
    }

    try {
      setSubmitting(true);
      const payload: CreatePetPayload = {
        name: name.trim(),
        birthDate: isoDate,
        neutered,
        weight,
        idBreed: selectedBreedId,
        idOwner: 1,
        photo: null,
        photoFile,
      };

      await createPet(payload);

      resetForm();
      onPetCreated();
      onClose();
    } catch (err: any) {
      Alert.alert('Error al registrar', err.message || 'No se pudo registrar la mascota.');
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      {/* KeyboardAvoidingView sube el sheet para que el teclado no tape los inputs */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end bg-black/50"
      >
        <View className="max-h-[92%] rounded-t-[32px] bg-[#FFFDFC] p-6 pb-10">
          <View className="mb-4 h-1.5 w-12 self-center rounded-full bg-[#E8DDD9]" />

          {/* Encabezado */}
          <View className="mb-5 flex-row items-center justify-between">
            <Text className="text-2xl font-bold text-[#2B1D1D]">Nueva mascota</Text>
            <Pressable
              onPress={onClose}
              className="h-8 w-8 items-center justify-center rounded-full bg-[#FCECEF] active:opacity-70"
            >
              <Text className="font-bold text-[#DE6B80]">✕</Text>
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag" // el teclado numérico de iOS no tiene botón para cerrarlo
          >
            {/* CARGA DE FOTO */}
            <View className="mb-5 items-center">
              <View className="relative mb-3 h-28 w-28 items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed border-[#DE6B80] bg-[#FAF5F2] shadow-sm">
                {photoFile ? (
                  <Image
                    source={{ uri: photoFile.uri }}
                    className="h-full w-full"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="items-center justify-center p-2">
                    <Ionicons name="camera-outline" size={38} color="#DE6B80" />
                    <Text className="mt-1 text-[11px] font-medium text-[#8C7B77]">Sin foto</Text>
                  </View>
                )}
              </View>

              <Pressable
                onPress={handlePickImage}
                className="mb-1 flex-row items-center gap-2 rounded-2xl bg-[#FCECEF] px-4 py-2.5 active:opacity-75"
              >
                <Ionicons name="image-outline" size={18} color="#DE6B80" />
                <Text className="text-sm font-bold text-[#DE6B80]">
                  {photoFile ? 'Cambiar foto de la galería' : 'Elegir foto de la galería'}
                </Text>
              </Pressable>

              {photoFile && (
                <Pressable
                  onPress={() => setPhotoFile(null)}
                  className="py-1"
                >
                  <Text className="text-xs text-[#8C7B77] underline">Quitar foto</Text>
                </Pressable>
              )}
            </View>

            {/* NOMBRE */}
            <View className="mb-4">
              <Text className="mb-1.5 text-xs font-bold tracking-wider text-[#8C7B77]">NOMBRE</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Ej: Max, Milo, Cleo..."
                placeholderTextColor="#B5A7A3"
                className="rounded-2xl border border-[#F0E4DF] bg-[#FAF5F2] px-4 py-3 text-base text-[#2B1D1D]"
              />
            </View>

            {/* ESPECIE */}
            <View className="mb-4">
              <Text className="mb-1.5 text-xs font-bold tracking-wider text-[#8C7B77]">ESPECIE</Text>
              <View className="flex-row gap-3">
                <Pressable
                  onPress={() => handleSpeciesChange('DOG')}
                  className={`flex-1 flex-row items-center justify-center gap-2 rounded-2xl border py-3 active:opacity-80 ${
                    species === 'DOG'
                      ? 'border-[#DE6B80] bg-[#DE6B80]'
                      : 'border-[#F0E4DF] bg-[#FAF5F2]'
                  }`}
                >
                  <Text
                    className={`text-base font-semibold ${
                      species === 'DOG' ? 'text-white' : 'text-[#8C7B77]'
                    }`}
                  >
                    Perro
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => handleSpeciesChange('CAT')}
                  className={`flex-1 flex-row items-center justify-center gap-2 rounded-2xl border py-3 active:opacity-80 ${
                    species === 'CAT'
                      ? 'border-[#DE6B80] bg-[#DE6B80]'
                      : 'border-[#F0E4DF] bg-[#FAF5F2]'
                  }`}
                >
                  <Text
                    className={`text-base font-semibold ${
                      species === 'CAT' ? 'text-white' : 'text-[#8C7B77]'
                    }`}
                  >
                    Gato
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* SELECTOR DE RAZA */}
            <BreedPicker
              species={species}
              selectedBreedId={selectedBreedId}
              onSelectBreed={setSelectedBreedId}
            />

            {/* FECHA DE NACIMIENTO */}
            <View className="mb-4">
              <Text className="mb-1.5 text-xs font-bold tracking-wider text-[#8C7B77]">
                FECHA DE NACIMIENTO
              </Text>
              <View className="flex-row items-center rounded-2xl border border-[#F0E4DF] bg-[#FAF5F2] px-4 py-3">
                <TextInput
                  value={birthDateInput}
                  onChangeText={handleDateChange}
                  placeholder="DD/MM/AAAA"
                  keyboardType="number-pad"
                  maxLength={10}
                  placeholderTextColor="#B5A7A3"
                  className="flex-1 text-base text-[#2B1D1D]"
                />
                <Ionicons name="calendar-outline" size={20} color="#8C7B77" />
              </View>
              <Text className="mt-1 text-[11px] text-[#A89B98]">
                Formato: DD/MM/AAAA
              </Text>
            </View>

            {/* PESO */}
            <View className="mb-4">
              <Text className="mb-1.5 text-xs font-bold tracking-wider text-[#8C7B77]">
                PESO (KG)
              </Text>
              <TextInput
                value={weightInput}
                onChangeText={setWeightInput}
                placeholder="Ej: 4.2 o 28"
                keyboardType="decimal-pad"
                placeholderTextColor="#B5A7A3"
                className="rounded-2xl border border-[#F0E4DF] bg-[#FAF5F2] px-4 py-3 text-base text-[#2B1D1D]"
              />
            </View>

            {/* CASTRADO/A */}
            <View className="mb-6">
              <Text className="mb-1.5 text-xs font-bold tracking-wider text-[#8C7B77]">
                CASTRADO/A
              </Text>
              <View className="flex-row gap-3">
                <Pressable
                  onPress={() => setNeutered(true)}
                  className={`flex-1 items-center justify-center rounded-2xl border py-3 active:opacity-80 ${
                    neutered
                      ? 'border-[#DE6B80] bg-[#DE6B80]'
                      : 'border-[#F0E4DF] bg-[#FAF5F2]'
                  }`}
                >
                  <Text
                    className={`text-base font-semibold ${
                      neutered ? 'text-white' : 'text-[#8C7B77]'
                    }`}
                  >
                    Sí
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setNeutered(false)}
                  className={`flex-1 items-center justify-center rounded-2xl border py-3 active:opacity-80 ${
                    !neutered
                      ? 'border-[#DE6B80] bg-[#DE6B80]'
                      : 'border-[#F0E4DF] bg-[#FAF5F2]'
                  }`}
                >
                  <Text
                    className={`text-base font-semibold ${
                      !neutered ? 'text-white' : 'text-[#8C7B77]'
                    }`}
                  >
                    No
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* BOTÓN AGREGAR MASCOTA */}
            <Pressable
              onPress={handleSubmit}
              disabled={submitting}
              className="items-center rounded-2xl bg-[#DE6B80] py-4 shadow-sm active:opacity-90"
            >
              {submitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-base font-bold text-white">Agregar mascota</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
