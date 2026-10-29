// Shrinks big phone photos before upload so the upload stays small.
export async function compressImage(file, max = 900, quality = 0.8) {
  if (!file || !file.type.startsWith('image/') || file.type === 'image/gif') return file
  try {
    const bmp = await createImageBitmap(file)
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bmp.width * scale)
    canvas.height = Math.round(bmp.height * scale)
    canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality))
    return blob ? new File([blob], 'product.jpg', { type: 'image/jpeg' }) : file
  } catch {
    return file
  }
}
