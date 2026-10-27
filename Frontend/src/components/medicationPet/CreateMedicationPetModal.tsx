import { useEffect, useMemo, useState } from 'react';
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
import { Medication, MedicationPet } from '../../types/medicationPet';
import { createMedicationPet, updateMedicationPet } from '../../services/medicationPetService';
import { displayToIso, isoToDisplay, maskDate, todayIso } from '../../utils/dates';
import MedicationPicker from './MedicationPicker';

interface CreateMedicationPetModalProps {
  visible: boolean;
  petId: number;
  medicationToEdit?: MedicationPet | null;
  onClose: () => void;
  onSaved: (medication: MedicationPet) => void;
  onCreated?: (newMedication: MedicationPet) => void;
}

interface FormState {
  medicationId: number | null;
  frequencyHours: string;
  quantityDose: string;
  startDate: string; // DD/MM/AAAA
  notes: string;
}

export default function CreateMedicationPetModal({
  visible,
  petId,
  medicationToEdit,
  onClose,
  onSaved,
  onCreated,
}: CreateMedicationPetModalProps) {
  const isEditing = !!medicationToEdit;

  const [form, setForm] = useState<FormState>({
    medicationId: null,
    frequencyHours: '',
    quantityDose: '1',
    startDate: '',
    notes: '',
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      if (medicationToEdit) {
        setForm({
          medicationId: medicationToEdit.idMedication,
          frequencyHours: String(medicationToEdit.frequencyHours),
          quantityDose: String(medicationToEdit.quantityDose),
          startDate: isoToDisplay(medicationToEdit.startDate),
          notes: medicationToEdit.notes || '',
        });
      } else {
        resetForm();
      }
    }
  }, [visible, medicationToEdit]);

  const resetForm = () => {
    setForm({
      medicationId: null,
      frequencyHours: '',
      quantityDose: '1',
      startDate: '',
      notes: '',
    });
    setSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Cálculo de fecha de fin estimada para visualización en tiempo real
  const estimatedEndDateDisplay = useMemo(() => {
    const freq = parseInt(form.frequencyHours, 10);
    const dose = parseInt(form.quantityDose, 10);
    const startIso = displayToIso(form.startDate);

    if (!startIso || isNaN(freq) || freq <= 0 || isNaN(dose) || dose <= 0) {
      return null;
    }

    const totalHours = freq * dose;
    const daysToAdd = totalHours >= 24 ? Math.ceil(totalHours / 24) : 0;

    const [year, month, day] = startIso.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    dateObj.setDate(dateObj.getDate() + daysToAdd);

    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(dateObj.getDate())}/${pad(dateObj.getMonth() + 1)}/${dateObj.getFullYear()}`;
  }, [form.startDate, form.frequencyHours, form.quantityDose]);

  const validate = (): boolean => {
    if (!form.medicationId) {
      Alert.alert('Campo requerido', 'Por favor, seleccioná un medicamento del catálogo.');
      return false;
    }

    const freq = parseInt(form.frequencyHours, 10);
    if (!form.frequencyHours.trim() || isNaN(freq) || freq <= 0) {
      Alert.alert(
        'Frecuencia inválida',
        'La frecuencia debe ser un número entero mayor a cero (ej. 8 o 12 horas).'
      );
      return false;
    }

    const dose = parseInt(form.quantityDose, 10);
    if (!form.quantityDose.trim() || isNaN(dose) || dose <= 0) {
      Alert.alert(
        'Dosis inválida',
        'La cantidad de tomas debe ser un número entero mayor a cero (ej. 1).'
      );
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

    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setSubmitting(true);
      const startIso = displayToIso(form.startDate)!;

      let result: MedicationPet;
      if (isEditing && medicationToEdit) {
        result = await updateMedicationPet(medicationToEdit.id, {
          frequencyHours: parseInt(form.frequencyHours, 10),
          quantityDose: parseInt(form.quantityDose, 10),
          startDate: startIso,
          notes: form.notes.trim() || null,
        });
      } else {
        result = await createMedicationPet({
          idPet: petId,
          idMedication: form.medicationId!,
          frequencyHours: parseInt(form.frequencyHours, 10),
          quantityDose: parseInt(form.quantityDose, 10),
          startDate: startIso,
          notes: form.notes.trim() || null,
        });
      }

      onSaved(result);
      if (onCreated) onCreated(result);
      handleClose();
    } catch (err: any) {
      Alert.alert(
        'Error',
        err.message || 'No se pudo guardar la medicación. Verificá los datos ingresados.'
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
              {isEditing ? 'Editar medicación' : 'Agregar medicación'}
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
            {/* Campo 1: Medicamento (Picker o Fijo si es edición) */}
            {isEditing && medicationToEdit ? (
              <View className="mb-4">
                <Text className="mb-1.5 text-xs font-bold tracking-wider text-[#8C7B77]">
                  MEDICAMENTO
                </Text>
                <View className="flex-row items-center rounded-2xl border border-[#F0E4DF] bg-[#FAF5F2] px-4 py-3.5">
                  <View className="h-9 w-9 items-center justify-center rounded-xl bg-[#FCECEF]">
                    <Ionicons name="medkit" size={18} color="#DE6B80" />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-sm font-bold text-[#2B1D1D]">
                      {medicationToEdit.medicationName}
                    </Text>
                    <Text className="text-[11px] font-medium text-[#8C7B77]">
                      Fármaco asignado al tratamiento
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <MedicationPicker
                selectedMedicationId={form.medicationId}
                onSelectMedication={(medication: Medication) => {
                  setForm((prev) => ({ ...prev, medicationId: medication.idMedication }));
                }}
              />
            )}

            {/* Fila Frecuencia y Cantidad */}
            <View className="mb-4 flex-row gap-3">
              {/* Campo 2: Frecuencia (horas) */}
              <View className="flex-1">
                <Text className="mb-1.5 text-xs font-bold tracking-wider text-[#8C7B77]">
                  CADA CUÁNTAS HORAS
                </Text>
                <View className="h-[52px] flex-row items-center rounded-2xl border border-[#F0E4DF] px-4 bg-[#FAF5F2]">
                  <TextInput
                    value={form.frequencyHours}
                    onChangeText={(val) => {
                      const clean = val.replace(/\D/g, '');
                      setForm((prev) => ({ ...prev, frequencyHours: clean }));
                    }}
                    placeholder="ej. 8 o 12"
                    placeholderTextColor="#B5A7A3"
                    keyboardType="number-pad"
                    maxLength={3}
                    className="flex-1 text-base font-medium text-[#2B1D1D]"
                  />
                  <Text className="text-xs font-semibold text-[#8C7B77]">hs</Text>
                </View>
              </View>

              {/* Campo 3: Cantidad de tomas */}
              <View className="flex-1">
                <Text className="mb-1.5 text-xs font-bold tracking-wider text-[#8C7B77]">
                  NÚMERO DE TOMAS
                </Text>
                <View className="h-[52px] flex-row items-center rounded-2xl border border-[#F0E4DF] px-4 bg-[#FAF5F2]">
                  <TextInput
                    value={form.quantityDose}
                    onChangeText={(val) => {
                      const clean = val.replace(/\D/g, '');
                      setForm((prev) => ({ ...prev, quantityDose: clean }));
                    }}
                    placeholder="ej. 1"
                    placeholderTextColor="#B5A7A3"
                    keyboardType="number-pad"
                    maxLength={3}
                    className="flex-1 text-base font-medium text-[#2B1D1D]"
                  />
                  <Text className="text-xs font-semibold text-[#8C7B77]">tomas</Text>
                </View>
              </View>
            </View>

            {/* Fila Fecha de Inicio y Fecha Estimada de Fin */}
            <View className="mb-4 flex-row gap-3">
              {/* Fecha Desde */}
              <View className="flex-1">
                <Text className="mb-1.5 text-xs font-bold tracking-wider text-[#8C7B77]">
                  FECHA DE INICIO
                </Text>
                <View className="h-[52px] flex-row items-center rounded-2xl border border-[#F0E4DF] px-4 bg-[#FAF5F2]">
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

              {/* Fecha de Fin Calculada (Solo Lectura) */}
              <View className="flex-1 opacity-75">
                <View className="mb-1.5 flex-row items-center gap-1">
                  <Text className="text-xs font-bold tracking-wider text-[#8C7B77]">
                    FECHA DE FIN
                  </Text>
                  <View className="rounded-full bg-[#EAE2DC] px-1.5 py-0.2">
                    <Text className="text-[9px] font-bold text-[#8C7B77]">AUTO</Text>
                  </View>
                </View>
                <View className="h-[52px] flex-row items-center justify-between rounded-2xl border border-dashed border-[#D5C7C0] px-4 bg-[#EDE5E0]/60">
                  <Text className="text-base font-medium text-[#7A6B67]">
                    {estimatedEndDateDisplay || 'dd/mm/aaaa'}
                  </Text>
                  <Ionicons name="lock-closed-outline" size={16} color="#A89993" />
                </View>
              </View>
            </View>

            {/* Campo 5: Notas / Observaciones */}
            <View className="mb-6">
              <Text className="mb-1.5 text-xs font-bold tracking-wider text-[#8C7B77]">
                NOTAS U OBSERVACIONES
              </Text>
              <View className="rounded-2xl border border-[#F0E4DF] bg-[#FAF5F2] px-4 py-3">
                <TextInput
                  value={form.notes}
                  onChangeText={(val) => setForm((prev) => ({ ...prev, notes: val }))}
                  placeholder="Indicaciones (ej. con alimento, en ayunas)..."
                  placeholderTextColor="#B5A7A3"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  className="min-h-[90px] text-base font-medium text-[#2B1D1D]"
                />
              </View>
            </View>

            {/* Botón: Guardar medicación */}
            <Pressable
              onPress={handleSubmit}
              disabled={submitting}
              className="items-center justify-center rounded-2xl bg-[#D9627A] py-4 shadow-sm active:opacity-85"
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-base font-bold text-white">
                  {isEditing ? 'Guardar cambios' : 'Guardar medicación'}
                </Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}