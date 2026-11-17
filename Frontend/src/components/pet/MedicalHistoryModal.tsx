import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';

interface MedicalHistoryModalProps {
  visible: boolean;
  petName: string;
  fileUri: string | null;
  fileBase64?: string | null;
  onClose: () => void;
  onShare: () => void;
}

const PDFJS_VERSION = '3.11.174';
const PDFJS_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}`;

function buildHtml(pdfBase64?: string | null, fileUri?: string | null) {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes" />
<style>
  body { margin: 0; background: #3D2020; }
  canvas { display: block; width: 100%; margin: 0 0 8px; background: white; }
</style>
<script src="${PDFJS_URL}/pdf.min.js"></script>
</head>
<body>
<script>
  const send = (msg) => window.ReactNativeWebView.postMessage(JSON.stringify(msg));
  (async () => {
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '${PDFJS_URL}/pdf.worker.min.js';
      let loadingTask;
      const b64 = ${JSON.stringify(pdfBase64 || '')};
      if (b64) {
        const rawData = atob(b64);
        loadingTask = pdfjsLib.getDocument({ data: rawData });
      } else {
        loadingTask = pdfjsLib.getDocument(${JSON.stringify(fileUri || '')});
      }
      const pdf = await loadingTask.promise;
      const ratio = window.devicePixelRatio || 1;
      for (let n = 1; n <= pdf.numPages; n++) {
        const page = await pdf.getPage(n);
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: (window.innerWidth / base.width) * ratio * 2 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        document.body.appendChild(canvas);
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        if (n === 1) send({ type: 'loaded', pages: pdf.numPages });
      }
    } catch (e) {
      send({ type: 'error', message: String(e && e.message || e) });
    }
  })();
</script>
</body>
</html>`;
}

export default function MedicalHistoryModal({
  visible,
  petName,
  fileUri,
  fileBase64,
  onClose,
  onShare,
}: MedicalHistoryModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pages, setPages] = useState(0);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      setError(null);
      setPages(0);
    }
  }, [visible, fileUri]);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'loaded') {
        setPages(msg.pages);
        setLoading(false);
      } else if (msg.type === 'error') {
        console.warn('Error al mostrar la libreta PDF:', msg.message);
        setError('No se pudo visualizar el PDF.');
        setLoading(false);
      }
    } catch {
      // Ignorar mensajes no json
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaProvider>
        <View className="flex-1 bg-[#3D2020]">
          {/* Barra superior con botón de cerrar, título e ícono de compartir (caja con flecha hacia arriba) */}
          <SafeAreaView edges={['top']} className="bg-[#3D2020]">
            <View className="flex-row items-center gap-3 px-4 py-3">
              <Pressable
                onPress={onClose}
                hitSlop={8}
                className="h-9 w-9 items-center justify-center rounded-full bg-white/15 active:opacity-70"
                accessibilityLabel="Cerrar vista previa"
              >
                <Ionicons name="close" size={20} color="white" />
              </Pressable>

              <View className="flex-1">
                <Text className="text-sm font-bold text-white" numberOfLines={1}>
                  Libreta de {petName}
                </Text>
                {pages > 0 && (
                  <Text className="text-xs text-white/70">
                    {pages} {pages === 1 ? 'página' : 'páginas'}
                  </Text>
                )}
              </View>

              <Pressable
                onPress={onShare}
                hitSlop={8}
                className="h-9 w-9 items-center justify-center rounded-full bg-white/15 active:opacity-70"
                accessibilityLabel="Compartir archivo"
              >
                {/* Ícono de caja con flecha hacia arriba (share-outline) */}
                <Ionicons name="share-outline" size={18} color="white" />
              </Pressable>
            </View>
          </SafeAreaView>

          {/* Visor WebView con PDF.js */}
          {visible && (fileBase64 || fileUri) && (
            <WebView
              originWhitelist={['*']}
              source={{ html: buildHtml(fileBase64, fileUri) }}
              onMessage={handleMessage}
              onError={() => {
                setError('No se pudo mostrar la libreta.');
                setLoading(false);
              }}
              setBuiltInZoomControls
              setDisplayZoomControls={false}
              style={{ flex: 1, backgroundColor: '#3D2020' }}
            />
          )}

          {loading && !error && (
            <View className="absolute inset-0 top-24 items-center justify-center" pointerEvents="none">
              <ActivityIndicator size="large" color="white" />
              <Text className="mt-3 text-sm text-white/80">Cargando libreta...</Text>
            </View>
          )}

          {error && (
            <View className="flex-1 items-center justify-center px-6">
              <Ionicons name="alert-circle-outline" size={42} color="#F87171" />
              <Text className="mt-3 text-sm font-bold text-white">{error}</Text>
            </View>
          )}
        </View>
      </SafeAreaProvider>
    </Modal>
  );
}
