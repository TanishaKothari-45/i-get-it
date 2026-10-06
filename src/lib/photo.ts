// A phone photo is 3-8 MB; Gemini reads a 1600px JPEG just as well. Shrinking it on the phone first saves the
// reader's mobile data and the upload time. Anything the browser can't decode is sent as it is.
const LONG_SIDE = 1600;
const QUALITY = 0.85;

export async function shrinkPhoto(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, LONG_SIDE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY))
    return blob && blob.size < file.size ? blob : file
  } catch {
    return file
  }
}
