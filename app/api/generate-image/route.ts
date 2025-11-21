import { NextResponse } from "next/server";

const GEMINI_IMAGE_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/imagegeneration:generate";

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
  generatedImages?: Array<{ b64Image?: string }>;
  error?: { message?: string };
};

type GeminiImagePayload = {
  prompt: Array<{ text: string }>;
  imageGenerationConfig?: { height: number; width: number };
};

const DEFAULT_SIZE = "1024x1024";

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
    return NextResponse.json(
      { error: "画像生成中にエラーが発生しました。" },
      { status: 500 },
    );
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

  const data = (await response.json()) as GeminiImageResponse;

  if (!response.ok) {
    const message =
      data.error?.message ?? "Gemini API からエラーが返却されました。";
    throw new Error(message);
  }

  const base64 = data.generatedImages?.[0]?.b64Image;

  if (!base64) {
    throw new Error("Gemini API から画像データが返却されませんでした。");
  }

  return base64;
}

function buildGeminiPayload(prompt: string, size: string): GeminiImagePayload {
  const { width, height } = parseSize(size);

  const payload: GeminiImagePayload = {
    prompt: [{ text: prompt }],
  };

  if (width && height) {
    payload.imageGenerationConfig = { width, height };
  }

  // 上記の payload 形式は Google Gemini 画像生成 API の推奨形式を想定しています。
  // 実際のパラメーター仕様は公式ドキュメントに従って調整してください。
  return payload;
}

function parseSize(size: string): { width?: number; height?: number } {
  const [widthStr, heightStr] = size.split("x");
  const width = Number(widthStr);
  const height = Number(heightStr);

  if (Number.isNaN(width) || Number.isNaN(height)) {
    return { width: 1024, height: 1024 };
  }

  return { width, height };
}
