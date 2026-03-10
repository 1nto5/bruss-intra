import { auth } from "@/lib/auth";
import { dbc } from "@/lib/db/mongo";
import fs from "fs";
import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import path from "path";

const BASE_PATH = process.env.UPLOAD_BASE_PATH || "./public";

export async function GET(req: NextRequest) {
  try {
    // Authorize user
    const session = await auth();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get parameters from URL
    const { searchParams } = new URL(req.url);
    const overTimeRequestId = searchParams.get("overTimeRequestId");

    // Validate parameters
    if (!overTimeRequestId) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 },
      );
    }

    // Get the order from database to check permissions
    const collection = await dbc("production_overtime");
    const objectId = new ObjectId(overTimeRequestId);
    const order = await collection.findOne({ _id: objectId });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (!order.hasAttachment) {
      return NextResponse.json(
        { error: "No attachment found for this order" },
        { status: 404 },
      );
    }

    // Use original attachment structure
    let filename: string;
    let originalName: string;

    if (order.attachmentFilename) {
      filename = order.attachmentFilename;
      const ext = path.extname(filename);
      originalName = `lista_obecnosci_${overTimeRequestId}${ext}`;
    } else {
      return NextResponse.json(
        { error: "No attachment filename found" },
        { status: 404 },
      );
    }

    // Construct path to file
    const filePath = path.join(BASE_PATH, "production_overtime", filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Read file
    const fileBuffer = fs.readFileSync(filePath);
    const fileStats = fs.statSync(filePath);

    // Determine MIME type based on file extension
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

    // Use application/octet-stream as default MIME type if extension is unknown
    const contentType = mimeTypes[ext] || "application/octet-stream";

    // Format a user-friendly download filename using original name
    const downloadFilename = originalName;

    // Prepare response
    const headers = new Headers();
    headers.set(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(downloadFilename)}"`,
    );
    headers.set("Content-Type", contentType);
    headers.set("Content-Length", fileStats.size.toString());
    headers.set("Cache-Control", "no-cache");

    // Create response with file as byte stream
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
