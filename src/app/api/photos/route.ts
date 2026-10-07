import { deletePhoto, listPhotos } from "@/lib/photos";
import { photoResponse, readPhotoBody } from "./response";

export async function GET() {
  return photoResponse(async () => ({ photos: await listPhotos() }));
}

export async function DELETE(request: Request) {
  return photoResponse(async () => {
    const body = await readPhotoBody(request);
    await deletePhoto(body.key);
    return { ok: true };
  });
}
