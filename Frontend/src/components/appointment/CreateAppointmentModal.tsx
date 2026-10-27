import { useEffect, useState } from 'react';
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
import { Appointment } from '../../types/appointment';
import { Address } from '../../types/address';
import { fetchAddresses } from '../../services/addressService';
import {
  createAppointment,
  updateAppointment,
} from '../../services/appointmentService';
import { displayToIso, isoToDisplay, maskDate, maskTime } from '../../utils/dates';
import AddressPicker from './AddressPicker';

interface CreateAppointmentModalProps {
  visible: boolean;
  petId: number;
  petBirthDate?: string | null;
  appointmentToEdit?: Appointment | null;
  onClose: () => void;
  onSaved: (appointment: Appointment) => void;
}

export default function CreateAppointmentModal({
  visible,
  petId,
  petBirthDate,
  appointmentToEdit,
  onClose,
  onSaved,
}: CreateAppointmentModalProps) {
  const isEditing = !!appointmentToEdit;

  const [date, setDate] = useState(''); // DD/MM/AAAA
  const [time, setTime] = useState(''); // HH:MM
  const [veterinarian, setVeterinarian] = useState('');
  const [description, setDescription] = useState('');

  // Domicilios
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [isManagingAddress, setIsManagingAddress] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  // Cargar domicilios guardados
  const loadAddresses = async () => {
    try {
      setLoadingAddresses(true);
      const data = await fetchAddresses();
      setAddresses(data);
    } catch (err) {
      console.warn('Error loading addresses:', err);
    } finally {
      setLoadingAddresses(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadAddresses();
      setIsManagingAddress(false);
      if (appointmentToEdit) {
        setDate(isoToDisplay(appointmentToEdit.date));
        const rawTime = appointmentToEdit.time || '';
        const parts = rawTime.split(':');
        setTime(parts.length >= 2 ? `${parts[0]}:${parts[1]}` : rawTime);
        setVeterinarian(appointmentToEdit.veterinarian || '');
        setDescription(appointmentToEdit.description || '');
        setSelectedAddressId(appointmentToEdit.idAddress || null);
      } else {
        resetForm();
      }
    }
  }, [visible, appointmentToEdit]);

  const resetForm = () => {
    setDate('');
    setTime('');
    setVeterinarian('');
    setDescription('');
    setSelectedAddressId(null);
    setIsManagingAddress(false);
    setSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validate = (): boolean => {
    if (!date.trim()) {
      Alert.alert('Campo requerido', 'Por favor ingresá la fecha del turno.');
      return false;
    }

    const isoDate = displayToIso(date);
    if (!isoDate) {
      Alert.alert('Fecha inválida', 'La fecha debe tener un formato válido dd/mm/aaaa.');
      return false;
    }

    if (petBirthDate && isoDate < petBirthDate) {
      Alert.alert(
        'Fecha inválida',
        `La fecha del turno no puede ser previa al nacimiento de la mascota (${isoToDisplay(petBirthDate)}).`
      );
      return false;
    }

    if (!time.trim()) {
      Alert.alert('Campo requerido', 'Por favor ingresá el horario del turno.');
      return false;
    }

    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(time.trim())) {
      Alert.alert(
        'Horario inválido',
        'El horario debe tener el formato hh:mm (ej. 16:30 o 09:00).'
      );
      return false;
    }

    if (!veterinarian.trim()) {
      Alert.alert(
        'Campo requerido',
        'Por favor ingresá el nombre del veterinario o profesional.'
      );
      return false;
    }

    if (!description.trim()) {
      Alert.alert('Campo requerido', 'Por favor ingresá el motivo de la consulta.');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setSubmitting(true);
      const isoDate = displayToIso(date)!;
      const formattedTime = time.trim() + ':00';

      let result: Appointment;

      if (isEditing && appointmentToEdit) {
        const appointmentId = appointmentToEdit.idAppointment || appointmentToEdit.id!;
        result = await updateAppointment(appointmentId, {
          date: isoDate,
          time: formattedTime,
          veterinarian: veterinarian.trim(),
          description: description.trim(),
          idAddress: selectedAddressId,
        });
      } else {
        result = await createAppointment({
          idPet: petId,
          date: isoDate,
          time: formattedTime,
          veterinarian: veterinarian.trim(),
          description: description.trim(),
          idAddress: selectedAddressId,
        });
      }

      onSaved(result);
      handleClose();
    } catch (err: any) {
      Alert.alert(
        'Error al guardar turno',
        err?.message || 'Ocurrió un problema al agendar el turno. Intenta nuevamente.'
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
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' }}
      >
        <Pressable
          className="absolute inset-0"
          onPress={handleClose}
          accessibilityLabel="Cerrar modal"
        />
        <View
          className="max-h-[92%] rounded-t-[36px] bg-white pt-3 pb-6 shadow-xl"
        >
          {/* Indicador superior */}
          <View className="items-center pb-2">
            <View className="h-1.5 w-12 rounded-full bg-[#E5DCD6]" />
          </View>

          {isManagingAddress ? (
            /* VISTA DE SELECCIÓN Y ADMINISTRACIÓN DE DOMICILIOS */
            <View style={{ flex: 1, minHeight: 440 }} className="px-6 pt-1">
              <AddressPicker
                isManaging={true}
                onOpenManage={() => setIsManagingAddress(true)}
                onCloseManage={() => setIsManagingAddress(false)}
                addresses={addresses}
                loadingAddresses={loadingAddresses}
                selectedAddressId={selectedAddressId}
                onSelectAddress={(id) => {
                  setSelectedAddressId(id);
                  setIsManagingAddress(false);
                }}
                onAddressCreated={(created) => {
                  setAddresses((prev) => [created, ...prev]);
                  setSelectedAddressId(created.idAddress);
                }}
                onAddressUpdated={(updated) => {
                  setAddresses((prev) =>
                    prev.map((a) => (a.idAddress === updated.idAddress ? updated : a))
                  );
                }}
                onAddressDeleted={(deletedId) => {
                  setAddresses((prev) => prev.filter((a) => a.idAddress !== deletedId));
                  if (selectedAddressId === deletedId) {
                    setSelectedAddressId(null);
                  }
                }}
              />
            </View>
          ) : (
            /* VISTA PRINCIPAL DEL TURNO */
            <>
              {/* Encabezado: Título y Botón cerrar */}
              <View className="flex-row items-center justify-between border-b border-[#F0E4DF]/60 px-6 pb-4">
                <Text className="text-xl font-bold tracking-tight text-[#2B1D1D]">
                  {isEditing ? 'Editar turno' : 'Agendar turno'}
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
                keyboardDismissMode="on-drag"
                contentContainerClassName="px-6 pt-5 pb-6"
              >
                {/* Fila: Fecha y Hora */}
                <View className="mb-4 flex-row gap-3">
                  {/* Fecha */}
                  <View className="flex-1">
                    <Text className="mb-1.5 text-xs font-bold tracking-wider text-[#8C7B77]">
                      FECHA DEL TURNO *
                    </Text>
                    <View className="h-[52px] flex-row items-center rounded-2xl border border-[#F0E4DF] bg-[#FAF5F2] px-4">
                      <TextInput
                        value={date}
                        onChangeText={(val) => setDate(maskDate(val))}
                        placeholder="dd/mm/aaaa"
                        placeholderTextColor="#B5A7A3"
                        keyboardType="number-pad"
                        maxLength={10}
                        className="flex-1 text-base font-medium text-[#2B1D1D]"
                      />
                      <Ionicons name="calendar-outline" size={18} color="#8C7B77" />
                    </View>
                  </View>

                  {/* Hora */}
                  <View className="w-32">
                    <Text className="mb-1.5 text-xs font-bold tracking-wider text-[#8C7B77]">
                      HORA *
                    </Text>
                    <View className="h-[52px] flex-row items-center rounded-2xl border border-[#F0E4DF] bg-[#FAF5F2] px-4">
                      <TextInput
                        value={time}
                        onChangeText={(val) => setTime(maskTime(val))}
                        placeholder="hh:mm"
                        placeholderTextColor="#B5A7A3"
                        keyboardType="number-pad"
                        maxLength={5}
                        className="flex-1 text-base font-medium text-[#2B1D1D]"
                      />
                      <Ionicons name="time-outline" size={18} color="#8C7B77" />
                    </View>
                  </View>
                </View>

                {/* Veterinario / Profesional */}
                <View className="mb-4">
                  <Text className="mb-1.5 text-xs font-bold tracking-wider text-[#8C7B77]">
                    VETERINARIO / PROFESIONAL *
                  </Text>
                  <View className="h-[52px] flex-row items-center rounded-2xl border border-[#F0E4DF] bg-[#FAF5F2] px-4">
                    <TextInput
                      value={veterinarian}
                      onChangeText={setVeterinarian}
                      placeholder="ej. Dra. Silvina Gómez"
                      placeholderTextColor="#B5A7A3"
                      className="flex-1 text-base font-medium text-[#2B1D1D]"
                    />
                    <Ionicons name="person-outline" size={18} color="#8C7B77" />
                  </View>
                </View>

                {/* Motivo o Descripción */}
                <View className="mb-4">
                  <Text className="mb-1.5 text-xs font-bold tracking-wider text-[#8C7B77]">
                    MOTIVO DE LA CONSULTA *
                  </Text>
                  <View className="rounded-2xl border border-[#F0E4DF] bg-[#FAF5F2] px-4 py-3">
                    <TextInput
                      value={description}
                      onChangeText={setDescription}
                      placeholder="ej. Control anual, aplicación de vacunas, ecografía..."
                      placeholderTextColor="#B5A7A3"
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                      className="min-h-[70px] text-base font-medium text-[#2B1D1D]"
                    />
                  </View>
                </View>

                {/* Selector de Domicilio Compacto */}
                <AddressPicker
                  isManaging={false}
                  onOpenManage={() => setIsManagingAddress(true)}
                  onCloseManage={() => setIsManagingAddress(false)}
                  addresses={addresses}
                  loadingAddresses={loadingAddresses}
                  selectedAddressId={selectedAddressId}
                  onSelectAddress={setSelectedAddressId}
                  onAddressCreated={(created) => {
                    setAddresses((prev) => [created, ...prev]);
                    setSelectedAddressId(created.idAddress);
                  }}
                  onAddressUpdated={(updated) => {
                    setAddresses((prev) =>
                      prev.map((a) => (a.idAddress === updated.idAddress ? updated : a))
                    );
                  }}
                  onAddressDeleted={(deletedId) => {
                    setAddresses((prev) => prev.filter((a) => a.idAddress !== deletedId));
                    if (selectedAddressId === deletedId) {
                      setSelectedAddressId(null);
                    }
                  }}
                />

                {/* Botón: Guardar */}
                <Pressable
                  onPress={handleSubmit}
                  disabled={submitting}
                  className="mt-2 items-center justify-center rounded-2xl bg-[#D9627A] py-4 shadow-sm active:opacity-85"
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text className="text-base font-bold text-white">
                      {isEditing ? 'Guardar cambios' : 'Agendar turno'}
                    </Text>
                  )}
                </Pressable>
              </ScrollView>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
