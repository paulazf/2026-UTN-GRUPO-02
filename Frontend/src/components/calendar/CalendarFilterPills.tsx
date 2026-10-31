import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Pet } from '../../types/pet';
import { CalendarEntityType } from '../../types/calendar';

interface CalendarFilterPillsProps {
  pets: Pet[];
  selectedPetId: number | null;
  onSelectPet: (petId: number | null) => void;
  selectedEntityType: CalendarEntityType | null;
  onSelectEntityType: (type: CalendarEntityType | null) => void;
}

interface EntityOption {
  label: string;
  value: CalendarEntityType | null;
  iconFamily?: 'Ionicons' | 'MaterialCommunityIcons';
  icon?: string;
}

const ENTITY_OPTIONS: EntityOption[] = [
  { label: 'Todos', value: null },
  { label: 'Turnos', value: 'APPOINTMENT', iconFamily: 'Ionicons', icon: 'calendar-outline' },
  { label: 'Vacunas', value: 'VACCINE', iconFamily: 'MaterialCommunityIcons', icon: 'needle' },
  { label: 'Medicaciones', value: 'MEDICATION', iconFamily: 'Ionicons', icon: 'medkit-outline' },
];

export default function CalendarFilterPills({
  pets,
  selectedPetId,
  onSelectPet,
  selectedEntityType,
  onSelectEntityType,
}: CalendarFilterPillsProps) {
  return (
    <View className="pt-2 pb-1">
      {/* 1. Filtro por Mascota */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
        className="flex-row"
      >
        <Pressable
          onPress={() => onSelectPet(null)}
          className="px-4 py-2 rounded-full flex-row items-center justify-center"
          style={{
            backgroundColor: selectedPetId === null ? '#FFFFFF' : 'rgba(255, 255, 255, 0.25)',
            borderWidth: 1,
            borderColor: selectedPetId === null ? 'transparent' : 'rgba(255, 255, 255, 0.4)',
          }}
        >
          <Text
            className="text-sm"
            style={{
              color: selectedPetId === null ? '#DE6B80' : '#FFFFFF',
              fontWeight: selectedPetId === null ? '700' : '500',
            }}
          >
            Todas
          </Text>
        </Pressable>

        {pets.map((pet) => {
          const isSelected = selectedPetId === pet.id;
          const isCat = pet.breed?.species === 'CAT';
          return (
            <Pressable
              key={pet.id}
              onPress={() => onSelectPet(pet.id)}
              className="px-3.5 py-2 rounded-full flex-row items-center gap-1.5"
              style={{
                backgroundColor: isSelected ? '#FFFFFF' : 'rgba(255, 255, 255, 0.25)',
                borderWidth: 1,
                borderColor: isSelected ? 'transparent' : 'rgba(255, 255, 255, 0.4)',
              }}
            >
              <Ionicons
                name={isCat ? 'paw' : 'paw-outline'}
                size={14}
                color={isSelected ? '#DE6B80' : '#FFFFFF'}
              />
              <Text
                className="text-sm"
                style={{
                  color: isSelected ? '#DE6B80' : '#FFFFFF',
                  fontWeight: isSelected ? '700' : '500',
                }}
              >
                {pet.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* 2. Filtro por Tipo de Entidad */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
        className="flex-row mt-3"
      >
        {ENTITY_OPTIONS.map((opt) => {
          const isSelected = selectedEntityType === opt.value;
          return (
            <Pressable
              key={opt.label}
              onPress={() => onSelectEntityType(opt.value)}
              className={`py-2 rounded-full flex-row items-center justify-center ${
                opt.icon ? 'px-3.5 gap-1.5' : 'px-4'
              }`}
              style={{
                backgroundColor: isSelected ? '#FFFFFF' : 'rgba(255, 255, 255, 0.25)',
                borderWidth: 1,
                borderColor: isSelected ? 'transparent' : 'rgba(255, 255, 255, 0.4)',
              }}
            >
              {opt.icon ? (
                opt.iconFamily === 'MaterialCommunityIcons' ? (
                  <MaterialCommunityIcons
                    name={opt.icon as any}
                    size={14}
                    color={isSelected ? '#DE6B80' : '#FFFFFF'}
                  />
                ) : (
                  <Ionicons
                    name={opt.icon as any}
                    size={14}
                    color={isSelected ? '#DE6B80' : '#FFFFFF'}
                  />
                )
              ) : null}
              <Text
                className="text-sm"
                style={{
                  color: isSelected ? '#DE6B80' : '#FFFFFF',
                  fontWeight: isSelected ? '700' : '500',
                }}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
