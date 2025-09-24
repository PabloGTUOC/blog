import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { UPLOADS_DIR } from "@/lib/fs-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const files = formData.getAll("files");
  const urls: string[] = [];

  const uploadDir = UPLOADS_DIR;
  await mkdir(uploadDir, { recursive: true });

  for (const file of files) {
    if (typeof file === "string") continue;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const uniqueName = `${Date.now()}-${file.name}`;
    const filePath = path.join(uploadDir, uniqueName);
    await writeFile(filePath, buffer);
    urls.push(`/uploads/${uniqueName}`);
  }

  return NextResponse.json({ urls });
}
