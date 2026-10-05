---
id: 0011
estado: Por implementar
autor: Thiago Perez
fecha: 03-10-2026
titulo: Consulta de Estudios Médicos
---

# TDD-0011: Consulta de Estudios Médicos

## Contexto de Negocio (PRD)

### Objetivo
- **Problema que resuelve:** Registrar estudios no sirve si después no se pueden encontrar rápido. El dueño necesita ver los estudios de cada mascota ordenados y agrupados, saber cuáles tienen el resultado pendiente, abrir el detalle y el archivo, y verlos también en el historial general junto con vacunas y turnos.
- **Resultado esperado:** Exponer el listado de estudios activos (por mascota o de todas las mascotas del usuario) y el detalle de un estudio, con los datos que necesitan las pantallas "Estudios" de cada mascota y "Historial".

### User Persona
- **Dueño de mascota (Owner):** Usuario que consulta la historia clínica de su(s) mascota(s), por ejemplo antes o durante una consulta veterinaria.

### User Story
**Como** dueño de una mascota, **quiero** ver la lista de estudios de mi mascota con su estado y resultado, y abrir el archivo de cada uno, **para que** pueda revisar su historia clínica o mostrársela al veterinario.

### Criterios de Aceptación
- **Escenario de éxito (Listado por mascota):**
  - `GET /api/v1/medical-test/?idPet={id}` con una mascota activa del usuario devuelve sus estudios con `isDeleted = false`, ordenados por `date` descendente, y `200 OK`. Si no tiene estudios, devuelve una lista vacía.
- **Escenario de éxito (Historial general):**
  - `GET /api/v1/medical-test/` sin `idPet` devuelve los estudios activos de **todas** las mascotas activas del usuario, ordenados por `date` descendente, incluyendo `petName`.
- **Escenario de éxito (Filtro por estado):**
  - `GET /api/v1/medical-test/?idPet={id}&status=pending` devuelve solo los estudios pendientes (aviso "Resultado pendiente").
- **Escenario de éxito (Detalle):**
  - `GET /api/v1/medical-test/{idMedicalTest}/` devuelve el estudio completo, incluida la URL del archivo si tiene.
- **Escenario de fallo (Mascota o estudio inexistente o ajeno):**
  - Si el `idPet` del filtro o el `idMedicalTest` no existen, están dados de baja o pertenecen a otro usuario, devuelve `404 Not Found`.
- **Escenario de fallo (Parámetros inválidos):**
  - Si `idPet` no es un número o `status` no es un valor permitido, devuelve `400 Bad Request`.

### Reglas de Negocio
- Nunca se devuelven estudios con `isDeleted = true` ni estudios de mascotas dadas de baja.
- Un usuario solo ve estudios de sus propias mascotas.
- La agrupación por tipo ("Laboratorio", "Imágenes", "Otros"), el contador ("4 estudios") y el aviso de pendientes los arma la app a partir del listado; el backend no devuelve grupos.

---

## Dependencias y Estimación

### Dependencias Identificadas y Resueltas
1. **Entidad `MedicalTest` (TDD-0010):** Modelo, serializer y configuración de media definidos.
2. **Autenticación de usuario (EP01 - CRUD Usuario, TDD-0001):** Para filtrar por dueño.

### Estimación
- **Estimación total:** **2 Story Points** (Escala Fibonacci).
- **Desglose:**
  - `get_queryset()` con filtros por dueño, mascota y estado, acciones `list` y `retrieve`: *1 SP*
  - Tests de visibilidad (propios, ajenos, eliminados) y orden: *1 SP*

---

## Diseño Técnico (RFC)

### Contrato de API (Django REST Framework)

#### Listado

- **Endpoint:** `GET /api/v1/medical-test/`
- **Query params:**

| Parámetro | Tipo | Obligatorio | Uso en la app |
| --- | --- | --- | --- |
| `idPet` | INT | No | Pestaña "Estudios" de una mascota y filtros "Luna" / "Beto" del Historial. Sin él: Historial "Todas". |
| `status` | `normal` \| `altered` \| `pending` | No | Aviso "Resultado pendiente". |

#### Response Body (`200 OK`)

```json
[
  {
    "idMedicalTest": 7,
    "idPet": 1,
    "petName": "Luna",
    "name": "Análisis de orina",
    "type": "laboratory",
    "date": "2026-09-10",
    "veterinarian": "Dra. Ríos",
    "status": "pending",
    "resultSummary": "",
    "resultDetail": "",
    "file": null,
    "isDeleted": false
  },
  {
    "idMedicalTest": 4,
    "idPet": 1,
    "petName": "Luna",
    "name": "Hemograma completo",
    "type": "laboratory",
    "date": "2026-08-12",
    "veterinarian": "Dra. Ríos",
    "status": "normal",
    "resultSummary": "Normal",
    "resultDetail": "Todos los parámetros dentro de valores de referencia. Hematocrito 38%, leucocitos 8.200/µL.",
    "file": "http://192.168.0.13:8000/media/medical_tests/pet_1/hemograma.pdf",
    "isDeleted": false
  }
]
```

#### Detalle

- **Endpoint:** `GET /api/v1/medical-test/{idMedicalTest}/`
- **Response Body (`200 OK`):** el mismo objeto que en el listado.

### Correspondencia con el mockup (Figma)

| Elemento de la pantalla | Dato de la API |
| --- | --- |
| Contador "4 estudios" | Cantidad de elementos de `GET ?idPet=` |
| Aviso "Resultado pendiente · Análisis de orina · 10/09/2026" | `GET ?idPet=&status=pending` (`name`, `date`) |
| Secciones "Laboratorio" / "Imágenes" | Agrupación en el cliente por `type` |
| Tarjeta: título, "12/08/2026 · Dra. Ríos" | `name`, `date`, `veterinarian` |
| Badge "Normal" / "Alterado" | `status` |
| Tarjeta expandida: "Resultado" | `resultDetail` |
| "Ver PDF" / "Compartir" | `file` (URL). Se ocultan si `file` es `null`. |
| Historial: "Estudio: Ecografía abdominal · Sin hallazgos · 12/08/2026 · Luna" | `name`, `resultSummary`, `date`, `petName` |

---

## Arquitectura y Flujo (Cliente-Servidor)

1. **Cliente (App móvil React Native / Expo)**:
   - Al abrir la pestaña "Estudios" de una mascota pide `GET /api/v1/medical-test/?idPet={id}`, agrupa por `type`, cuenta los elementos y muestra arriba los que tienen `status = pending`.
   - Al expandir una tarjeta muestra `resultDetail` y, si hay `file`:
     - **Ver PDF:** abre la URL con `expo-web-browser` (o un visor de imagen si es JPG/PNG).
     - **Compartir:** descarga el archivo con `expo-file-system` y abre la hoja de compartir del sistema con `expo-sharing`.
   - En "Historial" pide `GET /api/v1/medical-test/` (o con `idPet` según el filtro) y mezcla los estudios con vacunas y turnos por fecha.
2. **Servidor (Django REST Framework)**:
   - `MedicalTestViewSet.get_queryset()`:
     ```python
     def get_queryset(self):
         qs = MedicalTest.objects.select_related("pet").filter(
             isDeleted=False,
             pet__isDeleted=False,
             pet__owner=self.request.user,  # ajustar al campo real de Pet/Owner
         )
         id_pet = self.request.query_params.get("idPet")
         if id_pet is not None:
             qs = qs.filter(pet_id=id_pet)
         status = self.request.query_params.get("status")
         if status is not None:
             qs = qs.filter(status=status)
         return qs.order_by("-date", "-idMedicalTest")
     ```
   - Antes de filtrar, valida que `idPet` sea numérico y `status` un valor permitido (`400`), y que la mascota sea activa y del usuario (`404`).
   - Este mismo `get_queryset()` lo usan modificación (TDD-0012) y baja (TDD-0013), así un estudio ajeno o eliminado siempre da `404`.
3. **Respuesta**:
   - Devuelve `200 OK` con la lista (o el objeto en el detalle).

---

## Casos de Prueba y Casos de Borde

| Escenario | Validación / Regla de Negocio | Código HTTP |
| --- | --- | --- |
| **Listado por mascota** | Mascota con 3 estudios activos. Devuelve 3, ordenados por fecha descendente. | `200 OK` |
| **Mascota sin estudios** | Devuelve `[]`. | `200 OK` |
| **Excluye eliminados** | Mascota con 3 estudios, 1 con `isDeleted = true`. Devuelve 2. | `200 OK` |
| **Historial general** | Usuario con 2 mascotas y estudios en ambas. Devuelve todos, con `petName`. | `200 OK` |
| **No mezcla usuarios** | Otro usuario tiene estudios. No aparecen en el historial general. | `200 OK` |
| **Excluye mascotas dadas de baja** | Una de las mascotas tiene `isDeleted = true`. Sus estudios no aparecen en el historial general. | `200 OK` |
| **Filtro pendientes** | `status=pending` devuelve solo los pendientes. | `200 OK` |
| **Detalle propio** | `GET /{id}/` de un estudio activo propio. | `200 OK` |
| **Estudio sin archivo** | El detalle devuelve `file: null`. | `200 OK` |
| **idPet de otro dueño** | `GET ?idPet=` de una mascota ajena. | `404 Not Found` |
| **idPet inexistente o dado de baja** | `GET ?idPet=` de una mascota que no existe o con `isDeleted = true`. | `404 Not Found` |
| **Detalle inexistente, eliminado o ajeno** | `GET /{id}/` en cualquiera de esos casos. | `404 Not Found` |
| **idPet no numérico** | `GET ?idPet=abc`. | `400 Bad Request` |
| **status inválido** | `GET ?status=ok`. | `400 Bad Request` |
| **Sin autenticación** | Petición sin credenciales. | `401 Unauthorized` |
| **Falla de Persistencia** | Error de conexión con PostgreSQL. | `500 Internal Server Error` |

---

## Plan de Implementación

1. **Etapa 1 - Queryset y filtros:**
   - Implementar `get_queryset()` en `MedicalTestViewSet` con el filtro por dueño, `isDeleted`, mascota activa, `idPet` y `status`, más `select_related("pet")`.
   - Validar los query params y devolver `400` / `404` según corresponda.
2. **Etapa 2 - Acciones de lectura:**
   - Habilitar `list` y `retrieve` en `MedicalTestViewSet`.
3. **Etapa 3 - Tests:**
   - Tests de cada caso de la tabla, con dos usuarios y dos mascotas por usuario para cubrir la visibilidad.