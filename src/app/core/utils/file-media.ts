export function resizeImageFile(
  file: File,
  targetW: number,
  targetH: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Formato de imagen inválido'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d')!;
        const scale = Math.max(targetW / img.width, targetH / img.height);
        const scaledW = img.width * scale;
        const scaledH = img.height * scale;
        ctx.drawImage(img, (targetW - scaledW) / 2, (targetH - scaledH) / 2, scaledW, scaledH);
        resolve(canvas.toDataURL('image/jpeg', 0.86));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// Convierte un archivo a DataURL y obtiene su nombre y tamaño en formato legible
export function readFileAsDataUrl(
  file: File
): Promise<{ dataUrl: string; fileName: string; fileSizeLabel: string }> {
  return new Promise((resolve, reject) => {
    const fileSizeLabel =
      file.size >= 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.max(1, Math.round(file.size / 1024))} KB`;

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.onload = () => {
      resolve({
        dataUrl: reader.result as string,
        fileName: file.name,
        fileSizeLabel
      });
    };
    reader.readAsDataURL(file);
  });
}

// Procesa Imágenes, GIFs y Videos cortos para el Feed de Publicaciones
export function processFeedMediaFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const isVideo = file.type.startsWith('video/');
    const isGif = file.type === 'image/gif';
    const isImage = file.type.startsWith('image/');

    if (!isImage && !isVideo) {
      reject(new Error('Formato no soportado. Sube imágenes (PNG, JPG, WEBP), GIFs o videos (MP4, WEBM).'));
      return;
    }

    // Límite de 8 MB de subida para imágenes, GIFs y videos
    if (file.size > 8 * 1024 * 1024) {
      reject(new Error(`El archivo "${file.name}" supera el límite de 8 MB.`));
      return;
    }

    // Gifs y videos se procesan sin compresión adicional, solo se convierten a DataURL
    if (isGif || isVideo) {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Error al procesar el archivo multimedia'));
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
      return;
    }

    // Optimizamos imágenes (JPG, PNG, WEBP) 
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Error al leer la imagen'));
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxWidth = 1200;
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}