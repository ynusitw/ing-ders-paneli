import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getCurrentUser } from "@/lib/session";
import { ALLOWED_UPLOAD_CONTENT_TYPES, MAX_UPLOAD_BYTES } from "@/lib/uploads";

// Ogrencinin odev dosyasi tarayicidan dogrudan Vercel Blob'a yuklenir; bu uc
// sadece kisa omurlu, kisitli bir yukleme jetonu uretir. Dosya sunucumuzun
// uzerinden gecmedigi icin serverless istek govdesi siniri (4.5 MB) asilmiyor.

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "STUDENT") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        access: "private",
        allowedContentTypes: ALLOWED_UPLOAD_CONTENT_TYPES,
        maximumSizeInBytes: MAX_UPLOAD_BYTES,
        // Dosyalar ogrenci klasorune yazilir, ad cakismasi olmasin diye rastgele ek.
        addRandomSuffix: true,
        tokenPayload: JSON.stringify({ studentId: user.uid }),
      }),
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Yükleme başlatılamadı" },
      { status: 400 }
    );
  }
}
