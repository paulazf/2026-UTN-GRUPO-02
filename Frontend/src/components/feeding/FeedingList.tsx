import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Feeding } from '../../types/feeding';
import { deleteFeeding, fetchFeedings } from '../../services/feedingService';
import FeedingCard from './FeedingCard';
import FeedingFormModal from './FeedingFormModal';

interface FeedingListProps {
  petId: number;
}

export default function FeedingList({ petId }: FeedingListProps) {
  const [feedings, setFeedings] = useState<Feeding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Feeding | null>(null);

  const loadFeedings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setFeedings(await fetchFeedings(petId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la alimentación.');
    } finally {
      setLoading(false);
    }
  }, [petId]);

  useEffect(() => {
    loadFeedings();
  }, [loadFeedings]);

  const currentId = useMemo(
    () =>
      feedings.reduce<Feeding | null>(
        (latest, feeding) =>
          !latest ||
          feeding.sinceDate > latest.sinceDate ||
          (feeding.sinceDate === latest.sinceDate && feeding.idFeeding > latest.idFeeding)
            ? feeding
            : latest,
        null,
      )?.idFeeding ?? null,
    [feedings],
  );

  const openCreate = () => {
    setEditing(null);
    setIsModalOpen(true);
  };

  const openEdit = (feeding: Feeding) => {
    setEditing(feeding);
    setIsModalOpen(true);
  };

  const handleSaved = (saved: Feeding) => {
    setIsModalOpen(false);
    setEditing(null);
    setFeedings((previous) =>
      [saved, ...previous.filter((item) => item.idFeeding !== saved.idFeeding)].sort(
        (a, b) => b.sinceDate.localeCompare(a.sinceDate) || b.idFeeding - a.idFeeding,
      ),
    );
  };

  const handleDelete = (feeding: Feeding) => {
    Alert.alert(
      'Eliminar alimentación',
      `¿Eliminar "${feeding.food}" de la historia clínica?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFeeding(feeding.idFeeding);
              setFeedings((previous) =>
                previous.filter((item) => item.idFeeding !== feeding.idFeeding),
              );
            } catch (err) {
              Alert.alert(
                'No se pudo eliminar',
                err instanceof Error ? err.message : 'Probá de nuevo.',
              );
            }
          },
        },
      ],
    );
  };

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-bold text-[#3D2020]">
          {feedings.length} {feedings.length === 1 ? 'dieta registrada' : 'dietas registradas'}
        </Text>
        <Pressable
          onPress={openCreate}
          className="rounded-full bg-[#D9627A] px-3 py-1.5 active:opacity-90"
        >
          <Text className="text-xs font-bold text-white">+ Registrar</Text>
        </Pressable>
      </View>

      {loading ? (
        <View className="items-center justify-center py-12">
          <ActivityIndicator size="large" color="#D9627A" />
          <Text className="mt-3 text-sm text-[#A07878]">Cargando alimentación...</Text>
        </View>
      ) : error ? (
        <View className="items-center rounded-3xl border border-[#F0DDD5] bg-white p-6">
          <Text className="text-center text-sm text-[#3D2020]">{error}</Text>
          <Pressable onPress={loadFeedings} className="mt-3 active:opacity-70">
            <Text className="text-sm font-bold text-[#D9627A]">Reintentar</Text>
          </Pressable>
        </View>
      ) : feedings.length === 0 ? (
        <Pressable
          onPress={openCreate}
          className="items-center rounded-3xl border-2 border-dashed border-[#D9627A] bg-[#FDF0F3] p-8 active:opacity-75"
        >
          <Ionicons name="restaurant-outline" size={28} color="#D9627A" />
          <Text className="mt-2 text-sm font-extrabold text-[#D9627A]">
            Todavía no hay alimentación registrada
          </Text>
          <Text className="mt-1 text-center text-xs font-medium text-[#A07878]">
            Tocá acá para agregar la primera dieta.
          </Text>
        </Pressable>
      ) : (
        feedings.map((feeding) => (
          <FeedingCard
            key={feeding.idFeeding}
            feeding={feeding}
            isCurrent={feeding.idFeeding === currentId}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        ))
      )}

      <FeedingFormModal
        visible={isModalOpen}
        petId={petId}
        editing={editing}
        onClose={() => {
          setIsModalOpen(false);
          setEditing(null);
        }}
        onSaved={handleSaved}
      />
    </View>
  );
}
