import { NextResponse } from "next/server";
import path from "path";
import { ensureBlogDir, ensureEntryDir, writeBufferFile, uniqueName } from "@/lib/fs-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const files = formData.getAll("files");
  const urls: string[] = [];

  const targetType = String(formData.get("targetType") || "").trim();
  const targetId = String(formData.get("targetId") || "").trim();

  if (!targetType || !targetId) {
    return NextResponse.json({ error: "targetType and targetId are required" }, { status: 400 });
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(targetId)) {
    return NextResponse.json({ error: "Invalid targetId" }, { status: 400 });
  }

  let destDir: string;
  switch (targetType) {
    case "entries":
      destDir = ensureEntryDir(targetId);
      break;
    case "blogs":
      destDir = ensureBlogDir(targetId);
      break;
    default:
      return NextResponse.json({ error: "Unsupported targetType" }, { status: 400 });
  }

  for (const file of files) {
    if (typeof file === "string") continue;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const originalName = path.basename(file.name);
    const ext = path.extname(originalName).replace(/^\./, "") || "bin";
    const base = path.basename(originalName, path.extname(originalName));
    const filename = uniqueName(base, ext);
    const filePath = path.join(destDir, filename);
    await writeBufferFile(filePath, buffer);
    urls.push(`/${targetType}/${targetId}/${filename}`);
  }

  return NextResponse.json({ urls });
}
