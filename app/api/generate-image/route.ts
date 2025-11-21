import { NextResponse } from "next/server";

const GEMINI_IMAGE_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent";

type GenerateImageRequestBody = {
  prompt?: string;
  size?: string;
};

type GenerateImageSuccessResponse = {
  imageUrl: string;
};

type GenerateImageErrorResponse = {
  error: string;
};

type GeminiImageResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: { data?: string; mimeType?: string };
      }>;
    };
  }>;
  error?: { message?: string };
};

type GeminiImagePayload = {
  contents: Array<{
    role?: string;
    parts: Array<{ text: string }>;
  }>;
  generationConfig?: {
    imageConfig?: {
      aspectRatio?: string;
    };
  };
};

const DEFAULT_SIZE = "1:1";
const ALLOWED_ASPECTS = new Set([
  "1:1",
  "2:3",
  "3:2",
  "3:4",
  "4:3",
  "4:5",
  "5:4",
  "9:16",
  "16:9",
  "21:9",
]);
const RATIO_DIMENSIONS: Record<string, { width: number; height: number }> = {
  "21:9": { width: 1680, height: 720 },
  "1:1": { width: 1024, height: 1024 },
  "16:9": { width: 1280, height: 720 },
  "4:3": { width: 1200, height: 900 },
  "3:2": { width: 1200, height: 800 },
  "9:16": { width: 720, height: 1280 },
  "3:4": { width: 900, height: 1200 },
  "2:3": { width: 800, height: 1200 },
  "5:4": { width: 1280, height: 1024 },
  "4:5": { width: 1024, height: 1280 },
};

export async function POST(
  request: Request,
): Promise<NextResponse<GenerateImageSuccessResponse | GenerateImageErrorResponse>> {
  try {
    const body = (await request.json()) as GenerateImageRequestBody;
    const prompt = body.prompt?.trim();
    const size = body.size ?? DEFAULT_SIZE;

    if (!prompt) {
      return NextResponse.json(
        { error: "プロンプトを入力してください。" },
        { status: 400 },
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY が設定されていません。" },
        { status: 500 },
      );
    }

    const base64 = await generateGeminiImage({
      prompt,
      size,
      apiKey,
    });

    return NextResponse.json({ imageUrl: `data:image/png;base64,${base64}` });
  } catch (error) {
    console.error("Error while generating image with Gemini:", error);
    const message =
      error instanceof Error
        ? error.message
        : "画像生成中にエラーが発生しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function generateGeminiImage({
  prompt,
  size,
  apiKey,
}: {
  prompt: string;
  size: string;
  apiKey: string;
}) {
  const payload = buildGeminiPayload(prompt, size);

  const response = await fetch(`${GEMINI_IMAGE_ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const rawResponse = await response.text();
  const data = parseJsonSafe<GeminiImageResponse>(rawResponse);

  if (!response.ok) {
    const message =
      data?.error?.message ||
      rawResponse ||
      `Gemini API からエラーが返却されました。(status ${response.status})`;
    throw new Error(message);
  }

  const base64 = data?.candidates
    ?.flatMap((candidate) => candidate.content?.parts ?? [])
    .find((part) => part?.inlineData?.data)?.inlineData?.data;

  if (!base64) {
    throw new Error("Gemini API から画像データが返却されませんでした。");
  }

  return base64;
}

function buildGeminiPayload(prompt: string, size: string): GeminiImagePayload {
  const { width, height, aspectRatio } = parseSize(size);

  const userParts: Array<{ text: string }> = [];

  if (width && height) {
    const ratioText = aspectRatio ?? `${width}:${height}`;
    userParts.push({
      text: `Instruction: Respect aspect ratio ${ratioText} (approx ${width}x${height}px). Do NOT return square images unless the ratio is 1:1.`,
    });
    userParts.push({
      text: `Also keep framing around ${width}:${height} and avoid square crops.`,
    });
  }

  userParts.push({ text: prompt });

  const payload: GeminiImagePayload = {
    contents: [
      {
        role: "user",
        parts: userParts,
      },
    ],
    generationConfig:
      width && height && aspectRatio
        ? {
            imageConfig: {
              aspectRatio,
            },
          }
        : undefined,
  };

  // 上記の payload 形式は Google Gemini 画像生成 API の推奨形式を想定しています。
  // 実際のパラメーター仕様は公式ドキュメントに従って調整してください。
  return payload;
}

function parseSize(size: string): {
  width?: number;
  height?: number;
  aspectRatio?: string;
} {
  const preset = RATIO_DIMENSIONS[size];
  if (preset) return { ...preset, aspectRatio: size };

  const [widthStr, heightStr] = size.includes("x")
    ? size.split("x")
    : size.split(":");
  const width = Number(widthStr);
  const height = Number(heightStr);

  if (Number.isNaN(width) || Number.isNaN(height)) {
    return { width: 1024, height: 1024, aspectRatio: "1:1" };
  }

  const ratio = simplifyRatio(width, height);

  return {
    width,
    height,
    aspectRatio: ALLOWED_ASPECTS.has(ratio) ? ratio : undefined,
  };
}

function parseJsonSafe<T>(raw: string): T | undefined {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

function simplifyRatio(width: number, height: number): string {
  const gcd = (a: number, b: number): number =>
    b === 0 ? Math.abs(a) : gcd(b, a % b);
  const divisor = gcd(width, height);
  return `${width / divisor}:${height / divisor}`;
}
