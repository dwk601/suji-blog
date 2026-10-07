import { beginPhotoUpload } from "@/lib/photos";
import { photoResponse, readPhotoBody } from "../response";

export async function POST(request: Request) {
  return photoResponse(async () => {
    const body = await readPhotoBody(request);
    return beginPhotoUpload(body.contentType, body.size);
  });
}
