import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PetSpecies } from '../../types/pet';
import { VaccinePet } from '../../types/vaccinePet';
import { deleteVaccinePet, fetchVaccinePets } from '../../services/vaccinePetService';
import { isoToDisplay } from '../../utils/dates';
import VaccinePetCard from './VaccinePetCard';
import CreateVaccinePetModal, { VaccineModalMode } from './CreateVaccinePetModal';

interface VaccinePetListProps {
  petId: number;
  species: PetSpecies;
}

export default function VaccinePetList({ petId, species }: VaccinePetListProps) {
  const [items, setItems] = useState<VaccinePet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [mode, setMode] = useState<VaccineModalMode>({ kind: 'create' });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setItems(await fetchVaccinePets(petId));
    } catch (err: any) {
      setError(err?.message || 'No se pudieron cargar las vacunas de la mascota.');
    } finally {
      setLoading(false);
    }
  }, [petId]);

  useEffect(() => {
    load();
  }, [load]);

  const openModal = (next: VaccineModalMode) => {
    setMode(next);
    setModalVisible(true);
  };

  const handleSaved = () => {
    setModalVisible(false);
    // se recarga para que la dosis anterior desaparezca si fue un refuerzo y los estados se recalculen
    load();
  };

  const confirmDelete = (item: VaccinePet) => {
    const detail = item.doseNumber ? `, ${item.doseNumber}ª dosis` : '';
    Alert.alert('Eliminar registro', `¿Eliminar ${item.vaccineName}${detail} del ${isoToDisplay(item.applicationDate)}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteVaccinePet(item.idVaccinePet);
            load();
          } catch (err: any) {
            Alert.alert('Error', err?.message || 'No se pudo eliminar.');
          }
        },
      },
    ]);
  };

  const vaccines = items.filter((i) => i.vaccineType === 'VACCINE');
  const antiparasitics = items.filter((i) => i.vaccineType !== 'VACCINE');

  const countText =
    `${vaccines.length} ${vaccines.length === 1 ? 'vacuna registrada' : 'vacunas registradas'}` +
    (antiparasitics.length ? ` · ${antiparasitics.length} antiparasitario${antiparasitics.length === 1 ? '' : 's'}` : '');

  const renderSection = (title: string, list: VaccinePet[]) =>
    list.length > 0 && (
      <View className="mb-2">
        <Text className="mb-2 text-xs font-bold tracking-wider text-[#A07878]">{title}</Text>
        {list.map((item) => (
          <VaccinePetCard
            key={item.idVaccinePet}
            item={item}
            onBooster={(i) => openModal({ kind: 'booster', item: i })}
            onEdit={(i) => openModal({ kind: 'edit', item: i })}
            onDelete={confirmDelete}
          />
        ))}
      </View>
    );

  return (
    <View className="flex-1">
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="flex-1 pr-2 text-base font-bold text-[#2B1D1D]">{countText}</Text>
        <Pressable
          onPress={() => openModal({ kind: 'create' })}
          className="rounded-full bg-[#D9627A] px-4 py-2 shadow-xs active:opacity-85"
        >
          <Text className="text-xs font-bold text-white">+ Agregar</Text>
        </Pressable>
      </View>

      {loading ? (
        <View className="items-center py-12">
          <ActivityIndicator size="large" color="#DE6B80" />
          <Text className="mt-3 text-xs text-[#8C7B77]">Cargando vacunas...</Text>
        </View>
      ) : error ? (
        <View className="items-center rounded-2xl border border-red-200 bg-red-50 p-6">
          <Text className="mb-3 text-center text-sm font-semibold text-red-600">{error}</Text>
          <Pressable onPress={load} className="rounded-xl bg-[#FCECEF] px-4 py-2 active:opacity-80">
            <Text className="text-xs font-bold text-[#DE6B80]">Reintentar</Text>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <Pressable
          onPress={() => openModal({ kind: 'create' })}
          className="items-center rounded-3xl border-2 border-dashed border-[#D9627A] bg-[#FDF0F3] p-8 active:opacity-75"
        >
          <MaterialCommunityIcons name="needle" size={28} color="#D9627A" />
          <Text className="mt-2 text-sm font-extrabold text-[#D9627A]">Todavía no hay vacunas</Text>
          <Text className="mt-1 text-center text-xs font-medium text-[#A07878]">
            Tocá acá para registrar la primera vacuna o pipeta.
          </Text>
        </Pressable>
      ) : (
        <>
          {renderSection('VACUNAS', vaccines)}
          {renderSection('ANTIPARASITARIOS', antiparasitics)}
          <Text className="mt-1 text-center text-[11px] text-[#B5A7A3]">
            Tocá una tarjeta para registrar un refuerzo, editarla o eliminarla.
          </Text>
        </>
      )}

      <CreateVaccinePetModal
        visible={modalVisible}
        petId={petId}
        species={species}
        mode={mode}
        onClose={() => setModalVisible(false)}
        onSaved={handleSaved}
      />
    </View>
  );
}
