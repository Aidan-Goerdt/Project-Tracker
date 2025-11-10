import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Replace with your actual blob URL after first save
    const blobUrl = "https://<YOUR-BLOB-PATH>/project-data.json";
    const response = await fetch(blobUrl);

    if (!response.ok) throw new Error("Blob not found or inaccessible");

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error loading blob:", error);
    // Return safe empty structure so your UI can still render
    return NextResponse.json({ entities: [], transactions: [] });
  }
}
