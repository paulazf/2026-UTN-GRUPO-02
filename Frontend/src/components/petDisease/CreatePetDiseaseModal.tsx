import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { Disease, PetDisease } from '../../types/petDisease';
import { createPetDisease } from '../../services/petDiseaseService';
import { displayToIso, maskDate, todayIso } from '../../utils/dates';
import DiseasePicker from './DiseasePicker';

interface CreatePetDiseaseModalProps {
  visible: boolean;
  petId: number;
  onClose: () => void;
  onCreated: (newDisease: PetDisease) => void;
}

interface FormState {
  diseaseId: number | null;
  startDate: string; // DD/MM/AAAA
  endDate: string; // DD/MM/AAAA
  notes: string;
}

export default function CreatePetDiseaseModal({
  visible,
  petId,
  onClose,
  onCreated,
}: CreatePetDiseaseModalProps) {
  const [form, setForm] = useState<FormState>({
    diseaseId: null,
    startDate: '',
    endDate: '',
    notes: '',
  });

  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setForm({
      diseaseId: null,
      startDate: '',
      endDate: '',
      notes: '',
    });
    setSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validate = (): boolean => {
    if (!form.diseaseId) {
      Alert.alert('Campo requerido', 'Por favor, seleccioná una condición o diagnóstico.');
      return false;
    }

    if (!form.startDate.trim()) {
      Alert.alert('Campo requerido', 'Por favor, ingresá la fecha de inicio.');
      return false;
    }

    const startIso = displayToIso(form.startDate);
    if (!startIso) {
      Alert.alert('Fecha inválida', 'La fecha de inicio debe tener el formato dd/mm/aaaa.');
      return false;
    }

    if (startIso > todayIso()) {
      Alert.alert('Fecha inválida', 'La fecha de inicio no puede ser posterior a hoy.');
      return false;
    }

    if (form.endDate.trim()) {
      const endIso = displayToIso(form.endDate);
      if (!endIso) {
        Alert.alert('Fecha inválida', 'La fecha de fin debe tener el formato dd/mm/aaaa.');
        return false;
      }
      if (endIso < startIso) {
        Alert.alert('Fecha inválida', 'La fecha de fin no puede ser anterior a la de inicio.');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setSubmitting(true);

      const startIso = displayToIso(form.startDate)!;
      const endIso = form.endDate.trim() ? displayToIso(form.endDate) : null;

      const created = await createPetDisease({
        idPet: petId,
        idDisease: form.diseaseId!,
        startDate: startIso,
        endDate: endIso,
        notes: form.notes.trim() || null,
      });

      onCreated(created);
      handleClose();
    } catch (err: any) {
      Alert.alert(
        'Error',
        err.message || 'No se pudo guardar la condición. Verificá los datos ingresados.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end bg-black/40"
      >
        <View className="max-h-[90%] rounded-t-[36px] bg-white pt-3 pb-8 shadow-xl">
          {/* Indicador de arrastre superior */}
          <View className="items-center pb-2">
            <View className="h-1.5 w-12 rounded-full bg-[#E5DCD6]" />
          </View>

          {/* Encabezado: Título y botón cerrar */}
          <View className="flex-row items-center justify-between border-b border-[#F0E4DF]/60 px-6 pb-4">
            <Text className="text-xl font-bold tracking-tight text-[#2B1D1D]">
              Agregar condición
            </Text>
            <Pressable
              onPress={handleClose}
              hitSlop={10}
              className="h-8 w-8 items-center justify-center rounded-full bg-[#FCECEF] active:opacity-70"
            >
              <Ionicons name="close" size={18} color="#DE6B80" />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerClassName="px-6 pt-5 pb-6"
          >
            {/* Campo 1: Condición / Diagnóstico (Picker) */}
            <DiseasePicker
              selectedDiseaseId={form.diseaseId}
              onSelectDisease={(disease: Disease) => {
                setForm((prev) => ({ ...prev, diseaseId: disease.id }));
              }}
            />

            {/* Campo 2: Desde (startDate) */}
            <View className="mb-4">
              <Text className="mb-1.5 text-xs font-bold tracking-wider text-[#8C7B77]">
                DESDE
              </Text>
              <View className="flex-row items-center rounded-2xl border border-[#F0E4DF] px-4 py-3 bg-[#FAF5F2]">
                <TextInput
                  value={form.startDate}
                  onChangeText={(val) => {
                    setForm((prev) => ({ ...prev, startDate: maskDate(val) }));
                  }}
                  placeholder="dd/mm/aaaa"
                  placeholderTextColor="#B5A7A3"
                  keyboardType="number-pad"
                  maxLength={10}
                  className="flex-1 text-base font-medium text-[#2B1D1D]"
                />
                <Ionicons name="calendar-outline" size={18} color="#8C7B77" />
              </View>
            </View>

            {/* Campo 3: Hasta (endDate - opcional) */}
            <View className="mb-4">
              <Text className="mb-1.5 text-xs font-bold tracking-wider text-[#8C7B77]">
                HASTA
              </Text>
              <View className="flex-row items-center rounded-2xl border border-[#F0E4DF] px-4 py-3 bg-[#FAF5F2]">
                <TextInput
                  value={form.endDate}
                  onChangeText={(val) => {
                    setForm((prev) => ({ ...prev, endDate: maskDate(val) }));
                  }}
                  placeholder="dd/mm/aaaa"
                  placeholderTextColor="#B5A7A3"
                  keyboardType="number-pad"
                  maxLength={10}
                  className="flex-1 text-base font-medium text-[#2B1D1D]"
                />
                <Ionicons name="calendar-outline" size={18} color="#8C7B77" />
              </View>
            </View>

            {/* Campo 4: Notas */}
            <View className="mb-6">
              <Text className="mb-1.5 text-xs font-bold tracking-wider text-[#8C7B77]">
                NOTAS
              </Text>
              <View className="rounded-2xl border border-[#F0E4DF] bg-[#FAF5F2] px-4 py-3">
                <TextInput
                  value={form.notes}
                  onChangeText={(val) => setForm((prev) => ({ ...prev, notes: val }))}
                  placeholder="Indicaciones, observaciones del veterinario..."
                  placeholderTextColor="#B5A7A3"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  className="min-h-[90px] text-base font-medium text-[#2B1D1D]"
                />
              </View>
            </View>

            {/* Botón: Guardar condición */}
            <Pressable
              onPress={handleSubmit}
              disabled={submitting}
              className="items-center justify-center rounded-2xl bg-[#D9627A] py-4 shadow-sm active:opacity-85"
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-base font-bold text-white">
                  Guardar condición
                </Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

