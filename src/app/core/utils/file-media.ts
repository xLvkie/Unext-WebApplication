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