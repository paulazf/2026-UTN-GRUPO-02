# Notificaciones en PetLife

Guía rápida para sumar avisos (vacunas, turnos, alimentación...). Diseño completo en `docs/TDDs/TDD_0047_aviso_medicacion.md`.

## Cómo funciona
Son **notificaciones locales**: el teléfono las programa con fecha y hora. Funcionan igual en iOS y Android, en Expo Go y en los builds, sin servidor de push.

Todo vive en `Frontend/src/notifications/`. Cada tipo de aviso es un **grupo** con:
1. Una **fuente**, que trae los datos del backend.
2. Un **planner**, función pura que devuelve la lista de avisos (`Reminder[]`).

`syncReminders()` borra los avisos del grupo y programa los nuevos. Se llama sola al iniciar sesión y al volver a la app; vos la llamás después de crear, editar o eliminar algo.

## Sumar un aviso nuevo (ejemplo: vacunas)

**1. El grupo** en `types.ts`:
```ts
export type ReminderGroup = 'medication' | 'vaccine';
```

**2. El canal de Android** en `channels.ts`:
```ts
vaccine: {
  name: 'Vacunas',
  description: 'Avisos de las próximas dosis de vacunas.',
  importance: AndroidImportance.DEFAULT,
},
```

**3. El planner** en `planners/vaccinePlanner.ts` (sin imports de React Native, así se puede testear):
```ts
import type { VaccinePet } from '../../types/vaccinePet';
import type { Reminder } from '../types';

export function planVaccineReminders(vaccines: VaccinePet[], now: Date): Reminder[] {
  return vaccines
    .map((v): Reminder => {
      const [y, m, d] = v.expirationDate.split('-').map(Number);
      return {
        key: `vaccine-${v.idVaccinePet}`,
        group: 'vaccine',
        title: `Vacuna de ${v.petName}`,
        body: `La ${v.vaccineName} vence en una semana`,
        date: new Date(y, m - 1, d - 7, 10, 0), // 7 días antes, a las 10:00
        data: { petId: v.idPet },
      };
    })
    .filter((r) => r.date > now);
}
```

**4. La fuente** en `sources.ts` (la suma de los `limit` no debe pasar de 60, límite de iOS):
```ts
{
  group: 'vaccine',
  limit: 10,
  load: async (now) => planVaccineReminders(await fetchVaccinesToRemind(), now), // endpoint a crear, como /medication-pets/reminders/
},
```

**5. Refrescar** después de guardar o eliminar:
```ts
import { syncReminders } from '../../notifications';
syncReminders(['vaccine']);
```

**6. Tests** en `Frontend/tests/vaccinePlanner.test.ts` (copiar el de medicación) y correr:
```bash
npm run test:notifications
```

## Reglas
- `key` única y estable por aviso (ej. `vaccine-12`): si cambia el dato, el aviso se reemplaza.
- No usar `expo-notifications` fuera de `notificationService.ts`.
- Para probar rápido: crear el dato con fecha 2 minutos más tarde y cerrar la app.
