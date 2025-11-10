import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

export async function POST(req: Request) {
  try {
    const { entities, transactions } = await req.json();
    const data = JSON.stringify({ entities, transactions });

    // Store or overwrite your blob
    const blob = await put("project-data.json", data, {
      access: "public", // or "private" if you want to restrict access
      contentType: "application/json",
    });

    return NextResponse.json({ success: true, url: blob.url });
  } catch (error: any) {
    console.error("Error saving blob:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
