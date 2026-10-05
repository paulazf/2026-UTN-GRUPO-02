import * as DocumentPicker from 'expo-document-picker'
import { useEffect, useState } from 'react'
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
} from 'react-native'
import { ApiError, createMedicalTest, updateMedicalTest } from '../../services/medicalTests'
import {
  STATUS_LABELS,
  TYPE_LABELS,
  type MedicalTest,
  type MedicalTestInput,
  type MedicalTestStatus,
  type MedicalTestType,
  type PickedFile,
} from '../../types/medicalTest'
import { displayToIso, isoToDisplay, maskDate, todayIso } from '../../utils/dates'
import { colors } from './theme'

const MAX_SIZE = 10 * 1024 * 1024
const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png']

interface Props {
  visible: boolean
  petId: number
  /** Si viene, el formulario edita ese estudio (TDD-0012). Si no, crea uno (TDD-0010). */
  editing?: MedicalTest | null
  onClose: () => void
  onSaved: (test: MedicalTest) => void
}

interface FormState {
  name: string
  type: MedicalTestType
  date: string // dd/mm/aaaa
  veterinarian: string
  resultSummary: string
  status: MedicalTestStatus
  resultDetail: string
  file: PickedFile | null
}

type Errors = Partial<Record<keyof FormState | 'general', string>>

function initialState(test?: MedicalTest | null): FormState {
  return {
    name: test?.name ?? '',
    type: test?.type ?? 'laboratory',
    date: test ? isoToDisplay(test.date) : '',
    veterinarian: test?.veterinarian ?? '',
    resultSummary: test?.resultSummary ?? '',
    status: test?.status ?? 'normal',
    resultDetail: test?.resultDetail ?? '',
    file: null,
  }
}

function validate(form: FormState): Errors {
  const errors: Errors = {}
  if (!form.name.trim()) errors.name = 'Ingresá el nombre del estudio.'
  const iso = displayToIso(form.date)
  if (!iso) errors.date = 'Ingresá una fecha válida (dd/mm/aaaa).'
  else if (iso > todayIso()) errors.date = 'La fecha no puede ser futura.'
  if (form.status !== 'pending' && !form.resultSummary.trim()) {
    errors.resultSummary = 'Si el estudio tiene resultado, completá el resumen.'
  }
  return errors
}

export default function MedicalTestFormSheet({ visible, petId, editing, onClose, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(initialState(editing))
  const [errors, setErrors] = useState<Errors>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (visible) {
      setForm(initialState(editing))
      setErrors({})
    }
  }, [visible, editing])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  async function pickFile() {
    const result = await DocumentPicker.getDocumentAsync({ type: ALLOWED_MIME, copyToCacheDirectory: true })
    if (result.canceled) return
    const asset = result.assets[0]
    const mimeType = asset.mimeType ?? ''
    if (!ALLOWED_MIME.includes(mimeType)) {
      setErrors((prev) => ({ ...prev, file: 'Solo se aceptan PDF, JPG o PNG.' }))
      return
    }
    if (asset.size !== undefined && asset.size > MAX_SIZE) {
      setErrors((prev) => ({ ...prev, file: 'El archivo supera los 10 MB.' }))
      return
    }
    set('file', { uri: asset.uri, name: asset.name, mimeType, size: asset.size })
  }

  async function save() {
    const found = validate(form)
    if (Object.keys(found).length) {
      setErrors(found)
      return
    }

    const values: MedicalTestInput = {
      name: form.name.trim(),
      type: form.type,
      date: displayToIso(form.date)!,
      veterinarian: form.veterinarian.trim(),
      status: form.status,
      resultSummary: form.resultSummary.trim(),
      resultDetail: form.resultDetail.trim(),
      file: form.file ?? undefined,
    }

    setSaving(true)
    try {
      let saved: MedicalTest
      if (editing) {
        // PATCH solo con lo que cambió.
        const changes: MedicalTestInput = {}
        for (const key of Object.keys(values) as (keyof MedicalTestInput)[]) {
          if (key === 'file') continue
          if (values[key] !== editing[key as keyof MedicalTest]) {
            ;(changes as Record<string, unknown>)[key] = values[key]
          }
        }
        if (values.file) changes.file = values.file
        saved = Object.keys(changes).length ? await updateMedicalTest(editing.idMedicalTest, changes) : editing
      } else {
        saved = await createMedicalTest({ ...values, idPet: petId })
      }
      onSaved(saved)
    } catch (error) {
      if (error instanceof ApiError) {
        const fieldErrors: Errors = { general: error.message }
        for (const [field, messages] of Object.entries(error.fields)) {
          if (field in form) fieldErrors[field as keyof FormState] = messages[0]
        }
        setErrors(fieldErrors)
      } else {
        setErrors({ general: 'Ocurrió un error. Probá de nuevo.' })
      }
    } finally {
      setSaving(false)
    }
  }

  const currentFileName = form.file?.name ?? (editing?.file ? decodeURIComponent(editing.file.split('/').pop() ?? '') : null)

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end"
        style={{ backgroundColor: 'rgba(59,31,37,0.45)' }}
      >
        <View className="max-h-[92%] rounded-t-[32px] bg-white">
          <View className="items-center pt-3">
            <View className="h-1 w-10 rounded-full" style={{ backgroundColor: colors.border }} />
          </View>
          <View className="flex-row items-center justify-between border-b px-5 pb-4 pt-3" style={{ borderColor: colors.border }}>
            <Text className="text-xl font-bold" style={{ color: colors.text }}>
              {editing ? (editing.status === 'pending' ? 'Cargar resultado' : 'Editar estudio') : 'Subir estudio'}
            </Text>
            <Pressable
              onPress={onClose}
              className="h-9 w-9 items-center justify-center rounded-full"
              style={{ backgroundColor: colors.primarySoft }}
              accessibilityLabel="Cerrar"
            >
              <Text style={{ color: colors.primary }}>✕</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerClassName="px-5 pb-8" keyboardShouldPersistTaps="handled">
            <Field label="Nombre del estudio" error={errors.name}>
              <Input value={form.name} onChangeText={(v) => set('name', v)} placeholder="Ej: Hemograma, Ecografía abdominal..." maxLength={100} />
            </Field>

            <Field label="Tipo">
              <Segmented
                options={(Object.keys(TYPE_LABELS) as MedicalTestType[]).map((v) => ({ value: v, label: TYPE_LABELS[v] }))}
                value={form.type}
                onChange={(v) => set('type', v)}
              />
            </Field>

            <Field label="Fecha" error={errors.date}>
              <Input value={form.date} onChangeText={(v) => set('date', maskDate(v))} placeholder="dd/mm/aaaa" keyboardType="number-pad" maxLength={10} />
            </Field>

            <Field label="Veterinario/a">
              <Input value={form.veterinarian} onChangeText={(v) => set('veterinarian', v)} placeholder="Ej: Dra. Ríos..." maxLength={100} />
            </Field>

            <Field label="Estado">
              <Segmented
                options={(Object.keys(STATUS_LABELS) as MedicalTestStatus[]).map((v) => ({ value: v, label: STATUS_LABELS[v] }))}
                value={form.status}
                onChange={(v) => set('status', v)}
              />
            </Field>

            <Field label={form.status === 'pending' ? 'Resultado resumido (opcional)' : 'Resultado resumido'} error={errors.resultSummary}>
              <Input value={form.resultSummary} onChangeText={(v) => set('resultSummary', v)} placeholder="Ej: Normal, Displasia leve, Negativo..." maxLength={100} />
            </Field>

            <Field label="Detalle del resultado">
              <Input
                value={form.resultDetail}
                onChangeText={(v) => set('resultDetail', v)}
                placeholder="Descripción detallada, valores, observaciones del profesional..."
                multiline
                maxLength={2000}
                style={{ minHeight: 90, textAlignVertical: 'top' }}
              />
            </Field>

            <Field label="Archivo (opcional)" error={errors.file}>
              <Pressable
                onPress={pickFile}
                className="flex-row items-center rounded-2xl border border-dashed px-4 py-3.5"
                style={{ borderColor: colors.primary, backgroundColor: colors.background }}
              >
                <Text className="text-base">📎</Text>
                <Text className="ml-2 flex-1 text-sm" style={{ color: currentFileName ? colors.text : colors.muted }} numberOfLines={1}>
                  {currentFileName ?? 'Elegir PDF o imagen (máx. 10 MB)'}
                </Text>
                {currentFileName && (
                  <Text className="text-xs font-semibold" style={{ color: colors.primary }}>
                    Cambiar
                  </Text>
                )}
              </Pressable>
            </Field>

            {errors.general && (
              <Text className="mt-4 text-center text-sm" style={{ color: colors.alteredText }}>
                {errors.general}
              </Text>
            )}

            <Pressable
              onPress={save}
              disabled={saving}
              className="mt-6 items-center rounded-full py-4 active:opacity-80"
              style={{ backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text className="text-base font-bold text-white">Guardar estudio</Text>}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <View className="mt-5">
      <Text className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: colors.muted }}>
        {label}
      </Text>
      {children}
      {error && (
        <Text className="mt-1 text-xs" style={{ color: colors.alteredText }}>
          {error}
        </Text>
      )}
    </View>
  )
}

function Input(props: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      placeholderTextColor={colors.muted}
      {...props}
      className="rounded-2xl border px-4 py-3.5 text-base"
      style={[{ borderColor: colors.border, backgroundColor: colors.background, color: colors.text }, props.style]}
    />
  )
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <View className="flex-row gap-2">
      {options.map((option) => {
        const active = option.value === value
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            className="flex-1 items-center rounded-full border py-3"
            style={{
              backgroundColor: active ? colors.primary : colors.background,
              borderColor: active ? colors.primary : colors.border,
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
          >
            <Text className="text-sm font-semibold" style={{ color: active ? '#fff' : colors.text }}>
              {option.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
