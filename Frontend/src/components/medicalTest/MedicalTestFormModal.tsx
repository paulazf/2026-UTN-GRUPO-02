import React, { useEffect, useState } from 'react';
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
import * as DocumentPicker from 'expo-document-picker';
import {
  MedicalTest,
  MedicalTestPayload,
  MedicalTestStatus,
  MedicalTestType,
  PickedFile,
  STATUS_LABELS,
  TYPE_LABELS,
} from '../../types/medicalTest';
import { ApiError, createMedicalTest, updateMedicalTest } from '../../services/medicalTestService';
import { displayToIso, isoToDisplay, maskDate, todayIso } from '../../utils/dates';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB, igual que el back
const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png'];

interface MedicalTestFormModalProps {
  visible: boolean;
  petId: number;
  editing?: MedicalTest | null; // Si viene, edita ese estudio (TDD-0012). Si no, crea uno (TDD-0010)
  onClose: () => void;
  onSaved: (test: MedicalTest) => void;
}

interface FormState {
  name: string;
  type: MedicalTestType;
  date: string; // DD/MM/AAAA
  veterinarian: string;
  status: MedicalTestStatus;
  resultSummary: string;
  resultDetail: string;
  file: PickedFile | null;
}

type FormErrors = Partial<Record<keyof FormState | 'general', string>>;

function initialState(test?: MedicalTest | null): FormState {
  return {
    name: test?.name ?? '',
    type: test?.type ?? 'laboratory',
    date: test ? isoToDisplay(test.date) : '',
    veterinarian: test?.veterinarian ?? '',
    status: test?.status ?? 'normal',
    resultSummary: test?.resultSummary ?? '',
    resultDetail: test?.resultDetail ?? '',
    file: null,
  };
}

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.name.trim()) errors.name = 'Ingresá el nombre del estudio.';
  const iso = displayToIso(form.date);
  if (!iso) errors.date = 'Ingresá una fecha válida (DD/MM/AAAA).';
  else if (iso > todayIso()) errors.date = 'La fecha no puede ser futura.';
  if (form.status !== 'pending' && !form.resultSummary.trim()) {
    errors.resultSummary = 'Si el estudio tiene resultado, completá el resumen.';
  }
  return errors;
}

export default function MedicalTestFormModal({
  visible,
  petId,
  editing,
  onClose,
  onSaved,
}: MedicalTestFormModalProps) {
  const [form, setForm] = useState<FormState>(initialState(editing));
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setForm(initialState(editing));
      setErrors({});
    }
  }, [visible, editing]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handlePickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ALLOWED_MIME,
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    const mimeType = asset.mimeType ?? '';
    if (!ALLOWED_MIME.includes(mimeType)) {
      setErrors((prev) => ({ ...prev, file: 'Solo se aceptan PDF, JPG o PNG.' }));
      return;
    }
    if (asset.size !== undefined && asset.size > MAX_FILE_SIZE) {
      setErrors((prev) => ({ ...prev, file: 'El archivo supera los 10 MB.' }));
      return;
    }
    setField('file', { uri: asset.uri, name: asset.name, mimeType, size: asset.size });
  };

  const handleSubmit = async () => {
    const found = validate(form);
    if (Object.keys(found).length) {
      setErrors(found);
      return;
    }

    const values: MedicalTestPayload = {
      name: form.name.trim(),
      type: form.type,
      date: displayToIso(form.date)!,
      veterinarian: form.veterinarian.trim(),
      status: form.status,
      resultSummary: form.resultSummary.trim(),
      resultDetail: form.resultDetail.trim(),
      file: form.file ?? undefined,
    };

    try {
      setSubmitting(true);
      let saved: MedicalTest;
      if (editing) {
        // PATCH solo con lo que cambió
        const changes: MedicalTestPayload = {};
        for (const key of Object.keys(values) as (keyof MedicalTestPayload)[]) {
          if (key === 'file') continue;
          if (values[key] !== editing[key as keyof MedicalTest]) {
            (changes as Record<string, unknown>)[key] = values[key];
          }
        }
        if (values.file) changes.file = values.file;
        saved = Object.keys(changes).length
          ? await updateMedicalTest(editing.idMedicalTest, changes)
          : editing;
      } else {
        saved = await createMedicalTest({ ...values, idPet: petId });
      }
      onSaved(saved);
    } catch (err) {
      if (err instanceof ApiError) {
        // Los errores por campo del back se muestran debajo de cada input
        const fieldErrors: FormErrors = { general: err.message };
        for (const [field, messages] of Object.entries(err.fields)) {
          if (field in form) fieldErrors[field as keyof FormState] = messages[0];
        }
        setErrors(fieldErrors);
      } else {
        setErrors({ general: 'Ocurrió un error. Probá de nuevo.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const currentFileName =
    form.file?.name ??
    (editing?.file ? decodeURIComponent(editing.file.split('/').pop() ?? '') : null);

  const title = editing
    ? editing.status === 'pending'
      ? 'Cargar resultado'
      : 'Editar estudio'
    : 'Subir estudio';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end bg-[rgba(30,10,10,0.45)]"
      >
        {/* Tocar el fondo cierra el modal */}
        <Pressable className="absolute inset-0" onPress={onClose} accessibilityLabel="Cerrar" />

        <View className="max-h-[92%] rounded-t-[28px] bg-white">
          <View className="items-center pb-1 pt-3">
            <View className="h-1 w-9 rounded-sm bg-[#E8D8D8]" />
          </View>

          {/* Encabezado */}
          <View className="flex-row items-center justify-between border-b border-[#F0DDD5] px-5 py-3">
            <Text className="text-lg font-black text-[#3D2020]">{title}</Text>
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
            contentContainerClassName="gap-4 px-5 pb-10 pt-4"
          >
            <Field label="Nombre del estudio" error={errors.name}>
              <Input
                value={form.name}
                onChangeText={(v) => setField('name', v)}
                placeholder="Ej: Hemograma, Ecografía abdominal..."
                maxLength={100}
              />
            </Field>

            <Field label="Tipo">
              <Segmented
                options={(Object.keys(TYPE_LABELS) as MedicalTestType[]).map((v) => ({
                  value: v,
                  label: TYPE_LABELS[v],
                }))}
                value={form.type}
                onChange={(v) => setField('type', v)}
              />
            </Field>

            <Field label="Fecha" error={errors.date}>
              <View className="flex-row items-center gap-2 rounded-[20px] border-[1.5px] border-[#F0DDD5] bg-[#FDF5F0] px-3.5 py-2.5">
                <TextInput
                  value={form.date}
                  onChangeText={(v) => setField('date', maskDate(v))}
                  placeholder="dd/mm/aaaa"
                  keyboardType="number-pad"
                  maxLength={10}
                  placeholderTextColor="#C09898"
                  className="flex-1 text-sm font-semibold text-[#3D2020]"
                />
                <Ionicons name="calendar-outline" size={16} color="#A07878" />
              </View>
            </Field>

            <Field label="Veterinario/a">
              <Input
                value={form.veterinarian}
                onChangeText={(v) => setField('veterinarian', v)}
                placeholder="Ej: Dra. Ríos..."
                maxLength={100}
              />
            </Field>

            <Field
              label={form.status === 'pending' ? 'Resultado resumido (opcional)' : 'Resultado resumido'}
              error={errors.resultSummary}
            >
              <Input
                value={form.resultSummary}
                onChangeText={(v) => setField('resultSummary', v)}
                placeholder="Ej: Normal, Displasia leve, Negativo..."
                maxLength={100}
              />
            </Field>

            <Field label="Estado">
              <Segmented
                options={(Object.keys(STATUS_LABELS) as MedicalTestStatus[]).map((v) => ({
                  value: v,
                  label: STATUS_LABELS[v],
                }))}
                value={form.status}
                onChange={(v) => setField('status', v)}
              />
            </Field>

            <Field label="Detalle del resultado">
              <Input
                value={form.resultDetail}
                onChangeText={(v) => setField('resultDetail', v)}
                placeholder="Descripción detallada, valores, observaciones del profesional..."
                multiline
                maxLength={2000}
                style={{ minHeight: 88, textAlignVertical: 'top' }}
              />
            </Field>

            {/* El archivo no está en el mockup, pero lo pide el TDD-0010 */}
            <Field label="Archivo (opcional)" error={errors.file}>
              <Pressable
                onPress={handlePickFile}
                className="flex-row items-center gap-2 rounded-[20px] border-[1.5px] border-dashed border-[#D9627A] bg-[#FDF5F0] px-3.5 py-2.5 active:opacity-75"
              >
                <Ionicons name="attach-outline" size={18} color="#D9627A" />
                <Text
                  className={`flex-1 text-sm font-semibold ${
                    currentFileName ? 'text-[#3D2020]' : 'text-[#C09898]'
                  }`}
                  numberOfLines={1}
                >
                  {currentFileName ?? 'PDF, JPG o PNG (máx. 10 MB)'}
                </Text>
                {currentFileName && <Text className="text-xs font-bold text-[#D9627A]">Cambiar</Text>}
              </Pressable>
            </Field>

            {errors.general && (
              <Text className="text-center text-xs font-semibold text-[#B92020]">{errors.general}</Text>
            )}

            <Pressable
              onPress={handleSubmit}
              disabled={submitting}
              className="items-center rounded-3xl bg-[#D9627A] p-3.5 active:opacity-90"
            >
              {submitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-sm font-extrabold text-white">Guardar estudio</Text>
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

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View className="flex-row gap-2">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            className={`flex-1 items-center justify-center rounded-[20px] p-2.5 active:opacity-80 ${
              active ? 'bg-[#D9627A]' : 'border-[1.5px] border-[#F0DDD5] bg-[#FDF5F0]'
            }`}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
          >
            <Text className={`text-xs font-bold ${active ? 'text-white' : 'text-[#A07878]'}`}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
