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
import { PetSpecies } from '../../types/pet';
import { UpdateVaccinePetPayload, Vaccine, VaccinePet, VaccineType } from '../../types/vaccinePet';
import { createVaccinePet, updateVaccinePet } from '../../services/vaccinePetService';
import { displayToIso, isoToDisplay, maskDate, todayIso } from '../../utils/dates';
import VaccinePicker from './VaccinePicker';

/** create = alta nueva · edit = corregir una aplicación · booster = refuerzo de la misma vacuna */
export type VaccineModalMode =
  | { kind: 'create' }
  | { kind: 'edit'; item: VaccinePet }
  | { kind: 'booster'; item: VaccinePet };

interface CreateVaccinePetModalProps {
  visible: boolean;
  petId: number;
  species: PetSpecies;
  mode: VaccineModalMode;
  onClose: () => void;
  onSaved: (saved: VaccinePet) => void;
}

interface FormState {
  vaccineId: number | null;
  vaccineType: VaccineType | null;
  validityDays: number | null;
  doseNumber: string;
  applicationDate: string; // dd/mm/aaaa
  expirationDate: string; // dd/mm/aaaa
  expirationTouched: boolean; // si el usuario lo escribió, no se recalcula
  notes: string;
}

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d + days);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mm}-${dd}`;
}

function daysBetween(fromIso: string, toIso: string): number {
  const [y1, m1, d1] = fromIso.split('-').map(Number);
  const [y2, m2, d2] = toIso.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

function initialState(mode: VaccineModalMode): FormState {
  if (mode.kind === 'edit') {
    const { item } = mode;
    return {
      vaccineId: item.idVaccine,
      vaccineType: item.vaccineType,
      validityDays: null,
      doseNumber: item.doseNumber ? String(item.doseNumber) : '',
      applicationDate: isoToDisplay(item.applicationDate),
      expirationDate: isoToDisplay(item.expirationDate),
      expirationTouched: true,
      notes: item.notes ?? '',
    };
  }
  if (mode.kind === 'booster') {
    const { item } = mode;
    const today = todayIso();
    // mismo intervalo que la aplicación anterior
    const interval = daysBetween(item.applicationDate, item.expirationDate);
    return {
      vaccineId: item.idVaccine,
      vaccineType: item.vaccineType,
      validityDays: interval,
      doseNumber: item.doseNumber ? String(item.doseNumber + 1) : '',
      applicationDate: isoToDisplay(today),
      expirationDate: isoToDisplay(addDays(today, interval)),
      expirationTouched: false,
      notes: '',
    };
  }
  return {
    vaccineId: null,
    vaccineType: null,
    validityDays: null,
    doseNumber: '1',
    applicationDate: isoToDisplay(todayIso()),
    expirationDate: '',
    expirationTouched: false,
    notes: '',
  };
}

const TITLES: Record<VaccineModalMode['kind'], string> = {
  create: 'Agregar vacuna',
  edit: 'Editar vacuna',
  booster: 'Registrar refuerzo',
};

export default function CreateVaccinePetModal({
  visible,
  petId,
  species,
  mode,
  onClose,
  onSaved,
}: CreateVaccinePetModalProps) {
  const [form, setForm] = useState<FormState>(() => initialState(mode));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setForm(initialState(mode));
      setSubmitting(false);
    }
  }, [visible, mode]);

  const isVaccine = form.vaccineType === 'VACCINE';
  const lockedItem = mode.kind === 'create' ? null : mode.item;

  // Precarga el vencimiento = aplicación + vigencia, mientras el usuario no lo haya escrito
  const withSuggestedExpiration = (next: FormState): FormState => {
    if (next.expirationTouched || !next.validityDays) return next;
    const appIso = displayToIso(next.applicationDate);
    if (!appIso) return next;
    return { ...next, expirationDate: isoToDisplay(addDays(appIso, next.validityDays)) };
  };

  const handleSelectVaccine = (vaccine: Vaccine) => {
    setForm((prev) =>
      withSuggestedExpiration({
        ...prev,
        vaccineId: vaccine.idVaccine,
        vaccineType: vaccine.type,
        validityDays: vaccine.validityDays,
        doseNumber: vaccine.type === 'VACCINE' ? prev.doseNumber || '1' : '',
      })
    );
  };

  const validate = (): boolean => {
    if (!form.vaccineId) {
      Alert.alert('Campo requerido', 'Seleccioná una vacuna o antiparasitario del catálogo.');
      return false;
    }
    if (isVaccine) {
      const dose = parseInt(form.doseNumber, 10);
      if (!form.doseNumber.trim() || isNaN(dose) || dose <= 0) {
        Alert.alert('Dosis inválida', 'El número de dosis debe ser un entero mayor a cero (ej. 1).');
        return false;
      }
    }
    const appIso = displayToIso(form.applicationDate);
    if (!appIso) {
      Alert.alert('Fecha inválida', 'La fecha de aplicación debe tener el formato dd/mm/aaaa.');
      return false;
    }
    if (appIso > todayIso()) {
      Alert.alert('Fecha inválida', 'La fecha de aplicación no puede ser posterior a hoy.');
      return false;
    }
    const expIso = displayToIso(form.expirationDate);
    if (!expIso) {
      Alert.alert('Fecha inválida', 'La fecha de vencimiento debe tener el formato dd/mm/aaaa.');
      return false;
    }
    if (expIso <= appIso) {
      Alert.alert('Fecha inválida', 'El vencimiento tiene que ser posterior a la fecha de aplicación.');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const values = {
      doseNumber: isVaccine ? parseInt(form.doseNumber, 10) : null,
      applicationDate: displayToIso(form.applicationDate)!,
      expirationDate: displayToIso(form.expirationDate)!,
      notes: form.notes.trim(),
    };

    try {
      setSubmitting(true);
      let saved: VaccinePet;
      if (mode.kind === 'edit') {
        // PATCH solo con lo que cambió
        const changes: UpdateVaccinePetPayload = {};
        if (values.doseNumber !== mode.item.doseNumber) changes.doseNumber = values.doseNumber;
        if (values.applicationDate !== mode.item.applicationDate) changes.applicationDate = values.applicationDate;
        if (values.expirationDate !== mode.item.expirationDate) changes.expirationDate = values.expirationDate;
        if (values.notes !== (mode.item.notes ?? '')) changes.notes = values.notes;
        saved = Object.keys(changes).length ? await updateVaccinePet(mode.item.idVaccinePet, changes) : mode.item;
      } else {
        saved = await createVaccinePet({ idPet: petId, idVaccine: form.vaccineId!, ...values });
      }
      onSaved(saved);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No se pudo guardar. Verificá los datos ingresados.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end bg-black/40"
      >
        <View className="max-h-[90%] rounded-t-[36px] bg-white pb-8 pt-3 shadow-xl">
          <View className="items-center pb-2">
            <View className="h-1.5 w-12 rounded-full bg-[#E5DCD6]" />
          </View>

          <View className="flex-row items-center justify-between border-b border-[#F0E4DF]/60 px-6 pb-4">
            <Text className="text-xl font-bold tracking-tight text-[#2B1D1D]">{TITLES[mode.kind]}</Text>
            <Pressable
              onPress={onClose}
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
            <VaccinePicker
              species={species}
              selectedVaccineId={form.vaccineId}
              onSelectVaccine={handleSelectVaccine}
              disabled={mode.kind !== 'create'}
              lockedLabel={lockedItem ? { name: lockedItem.vaccineName, laboratory: lockedItem.laboratory } : undefined}
            />

            {isVaccine && (
              <View className="mb-4">
                <Text className="mb-1.5 text-xs font-bold tracking-wider text-[#8C7B77]">NÚMERO DE DOSIS</Text>
                <View className="flex-row items-center rounded-2xl border border-[#F0E4DF] bg-[#FAF5F2] px-4 py-3">
                  <TextInput
                    value={form.doseNumber}
                    onChangeText={(val) => setForm((prev) => ({ ...prev, doseNumber: val.replace(/\D/g, '') }))}
                    placeholder="ej. 1"
                    placeholderTextColor="#B5A7A3"
                    keyboardType="number-pad"
                    maxLength={2}
                    className="flex-1 text-base font-medium text-[#2B1D1D]"
                  />
                  <Text className="text-xs font-semibold text-[#8C7B77]">ª dosis</Text>
                </View>
              </View>
            )}

            <View className="mb-4 flex-row gap-3">
              <DateField
                label="FECHA DE APLICACIÓN"
                value={form.applicationDate}
                onChange={(val) =>
                  setForm((prev) => withSuggestedExpiration({ ...prev, applicationDate: maskDate(val) }))
                }
              />
              <DateField
                label="FECHA DE VENCIMIENTO"
                value={form.expirationDate}
                onChange={(val) =>
                  setForm((prev) => ({ ...prev, expirationDate: maskDate(val), expirationTouched: true }))
                }
              />
            </View>
            {!form.expirationTouched && !!form.validityDays && (
              <Text className="-mt-2 mb-4 text-[11px] text-[#8C7B77]">
                Vencimiento sugerido: {form.validityDays} días después de la aplicación. Podés cambiarlo.
              </Text>
            )}

            <View className="mb-6">
              <Text className="mb-1.5 text-xs font-bold tracking-wider text-[#8C7B77]">NOTAS (OPCIONAL)</Text>
              <View className="rounded-2xl border border-[#F0E4DF] bg-[#FAF5F2] px-4 py-3">
                <TextInput
                  value={form.notes}
                  onChangeText={(val) => setForm((prev) => ({ ...prev, notes: val }))}
                  placeholder="Ej: lote, veterinario, reacción..."
                  placeholderTextColor="#B5A7A3"
                  multiline
                  maxLength={255}
                  textAlignVertical="top"
                  className="min-h-[70px] text-base font-medium text-[#2B1D1D]"
                />
              </View>
            </View>

            <Pressable
              onPress={handleSubmit}
              disabled={submitting}
              className="items-center justify-center rounded-2xl bg-[#D9627A] py-4 shadow-sm active:opacity-85"
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-base font-bold text-white">Guardar</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <View className="flex-1">
      <Text className="mb-1.5 text-xs font-bold tracking-wider text-[#8C7B77]">{label}</Text>
      <View className="flex-row items-center rounded-2xl border border-[#F0E4DF] bg-[#FAF5F2] px-4 py-3">
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder="dd/mm/aaaa"
          placeholderTextColor="#B5A7A3"
          keyboardType="number-pad"
          maxLength={10}
          className="flex-1 text-base font-medium text-[#2B1D1D]"
        />
        <Ionicons name="calendar-outline" size={18} color="#8C7B77" />
      </View>
    </View>
  );
}
