import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { MedicalTestFile } from '../../types/medicalTest';
import { apiUrl } from '../../services/api';

interface PdfPreviewModalProps {
  file: MedicalTestFile | null;
  onClose: () => void;
  onShare: (file: MedicalTestFile) => void;
}

const PDFJS_VERSION = '3.11.174';
const PDFJS_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}`;

// Página mínima que dibuja todas las hojas del PDF con pdf.js (Android no muestra PDFs en el WebView)
function buildHtml(pdfUrl: string) {
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
      const pdf = await pdfjsLib.getDocument(${JSON.stringify(pdfUrl)}).promise;
      const ratio = window.devicePixelRatio || 1;
      for (let n = 1; n <= pdf.numPages; n++) {
        const page = await pdf.getPage(n);
        const base = page.getViewport({ scale: 1 });
        // Se dibuja con más resolución para que se lea bien al hacer zoom
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

// Visor de PDF dentro de la app, igual en iOS y Android
export default function PdfPreviewModal({ file, onClose, onShare }: PdfPreviewModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pages, setPages] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setPages(0);
  }, [file?.idMedicalTestFile]);

  const handleMessage = (event: WebViewMessageEvent) => {
    const msg = JSON.parse(event.nativeEvent.data);
    if (msg.type === 'loaded') {
      setPages(msg.pages);
      setLoading(false);
    } else if (msg.type === 'error') {
      console.warn('Error al mostrar el PDF:', msg.message);
      setError('No se pudo mostrar el PDF.');
      setLoading(false);
    }
  };

  return (
    <Modal visible={file !== null} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-[#3D2020]">
        {/* Barra superior: cerrar, nombre y cantidad de páginas, compartir */}
        <SafeAreaView edges={['top']} className="bg-[#3D2020]">
          <View className="flex-row items-center gap-3 px-4 py-3">
            <Pressable
              onPress={onClose}
              hitSlop={8}
              className="h-9 w-9 items-center justify-center rounded-full bg-white/15 active:opacity-70"
              accessibilityLabel="Cerrar"
            >
              <Ionicons name="close" size={20} color="white" />
            </Pressable>
            <View className="flex-1">
              <Text className="text-sm font-bold text-white" numberOfLines={1}>
                {file?.name}
              </Text>
              {pages > 0 && (
                <Text className="text-xs text-white/70">
                  {pages} {pages === 1 ? 'página' : 'páginas'}
                </Text>
              )}
            </View>
            {file && (
              <Pressable
                onPress={() => onShare(file)}
                hitSlop={8}
                className="h-9 w-9 items-center justify-center rounded-full bg-white/15 active:opacity-70"
                accessibilityLabel={`Compartir ${file.name}`}
              >
                <Ionicons name="share-outline" size={18} color="white" />
              </Pressable>
            )}
          </View>
        </SafeAreaView>

        {file && (
          <WebView
            key={file.idMedicalTestFile}
            originWhitelist={['*']}
            // Con baseUrl en el origen del back, pdf.js puede bajar el archivo sin problemas de CORS
            source={{ html: buildHtml(file.url), baseUrl: apiUrl }}
            onMessage={handleMessage}
            onError={() => {
              setError('No se pudo mostrar el PDF.');
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
            <Text className="mt-3 text-sm text-white/80">Cargando PDF...</Text>
          </View>
        )}

        {error && (
          <View className="absolute inset-0 top-24 items-center justify-center px-8">
            <Ionicons name="document-text-outline" size={36} color="white" />
            <Text className="mt-3 text-center text-sm text-white">{error}</Text>
            {file && (
              <Pressable
                onPress={() => onShare(file)}
                className="mt-4 rounded-full bg-[#D9627A] px-4 py-2 active:opacity-90"
              >
                <Text className="text-xs font-bold text-white">Abrir con otra app</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}
