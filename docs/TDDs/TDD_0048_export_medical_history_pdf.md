---
id: 0048
estado: Por implementar
autor: Matías Cortés
fecha: 16-11-2026
titulo: Exportación de Historia Clínica en PDF
---

# TDD-0048: Exportación de Historia Clínica en PDF

## Contexto de Negocio (PRD)

### Objetivo
- **Problema que resuelve:** Cuando un dueño o tutor de mascota acude a una consulta con un profesional veterinario nuevo o ante una emergencia médica, la información clínica suele estar fragmentada entre distintas pestañas de la aplicación o dispersa en documentos físicos. Esto dificulta una evaluación médica integral, rápida y precisa.
- **Resultado esperado:** Permitir al dueño descargar en un solo toque la libreta / historia clínica completa de su mascota consolidada en un documento PDF estructurado y legible, que reúna datos de identificación del animal, vacunas y antiparasitarios, estudios médicos realizados, medicaciones indicadas, enfermedades/diagnósticos y pautas de alimentación activa.
  - La generación se efectúa en el backend garantizando un diseño homogéneo, seguro y de alta fidelidad estética y visual para Android e iOS.
  - Se respetan estrictamente las bajas lógicas: ningún registro eliminado (`isDeleted = true`) se incluye en el reporte.
  - Si una sección no registra atenciones activas, se muestra explícitamente el mensaje de estado "Sin registros".

### User Persona
- **Dueño / Tutor de mascota (`Owner`):** Usuario autenticado que desea disponer de toda la historia sanitaria de su mascota en un archivo PDF para compartir por WhatsApp, correo o imprimir ante una consulta veterinaria.

### User Story (Épica: EP10 Historia Clínica)
**Como** dueño de una mascota,  
**quiero** descargar su libreta en un PDF,  
**para** tenerla a mano en una consulta con un veterinario nuevo.

- **Sprint:** 3 / 4. **Épica:** EP10 Historia Clínica. **Prioridad:** Alta. **Estimación:** 3 SP.

---

### Criterios de Aceptación (Gherkin)

**Escenario 1: PDF completo**  
DADO que Mandarina tiene vacunas, estudios, medicamentos, enfermedades y alimentación  
CUANDO el dueño toca "Exportar libreta"  
ENTONCES obtiene un PDF con sus datos y una sección por cada uno, con fechas

**Escenario 2: Secciones vacías**  
DADO que Mandarina no tiene estudios  
CUANDO exporta  
ENTONCES la sección Estudios dice "Sin registros"

**Escenario 3: Solo lo vigente**  
DADO que un registro fue eliminado  
CUANDO exporta  
ENTONCES ese registro no aparece

Además:
1. **Aislamiento de tutor y seguridad:** Solo el tutor dueño de la mascota autenticado (`request.user.owner_profile`) puede exportar su historia clínica. Mascotas ajenas o eliminadas devuelven `404 Not Found`.
2. **Estructura del documento:**
   - **Encabezado institucional:** Marca PetLife, fecha de emisión del reporte y datos del tutor responsable.
   - **Ficha de la mascota:** Nombre, especie, raza, peso, fecha de nacimiento, edad calculada y condición de castrado/a.
   - **Sección 1 - Vacunación y Antiparasitarios:** Nombre del producto, tipo (Vacuna o Antiparasitario), fecha de aplicación, dosis (si aplica) y fecha de vencimiento.
   - **Sección 2 - Estudios Médicos:** Nombre del estudio, tipo (Laboratorio, Imagen u Otro), fecha de realización, veterinario solicitante y estado/resumen.
   - **Sección 3 - Tratamientos y Medicación:** Medicamento, dosis, frecuencia horaria, fecha de inicio y fecha de fin estimada.
   - **Sección 4 - Diagnósticos y Enfermedades:** Condición médica, fecha de inicio, fecha de fin (si fue dada de alta/controlada) y observaciones.
   - **Sección 5 - Pautas de Alimentación:** Tipo de alimento, marca/nombre, porción, frecuencia de comidas y fecha desde la cual se administra.
3. **Manejo de vacíos:** Cuando una sección no contenga ningún registro activo, se renderiza la cabecera de la sección acompañada del texto informativo *"Sin registros"*.
4. **Respuesta HTTP:** El endpoint devuelve un flujo binario `application/pdf` con la cabecera `Content-Disposition: attachment; filename="libreta_{nombre_mascota}.pdf"`.
5. **Experiencia en la App (Frontend):** En la pantalla `PetDetailScreen`, se ubica el botón de acción *"Exportar libreta"* en la cabecera. Al pulsarlo, se descarga el archivo al almacenamiento temporal del dispositivo y se dispara la hoja nativa para compartir/guardar vía `expo-sharing`.

---

### Reglas de Negocio
- Únicamente se incluyen registros pertenecientes a la mascota solicitada donde `isDeleted = false`.
- Las fechas en el documento se muestran formateadas según la convención local `DD/MM/AAAA`.
- Si la mascota tiene una foto cargada, se incorpora en la ficha principal de identificación (o avatar vectorial por defecto si no posee).
- Los registros en cada sección se ordenan cronológicamente descendente (los más recientes primero).

---

## Dependencias y Estimación

### Dependencias
- **TDD-0004 a TDD-0006:** Entidad y endpoints de `Pet`.
- **TDD-0010 a TDD-0013:** Entidad `MedicalTest`.
- **TDD-0017 a TDD-0020:** Entidad `PetDisease`.
- **TDD-0021 a TDD-0024:** Entidad `MedicationPet`.
- **TDD-0028 a TDD-0031:** Entidad `VaccinePet`.
- **TDD-0038 a TDD-0041:** Entidad `Feeding`.
- **Backend:** Librería `reportlab` instalada en el entorno Django para compilación de PDFs en memoria (`io.BytesIO`).
- **Frontend:** Módulos de Expo `expo-file-system` y `expo-sharing` (instalados en `Frontend/package.json`).

### Estimación
- **Story Points:** **3 SP** (Escala Fibonacci).
  - *Backend:* Endpoint y generador ReportLab con estilos corporativos (1.5 SP).
  - *Frontend:* Botón en `PetDetailScreen`, llamada al servicio, descarga y share nativo (1.5 SP).

---

## Diseño Técnico (RFC)

### 1. Backend (Django REST Framework)

#### Contrato de API
- **Endpoint:** `GET /api/v1/pets/{id}/medical-history/pdf/`
- **Autenticación requerida:** `Token <token>` (Tutor autenticado)
- **Permisos:** `IsAuthenticated`

##### Respuestas:
- **`200 OK`**:
  - `Content-Type: application/pdf`
  - `Content-Disposition: attachment; filename="libreta_{nombre_mascota}.pdf"`
- **`401 Unauthorized`**: Usuario no autenticado.
- **`404 Not Found`**:
  - Mascota inexistente, eliminada o perteneciente a otro dueño:
  ```json
  { "detail": "Mascota no encontrada." }
  ```

#### Servicio Generador de PDF (`Backend/api/services/pdf_generator.py`)
Módulo encargado de construir el canvas o `SimpleDocTemplate` con ReportLab:
- Paleta visual:
  - Color principal / Marca: `#DE6B80` / `#E87A8E`
  - Texto principal: `#2B1D1D`
  - Texto secundario / gris: `#718096` / `#8C7B77`
  - Fondo de tablas / destacados: `#FAF6F3` / `#FFF5F3`
- Configuración de página: A4, márgenes de 1.5 cm.
- Uso de `io.BytesIO` para no escribir archivos temporales en disco.

---

### 2. Frontend (React Native + Expo)

#### Servicio API (`Frontend/src/services/petService.ts`)
```typescript
export async function downloadMedicalHistoryPdf(petId: number, petName: string): Promise<string> {
  // Descarga con FileSystem.downloadAsync hacia cacheDirectory
  // Retorna el URI local del archivo descargado
}
```

#### Pantalla de Detalle (`Frontend/src/screens/pet/PetDetailScreen.tsx`)
- Se añade el botón de acción *"Exportar libreta"* en el encabezado de `PetDetailScreen` junto al botón *"Modificar"*.
- Estado `isExporting` para mostrar indicador de carga / deshabilitar pulsaciones repetidas.
- Al completarse la descarga, se invoca `Sharing.shareAsync(fileUri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' })`.

---

## Plan de Pruebas (Test Cases)

### Backend (`Backend/api/test_medical_history_pdf.py`):
1. **`test_exportar_historia_clinica_pdf_completo`:** Mascota con todos los módulos cargados. Valida código `200 OK`, `Content-Type` igual a `application/pdf` y tamaño mayor a 0 bytes.
2. **`test_exportar_historia_clinica_secciones_vacias`:** Mascota sin registros en ninguna sección (solo datos básicos). Valida `200 OK` y generación correcta del documento con texto de secciones vacías.
3. **`test_exportar_excluye_registros_eliminados`:** Crea registros activos y dados de baja (`isDeleted=True`) en vacunas, estudios, medicaciones, enfermedades y alimentación. Valida que el generador consulte únicamente entidades activas.
4. **`test_exportar_mascota_ajena_o_inexistente`:** Dueño intenta exportar el PDF de una mascota de otro tutor o un ID inexistente -> espera `404 Not Found`.
5. **`test_exportar_requiere_autenticacion`:** Petición sin token -> espera `401 Unauthorized`.

---

## Plan de Implementación por Etapas

### Etapa 1: Documentación & Requisitos (DoR)
- [x] Elaborar TDD-0048 con contexto, criterios Dado/Cuando/Entonces y diseño técnico.
- [ ] Registrar `reportlab>=4.0.0` en `Backend/requirements.txt` si se requiere pinneo explícito.

### Etapa 2: Backend (API & Servicio PDF)
- [ ] Implementar generador ReportLab en `Backend/api/services/pdf_generator.py`.
- [ ] Implementar action o vista `medical_history_pdf` en `PetViewSet` (`/api/v1/pets/{id}/medical-history/pdf/`).
- [ ] Implementar suite de pruebas automatizadas en `Backend/api/test_medical_history_pdf.py`.
- [ ] Ejecutar `python manage.py test api.test_medical_history_pdf` y validar 100% de éxito.

### Etapa 3: Frontend (Mobile)
- [ ] Implementar función `downloadMedicalHistoryPdf` en `petService.ts`.
- [ ] Agregar botón *"Exportar libreta"* en `PetDetailScreen.tsx` con spinner de carga.
- [ ] Integrar `expo-sharing` para visualización y compartir en iOS y Android.

### Etapa 4: Verificación Integral & DoD
- [ ] Probar descarga y visualización del PDF en emulador / dispositivo.
- [ ] Verificar que no haya regresiones en los tests existentes del backend.
- [ ] Preparar commits y Pull Request para revisión del equipo.
