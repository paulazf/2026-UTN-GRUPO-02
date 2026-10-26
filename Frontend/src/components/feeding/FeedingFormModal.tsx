import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { Feeding, FeedingPayload, FeedingType, FEEDING_TYPE_OPTIONS } from '../../types/feeding';
import { createFeeding, FeedingApiError, updateFeeding } from '../../services/feedingService';
import { displayToIso, isoToDisplay, maskDate, todayIso } from '../../utils/dates';

interface FeedingFormModalProps {
  visible: boolean;
  petId: number;
  editing?: Feeding | null;
  onClose: () => void;
  onSaved: (feeding: Feeding) => void;
}

interface FormState {
  food: string;
  type: FeedingType;
  portion: string;
  frequency: string;
  sinceDate: string;
  notes: string;
}

type FormErrors = Partial<Record<keyof FormState | 'general', string>>;

function initialState(feeding?: Feeding | null): FormState {
  return {
    food: feeding?.food ?? '',
    type: feeding?.type ?? 'DRY_FOOD',
    portion: feeding?.portion ?? '',
    frequency: feeding?.frequency ?? '',
    sinceDate: feeding ? isoToDisplay(feeding.sinceDate) : '',
    notes: feeding?.notes ?? '',
  };
}

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.food.trim()) errors.food = 'Ingresá el nombre del alimento o dieta.';
  else if (form.food.trim().length > 150) errors.food = 'Usá hasta 150 caracteres.';

  if (!FEEDING_TYPE_OPTIONS.some((option) => option.value === form.type)) {
    errors.type = 'Seleccioná un tipo de alimentación.';
  }

  const isoDate = displayToIso(form.sinceDate);
  if (!isoDate) errors.sinceDate = 'Ingresá una fecha válida (DD/MM/AAAA).';
  else if (isoDate > todayIso()) errors.sinceDate = 'La fecha de inicio no puede ser futura.';

  if (!form.portion.trim()) errors.portion = 'Ingresá la porción diaria.';
  if (form.portion.trim().length > 100) errors.portion = 'Usá hasta 100 caracteres.';
  if (!form.frequency.trim()) errors.frequency = 'Ingresá cuántas comidas recibe por día.';
  if (form.frequency.trim().length > 100) errors.frequency = 'Usá hasta 100 caracteres.';
  return errors;
}

export default function FeedingFormModal({
  visible,
  petId,
  editing,
  onClose,
  onSaved,
}: FeedingFormModalProps) {
  const [form, setForm] = useState<FormState>(initialState(editing));
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [typePickerOpen, setTypePickerOpen] = useState(false);

  useEffect(() => {
    if (visible) {
      setForm(initialState(editing));
      setErrors({});
      setTypePickerOpen(false);
    }
  }, [visible, editing]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => ({ ...previous, [key]: undefined, general: undefined }));
  };

  const handleSubmit = async () => {
    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }

    const values: FeedingPayload = {
      food: form.food.trim(),
      type: form.type,
      portion: form.portion.trim(),
      frequency: form.frequency.trim(),
      sinceDate: displayToIso(form.sinceDate)!,
      notes: form.notes.trim(),
    };

    try {
      setSubmitting(true);
      let saved: Feeding;
      if (editing) {
        const changes: FeedingPayload = {};
        for (const key of Object.keys(values) as (keyof FeedingPayload)[]) {
          if (values[key] !== editing[key as keyof Feeding]) {
            (changes as Record<string, unknown>)[key] = values[key];
          }
        }
        saved = Object.keys(changes).length
          ? await updateFeeding(editing.idFeeding, changes)
          : editing;
      } else {
        saved = await createFeeding({ ...values, idPet: petId });
      }
      onSaved(saved);
    } catch (error) {
      if (error instanceof FeedingApiError) {
        const fieldErrors: FormErrors = {};
        for (const [field, messages] of Object.entries(error.fields)) {
          if (field in form) fieldErrors[field as keyof FormState] = messages[0];
        }
        if (
          error.fields.detail ||
          error.fields.non_field_errors ||
          Object.keys(fieldErrors).length === 0
        ) {
          fieldErrors.general = error.message;
        }
        setErrors(fieldErrors);
      } else {
        setErrors({ general: 'No se pudo guardar la alimentación. Probá de nuevo.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const selectedType = FEEDING_TYPE_OPTIONS.find((option) => option.value === form.type);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end bg-[rgba(30,10,10,0.45)]"
      >
        <Pressable className="absolute inset-0" onPress={onClose} accessibilityLabel="Cerrar" />
        <View className="max-h-[92%] rounded-t-[28px] bg-white">
          <View className="items-center pb-1 pt-3">
            <View className="h-1 w-9 rounded-sm bg-[#E8D8D8]" />
          </View>

          <View className="flex-row items-center justify-between border-b border-[#F0DDD5] px-5 py-3">
            <Text className="text-lg font-black text-[#3D2020]">
              {editing ? 'Editar alimentación' : 'Registrar alimentación'}
            </Text>
            <Pressable
              onPress={onClose}
              className="h-8 w-8 items-center justify-center rounded-full bg-[#FDF0F3] active:opacity-70"
              accessibilityLabel="Cerrar"
            >
              <Ionicons name="close" size={16} color="#D9627A" />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerClassName="gap-4 px-5 pb-10 pt-4"
          >
            <Field label="Nombre del alimento o dieta" error={errors.food}>
              <Input
                value={form.food}
                onChangeText={(value) => setField('food', value)}
                placeholder="Ej: Royal Canin Indoor..."
                maxLength={150}
                autoCapitalize="sentences"
              />
            </Field>

            <Field label="Tipo de alimentación" error={errors.type}>
              <Pressable
                onPress={() => setTypePickerOpen((open) => !open)}
                className="flex-row items-center justify-between rounded-[20px] border-[1.5px] border-[#F0DDD5] bg-[#FDF5F0] px-3.5 py-3 active:opacity-80"
                accessibilityRole="button"
                accessibilityState={{ expanded: typePickerOpen }}
              >
                <Text className="text-sm font-semibold text-[#3D2020]">
                  {selectedType?.label ?? 'Seleccioná un tipo'}
                </Text>
                <Ionicons
                  name={typePickerOpen ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color="#A07878"
                />
              </Pressable>
              {typePickerOpen && (
                <View className="gap-1 rounded-2xl border border-[#F0DDD5] bg-white p-1">
                  {FEEDING_TYPE_OPTIONS.map((option) => {
                    const selected = option.value === form.type;
                    return (
                      <Pressable
                        key={option.value}
                        onPress={() => {
                          setField('type', option.value);
                          setTypePickerOpen(false);
                        }}
                        className={`flex-row items-center justify-between rounded-xl px-3.5 py-2.5 ${
                          selected ? 'bg-[#FDF0F3]' : 'active:bg-[#FAF6F3]'
                        }`}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                      >
                        <Text
                          className={`text-sm font-semibold ${
                            selected ? 'text-[#D9627A]' : 'text-[#6C5551]'
                          }`}
                        >
                          {option.label}
                        </Text>
                        {selected && <Ionicons name="checkmark" size={16} color="#D9627A" />}
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </Field>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Field label="Porción diaria" error={errors.portion}>
                  <Input
                    value={form.portion}
                    onChangeText={(value) => setField('portion', value)}
                    placeholder="Ej: 55 g"
                    maxLength={100}
                  />
                </Field>
              </View>
              <View className="flex-1">
                <Field label="Comidas al día" error={errors.frequency}>
                  <Input
                    value={form.frequency}
                    onChangeText={(value) => setField('frequency', value)}
                    placeholder="Ej: 2"
                    maxLength={100}
                    keyboardType="numeric"
                  />
                </Field>
              </View>
            </View>

            <Field label="Fecha de inicio" error={errors.sinceDate}>
              <View className="flex-row items-center gap-2 rounded-[20px] border-[1.5px] border-[#F0DDD5] bg-[#FDF5F0] px-3.5 py-2.5">
                <TextInput
                  value={form.sinceDate}
                  onChangeText={(value) => setField('sinceDate', maskDate(value))}
                  placeholder="dd/mm/aaaa"
                  keyboardType="number-pad"
                  maxLength={10}
                  placeholderTextColor="#C09898"
                  className="flex-1 text-sm font-semibold text-[#3D2020]"
                />
                <Ionicons name="calendar-outline" size={16} color="#A07878" />
              </View>
            </Field>

            <Field label="Notas, alergias y restricciones" error={errors.notes}>
              <Input
                value={form.notes}
                onChangeText={(value) => setField('notes', value)}
                placeholder="Alergias, restricciones o indicaciones del veterinario..."
                multiline
                maxLength={2000}
                style={{ minHeight: 88, textAlignVertical: 'top' }}
              />
            </Field>

            {errors.general && (
              <Text className="text-center text-xs font-semibold text-[#B92020]">
                {errors.general}
              </Text>
            )}

            <Pressable
              onPress={handleSubmit}
              disabled={submitting}
              className="items-center rounded-3xl bg-[#D9627A] p-3.5 active:opacity-90"
            >
              {submitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-sm font-extrabold text-white">Guardar alimentación</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <View className="gap-1.5">
      <Text className="text-[10px] font-bold uppercase tracking-[0.5px] text-[#A07878]">{label}</Text>
      {children}
      {error && <Text className="text-[11px] font-semibold text-[#B92020]">{error}</Text>}
    </View>
  );
}

function Input(props: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      placeholderTextColor="#C09898"
      className="rounded-[20px] border-[1.5px] border-[#F0DDD5] bg-[#FDF5F0] px-3.5 py-2.5 text-sm font-semibold text-[#3D2020]"
      {...props}
    />
  );
}
