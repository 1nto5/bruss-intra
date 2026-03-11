import { auth } from "@/lib/auth";
import fs from "fs";
import { NextRequest, NextResponse } from "next/server";
import path from "path";

const BASE_PATH = process.env.UPLOAD_BASE_PATH || "./public";

export async function GET(req: NextRequest) {
  try {
    // Autoryzacja użytkownika
    const session = await auth();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Pobranie parametrów z URL
    const { searchParams } = new URL(req.url);
    const deviationId = searchParams.get("deviationId");
    const filename = searchParams.get("filename");
    // Ignorujemy customName, zawsze używając oryginalnej nazwy pliku
    // const customName = searchParams.get('name');

    // Walidacja parametrów
    if (!deviationId || !filename) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 },
      );
    }

    // Konstruowanie ścieżki do pliku
    const filePath = path.join(BASE_PATH, "deviations", deviationId, filename);

    // Sprawdzenie czy plik istnieje
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Odczytanie pliku
    const fileBuffer = fs.readFileSync(filePath);
    const fileStats = fs.statSync(filePath);

    // Określenie typu MIME na podstawie rozszerzenia pliku
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".svg": "image/svg+xml",
      ".pdf": "application/pdf",
      ".doc": "application/msword",
      ".docx":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".xls": "application/vnd.ms-excel",
      ".xlsx":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ".ppt": "application/vnd.ms-powerpoint",
      ".pptx":
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ".txt": "text/plain",
      ".csv": "text/csv",
      ".zip": "application/zip",
      ".rar": "application/x-rar-compressed",
    };

    // Użyj application/octet-stream jako domyślnego typu MIME, jeśli rozszerzenie nie jest znane
    const contentType = mimeTypes[ext] || "application/octet-stream";

    // Zawsze używamy oryginalnej nazwy pliku
    const downloadFilename = filename;

    // Przygotowanie odpowiedzi
    const headers = new Headers();
    headers.set(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(downloadFilename)}"`,
    );
    headers.set("Content-Type", contentType);
    headers.set("Content-Length", fileStats.size.toString());
    headers.set("Cache-Control", "no-cache");

    // Utworzenie odpowiedzi z plikiem jako strumień bajtów
    return new NextResponse(fileBuffer, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json(
      { error: "Download failed", details: (error as Error).message },
      { status: 500 },
    );
  }
}
