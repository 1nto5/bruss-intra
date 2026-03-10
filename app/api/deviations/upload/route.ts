import { auth } from "@/lib/auth";
import { dbc } from "@/lib/db/mongo";
import fs from "fs";
import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import path from "path";
// Import the notification action
import { notifyRejectorsAfterAttachment } from "@/app/[lang]/deviations/actions";

const BASE_PATH = process.env.UPLOAD_BASE_PATH || "./public";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB limit

// Allowed file types
const ALLOWED_FILE_TYPES = [
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  // Documents
  "application/pdf",
  "application/msword", // doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
  // Excel
  "application/vnd.ms-excel", // xls
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx
  // PowerPoint
  "application/vnd.ms-powerpoint", // ppt
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // pptx
  // Text files
  "text/plain",
  "text/csv",
  // Zip archives
  "application/zip",
  "application/x-zip-compressed",
  "application/x-rar-compressed",
];

export async function POST(req: NextRequest) {
  try {
    // User authorization
    const session = await auth();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get form data
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const deviationId = form.get("deviationId") as string | null;
    const name = form.get("name") as string | null;
    const note = form.get("note") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file" }, { status: 400 });
    }

    if (!deviationId) {
      return NextResponse.json({ error: "No deviation ID" }, { status: 400 });
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds the limit (10MB)" },
        { status: 400 },
      );
    }

    // Check file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: "Unsupported file type",
          allowedTypes: ALLOWED_FILE_TYPES.join(", "),
          receivedType: file.type,
        },
        { status: 400 },
      );
    }

    // File processing
    const buf = Buffer.from(await file.arrayBuffer());

    // Create folder for deviation
    const deviationFolder = path.join(BASE_PATH, "deviations", deviationId);
    fs.mkdirSync(deviationFolder, { recursive: true });

    // Generate file name
    const fileName = `${file.name}`;
    const filePath = path.join(deviationFolder, fileName);

    // Check if file already exists
    if (fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: "File already exists" },
        { status: 409 },
      );
    }

    // Save file to disk
    fs.writeFileSync(filePath, buf);

    // Prepare attachment data for database
    const attachment = {
      filename: fileName,
      name: name,
      note: note || undefined,
      uploadedBy: session.user.email,
      uploadedAt: new Date(),
      size: file.size,
      type: file.type,
    };

    // Database update
    try {
      const collection = await dbc("deviations");
      const updateResult = await collection.updateOne(
        { _id: new ObjectId(deviationId) },
        {
          $push: {
            attachments: attachment,
          },
        } as any,
      );

      if (updateResult.modifiedCount === 0) {
        return NextResponse.json(
          { error: "Failed to update deviation with attachment" },
          { status: 500 },
        );
      }

      // Trigger notification for rejectors (fire and forget, errors handled within the action)
      notifyRejectorsAfterAttachment(deviationId).catch((err) => {
        console.error(
          `Error triggering notification after attachment upload for deviation ${deviationId}:`,
          err,
        );
        // Optionally log this failure more formally if needed
      });

      return NextResponse.json({
        success: true,
        message: "Attachment added successfully",
        attachment,
      });
    } catch (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.json(
        {
          error: "Database update failed",
          details: (dbError as Error).message,
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "File upload failed", details: (error as Error).message },
      { status: 500 },
    );
  }
}
