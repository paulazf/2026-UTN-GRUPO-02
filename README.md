# 2026-UTN-GRUPO-02

¡Bienvenido al repositorio del proyecto! Este proyecto está dividido en dos partes principales:
- **Mobile**: Aplicación móvil desarrollada con React Native, Expo Go, TypeScript y NativeWind.
- **Backend**: API desarrollada con Python, Django y Django REST Framework.

A continuación, encontrarás los comandos que debes ejecutar para configurar y levantar ambas partes del proyecto en tu entorno local.

---

## 🚀 Cómo ejecutar el proyecto localmente

### 1. Clonar el repositorio
Si aún no lo has hecho, clona este repositorio en tu computadora y abre una terminal en la carpeta principal del proyecto (`2026-UTN-GRUPO-02`).

### 2. Levantar el Backend (Django)

Abre una terminal y sigue estos pasos:

1. **Navega a la carpeta del Backend**:
   ```bash
   cd Backend
   ```

2. **Crea un entorno virtual** (recomendado para aislar las dependencias):
   ```bash
   python -m venv venv
   ```

3. **Activa el entorno virtual**:
   - En **Windows**:
     ```bash
     venv\Scripts\activate
     ```
   - En **macOS / Linux**:
     ```bash
     source venv/bin/activate
     ```

4. **Instala las dependencias**:
   ```bash
   pip install -r requirements.txt
   ```

5. **Aplica las migraciones de la base de datos**:
   ```bash
   python manage.py migrate
   ```

6. **Inicia el servidor de desarrollo**:
   ```bash
   python manage.py runserver
   ```
   El backend estará corriendo por defecto en `http://127.0.0.1:8000/`.

---

### 3. Levantar el Frontend móvil (React Native + Expo Go)

Abre una **nueva terminal** (manteniendo la del Backend corriendo) y sigue estos pasos:

1. **Desde la raíz del proyecto, inicia Docker con la IP local**:
   ```bash
   ./scripts/dev.sh
   ```

   El script inicia Django, PostgreSQL y Expo/Metro dentro de Docker, y configura automáticamente la IP que Expo Go necesita para acceder a la API.

2. **Instala Expo Go** en tu teléfono y conéctalo a la misma red Wi-Fi que tu computadora.

3. **Escanea el código QR** que muestra Expo en la terminal. Si no aparece, usa la URL indicada por el script, por ejemplo `exp://192.168.0.13:8081`.

El frontend usa React Native + Expo Go. Metro es el empaquetador interno que Expo inicia automáticamente.

#### Si Expo Go muestra "Something went wrong" o no conecta

Pasa cuando el celular no llega a la computadora por la red local (datos móviles, otra red Wi-Fi, firewall o Wi-Fi con aislamiento de clientes). En ese caso, levantá todo en **modo túnel**:

```bash
./scripts/dev.sh --tunnel
```

- Metro se publica con un link de Expo (`exp://...exp.direct`) y la API con una URL pública de Cloudflare (`https://...trycloudflare.com`), así la app funciona con Wi-Fi o con datos.
- Escaneá el QR o abrí el link `exp://...exp.direct` que aparece en la terminal (tarda unos segundos en mostrarse).
- La URL de la API cambia cada vez que se levanta el túnel; el script la configura sola. Si reiniciás solo un contenedor, volvé a correr el script.
- Para volver al modo normal: `docker compose --profile tunnel down` y después `./scripts/dev.sh`.

### 4. Detener Docker

```bash
docker compose down
```

### 5. Variables de entorno

Si no existe `.env`, créalo a partir del ejemplo:

   ```bash
   cp .env.example .env
   ```

---

## 🛠️ Herramientas y tecnologías utilizadas
- **Frontend**: React Native, Expo Go, TypeScript y NativeWind.
- **Backend**: Python, Django 6, Django REST Framework y PostgreSQL.