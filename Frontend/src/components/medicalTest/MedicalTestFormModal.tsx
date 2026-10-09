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
import * as ImagePicker from 'expo-image-picker';
import {
  MedicalTest,
  MedicalTestFile,
  MedicalTestPayload,
  MedicalTestStatus,
  MedicalTestType,
  PickedFile,
  STATUS_LABELS,
  TYPE_LABELS,
} from '../../types/medicalTest';
import { ApiError, createMedicalTest, updateMedicalTest } from '../../services/medicalTestService';
import { displayToIso, isoToDisplay, maskDate, todayIso } from '../../utils/dates';

// Mismos límites que el back
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB por archivo
const MAX_FILES = 10; // archivos por estudio
const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png'];
const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
};
const EXTENSION_BY_MIME: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

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
  keptFiles: MedicalTestFile[]; // archivos ya subidos que se conservan
  newFiles: PickedFile[]; // archivos elegidos, todavía no subidos
}

type FormErrors = Partial<Record<keyof FormState | 'files' | 'general', string>>;

function initialState(test?: MedicalTest | null): FormState {
  return {
    name: test?.name ?? '',
    type: test?.type ?? 'laboratory',
    date: test ? isoToDisplay(test.date) : '',
    veterinarian: test?.veterinarian ?? '',
    status: test?.status ?? 'normal',
    resultSummary: test?.resultSummary ?? '',
    resultDetail: test?.resultDetail ?? '',
    keptFiles: test?.files ?? [],
    newFiles: [],
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

// Arma el archivo a subir o devuelve el motivo por el que no se puede.
// Las fotos de iOS pueden venir como HEIC con mimeType vacío: se deduce por la extensión de la uri.
function toPickedFile(
  uri: string,
  originalName: string | null | undefined,
  mimeType: string | null | undefined,
  size: number | null | undefined,
): PickedFile | string {
  const uriExtension = uri.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
  const mime = mimeType && ALLOWED_MIME.includes(mimeType) ? mimeType : MIME_BY_EXTENSION[uriExtension];
  const baseName = (originalName || uri.split('/').pop() || 'archivo').replace(/\.[^.]+$/, '');
  if (!mime) return `${originalName ?? baseName}: solo se aceptan PDF, JPG o PNG.`;
  if (size && size > MAX_FILE_SIZE) return `${originalName ?? baseName}: supera los 10 MB.`;
  return {
    uri,
    name: `${baseName}.${EXTENSION_BY_MIME[mime]}`,
    mimeType: mime,
    size: size ?? undefined,
  };
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

  const remainingSlots = MAX_FILES - form.keptFiles.length - form.newFiles.length;

  const addPickedFiles = (results: (PickedFile | string)[]) => {
    const valid = results.filter((r): r is PickedFile => typeof r !== 'string');
    const rejected = results.filter((r): r is string => typeof r === 'string');
    const accepted = valid.slice(0, Math.max(remainingSlots, 0));
    if (valid.length > accepted.length) {
      rejected.push(`Se pueden adjuntar hasta ${MAX_FILES} archivos por estudio.`);
    }
    setForm((prev) => ({ ...prev, newFiles: [...prev.newFiles, ...accepted] }));
    setErrors((prev) => ({ ...prev, files: rejected.length ? rejected.join('\n') : undefined }));
  };

  const handlePickDocuments = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ALLOWED_MIME,
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    addPickedFiles(result.assets.map((a) => toPickedFile(a.uri, a.name, a.mimeType, a.size)));
  };

  const handlePickImages = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) {
      setErrors((prev) => ({ ...prev, files: 'Se necesita permiso para acceder a las fotos.' }));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: Math.max(remainingSlots, 1),
      quality: 0.8, // con quality < 1 iOS convierte las fotos HEIC a JPG
    });
    if (result.canceled) return;
    addPickedFiles(
      result.assets.map((a) => toPickedFile(a.uri, a.fileName, a.mimeType, a.fileSize)),
    );
  };

  const removeKeptFile = (id: number) => {
    setField(
      'keptFiles',
      form.keptFiles.filter((f) => f.idMedicalTestFile !== id),
    );
  };

  const removeNewFile = (index: number) => {
    setField(
      'newFiles',
      form.newFiles.filter((_, i) => i !== index),
    );
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
    };

    try {
      setSubmitting(true);
      let saved: MedicalTest;
      if (editing) {
        // PATCH solo con lo que cambió
        const changes: MedicalTestPayload = {};
        for (const key of Object.keys(values) as (keyof MedicalTestPayload)[]) {
          if (values[key] !== editing[key as keyof MedicalTest]) {
            (changes as Record<string, unknown>)[key] = values[key];
          }
        }
        const keptIds = new Set(form.keptFiles.map((f) => f.idMedicalTestFile));
        const removed = editing.files
          .filter((f) => !keptIds.has(f.idMedicalTestFile))
          .map((f) => f.idMedicalTestFile);
        if (removed.length) changes.removedFiles = removed;
        if (form.newFiles.length) changes.newFiles = form.newFiles;

        saved = Object.keys(changes).length
          ? await updateMedicalTest(editing.idMedicalTest, changes)
          : editing;
      } else {
        saved = await createMedicalTest({ ...values, idPet: petId, newFiles: form.newFiles });
      }
      onSaved(saved);
    } catch (err) {
      if (err instanceof ApiError) {
        // Los errores por campo del back se muestran debajo de cada input
        const fieldErrors: FormErrors = { general: err.message };
        for (const [field, messages] of Object.entries(err.fields)) {
          if (field === 'newFiles' || field === 'removedFiles') fieldErrors.files = messages[0];
          else if (field in form) fieldErrors[field as keyof FormState] = messages[0];
        }
        setErrors(fieldErrors);
      } else {
        setErrors({ general: 'Ocurrió un error. Probá de nuevo.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

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
            keyboardDismissMode="on-drag" // el teclado numérico de iOS no tiene botón para cerrarlo
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

            {/* Los archivos no están en el mockup, pero los pide el TDD-0010 */}
            <Field label={`Archivos (opcional · hasta ${MAX_FILES})`} error={errors.files}>
              {form.keptFiles.map((file) => (
                <AttachmentRow
                  key={`kept-${file.idMedicalTestFile}`}
                  name={file.name}
                  onRemove={() => removeKeptFile(file.idMedicalTestFile)}
                />
              ))}
              {form.newFiles.map((file, index) => (
                <AttachmentRow
                  key={`new-${index}-${file.uri}`}
                  name={file.name}
                  isNew
                  onRemove={() => removeNewFile(index)}
                />
              ))}

              {remainingSlots > 0 && (
                <View className="flex-row gap-2">
                  <PickButton icon="document-outline" label="Archivos" onPress={handlePickDocuments} />
                  <PickButton icon="images-outline" label="Galería" onPress={handlePickImages} />
                </View>
              )}
              <Text className="text-[10px] font-semibold text-[#C09898]">
                PDF, JPG o PNG · máx. 10 MB cada uno
              </Text>
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

function AttachmentRow({
  name,
  isNew = false,
  onRemove,
}: {
  name: string;
  isNew?: boolean;
  onRemove: () => void;
}) {
  const isPdf = name.toLowerCase().endsWith('.pdf');
  return (
    <View className="flex-row items-center gap-2 rounded-[20px] border-[1.5px] border-[#F0DDD5] bg-[#FDF5F0] px-3.5 py-2.5">
      <Ionicons name={isPdf ? 'document-text-outline' : 'image-outline'} size={18} color="#D9627A" />
      <Text className="flex-1 text-sm font-semibold text-[#3D2020]" numberOfLines={1}>
        {name}
      </Text>
      {isNew && <Text className="text-[10px] font-bold text-[#A07878]">Nuevo</Text>}
      <Pressable onPress={onRemove} hitSlop={8} accessibilityLabel={`Quitar ${name}`}>
        <Ionicons name="close-circle" size={20} color="#C09898" />
      </Pressable>
    </View>
  );
}

function PickButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 flex-row items-center justify-center gap-1.5 rounded-[20px] border-[1.5px] border-dashed border-[#D9627A] bg-[#FDF5F0] p-2.5 active:opacity-75"
    >
      <Ionicons name={icon} size={16} color="#D9627A" />
      <Text className="text-xs font-bold text-[#D9627A]">{label}</Text>
    </Pressable>
  );
}
