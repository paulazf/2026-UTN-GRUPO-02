import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { MedicalTest, MedicalTestFile, MedicalTestType, TYPE_SECTIONS } from '../../types/medicalTest';
import { deleteMedicalTest, fetchMedicalTests } from '../../services/medicalTestService';
import { isoToDisplay } from '../../utils/dates';
import MedicalTestCard from './MedicalTestCard';
import MedicalTestFormModal from './MedicalTestFormModal';
import ImagePreviewModal from './ImagePreviewModal';
import PdfPreviewModal from './PdfPreviewModal';

const SECTION_ORDER: MedicalTestType[] = ['laboratory', 'imaging', 'other'];

const isImageFile = (file: MedicalTestFile) => /\.(jpe?g|png)$/i.test(file.name);

interface MedicalTestListProps {
  petId: number;
}

// Contenido de la pestaña "Estudios" del detalle de mascota (va dentro del ScrollView de la pantalla)
export default function MedicalTestList({ petId }: MedicalTestListProps) {
  const [tests, setTests] = useState<MedicalTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<MedicalTest | null>(null);
  const [preview, setPreview] = useState<{ images: MedicalTestFile[]; index: number } | null>(null);
  const [pdfPreview, setPdfPreview] = useState<MedicalTestFile | null>(null);

  const loadTests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchMedicalTests(petId);
      setTests(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los estudios.');
    } finally {
      setLoading(false);
    }
  }, [petId]);

  useEffect(() => {
    loadTests();
  }, [loadTests]);

  const pending = useMemo(() => tests.filter((t) => t.status === 'pending'), [tests]);
  const sections = useMemo(
    () =>
      SECTION_ORDER.map((type) => ({ type, items: tests.filter((t) => t.type === type) })).filter(
        (section) => section.items.length > 0,
      ),
    [tests],
  );

  const handleOpenCreate = () => {
    setEditing(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (test: MedicalTest) => {
    setEditing(test);
    setIsModalOpen(true);
  };

  const handleSaved = (saved: MedicalTest) => {
    setIsModalOpen(false);
    setTests((prev) =>
      [saved, ...prev.filter((t) => t.idMedicalTest !== saved.idMedicalTest)].sort(
        (a, b) => b.date.localeCompare(a.date) || b.idMedicalTest - a.idMedicalTest,
      ),
    );
  };

  const handleDelete = (test: MedicalTest) => {
    Alert.alert('Eliminar estudio', `¿Eliminar "${test.name}" de la historia clínica?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMedicalTest(test.idMedicalTest);
            setTests((prev) => prev.filter((t) => t.idMedicalTest !== test.idMedicalTest));
          } catch (err) {
            Alert.alert('No se pudo eliminar', err instanceof Error ? err.message : 'Probá de nuevo.');
          }
        },
      },
    ]);
  };

  // Las imágenes y los PDF se ven dentro de la app, igual en iOS y Android
  const handleOpenFile = (test: MedicalTest, file: MedicalTestFile) => {
    if (isImageFile(file)) {
      const images = test.files.filter(isImageFile);
      setPreview({ images, index: images.findIndex((f) => f.idMedicalTestFile === file.idMedicalTestFile) });
    } else {
      setPdfPreview(file);
    }
  };

  // Para compartir hay que bajar el archivo al cache del celular primero
  const handleShare = async (file: MedicalTestFile) => {
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Error', 'Compartir no está disponible en este dispositivo.');
        return;
      }
      const folder = new Directory(Paths.cache, `medical-test-file-${file.idMedicalTestFile}`);
      if (folder.exists) folder.delete();
      folder.create();
      const downloaded = await File.downloadFileAsync(file.url, folder);
      await Sharing.shareAsync(downloaded.uri, { dialogTitle: file.name });
    } catch {
      Alert.alert('Error', 'No se pudo compartir el archivo.');
    }
  };

  return (
    <View className="gap-3">
      {/* Encabezado de la pestaña */}
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-bold text-[#3D2020]">
          {tests.length} {tests.length === 1 ? 'estudio' : 'estudios'}
        </Text>
        <Pressable
          onPress={handleOpenCreate}
          className="rounded-full bg-[#D9627A] px-3 py-1.5 active:opacity-90"
        >
          <Text className="text-xs font-bold text-white">+ Subir</Text>
        </Pressable>
      </View>

      {loading ? (
        <View className="items-center justify-center py-12">
          <ActivityIndicator size="large" color="#D9627A" />
          <Text className="mt-3 text-sm text-[#A07878]">Cargando estudios...</Text>
        </View>
      ) : error ? (
        <View className="items-center rounded-3xl border border-[#F0DDD5] bg-white p-6">
          <Text className="text-center text-sm text-[#3D2020]">{error}</Text>
          <Pressable onPress={loadTests} className="mt-3 active:opacity-70">
            <Text className="text-sm font-bold text-[#D9627A]">Reintentar</Text>
          </Pressable>
        </View>
      ) : tests.length === 0 ? (
        <Pressable
          onPress={handleOpenCreate}
          className="items-center rounded-3xl border-2 border-dashed border-[#D9627A] bg-[#FDF0F3] p-8 active:opacity-75"
        >
          <Ionicons name="document-attach-outline" size={28} color="#D9627A" />
          <Text className="mt-2 text-sm font-extrabold text-[#D9627A]">Todavía no hay estudios</Text>
          <Text className="mt-1 text-center text-xs font-medium text-[#A07878]">
            Tocá acá para subir el primero.
          </Text>
        </Pressable>
      ) : (
        <>
          {/* Avisos de resultados pendientes (se tocan para cargar el resultado) */}
          {pending.map((test) => (
            <Pressable
              key={`pending-${test.idMedicalTest}`}
              onPress={() => handleOpenEdit(test)}
              className="flex-row items-center gap-3 rounded-3xl border border-[#F5C98A] bg-[#FEF0E2] p-3 active:opacity-80"
            >
              <Ionicons name="hourglass-outline" size={20} color="#C16A10" />
              <View className="flex-1">
                <Text className="text-xs font-extrabold text-[#C16A10]">Resultado pendiente</Text>
                <Text className="text-xs font-medium text-[#C16A10]" numberOfLines={1}>
                  {test.name} · {isoToDisplay(test.date)}
                </Text>
              </View>
            </Pressable>
          ))}

          {/* Estudios agrupados por tipo */}
          {sections.map((section) => (
            <View key={section.type} className="gap-2">
              <Text className="text-[10px] font-bold uppercase tracking-[0.5px] text-[#A07878]">
                {TYPE_SECTIONS[section.type]}
              </Text>
              {section.items.map((test) => (
                <MedicalTestCard
                  key={test.idMedicalTest}
                  test={test}
                  onOpenFile={handleOpenFile}
                  onShare={handleShare}
                  onEdit={handleOpenEdit}
                  onDelete={handleDelete}
                />
              ))}
            </View>
          ))}
        </>
      )}

      <ImagePreviewModal
        visible={preview !== null}
        images={preview?.images ?? []}
        initialIndex={preview?.index ?? 0}
        onClose={() => setPreview(null)}
        onShare={handleShare}
      />

      <PdfPreviewModal file={pdfPreview} onClose={() => setPdfPreview(null)} onShare={handleShare} />

      <MedicalTestFormModal
        visible={isModalOpen}
        petId={petId}
        editing={editing}
        onClose={() => setIsModalOpen(false)}
        onSaved={handleSaved}
      />
    </View>
  );
}
