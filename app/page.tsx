"use client";

import Image from "next/image";
import { useCallback, useMemo, useState } from "react";

type GenerateResponse = {
  imageUrl: string;
};

type ErrorResponse = {
  error: string;
};

type GeneratedImage = {
  id: string;
  url: string;
  prompt: string;
  size: string;
  timestamp: number;
};

const SAMPLE_PROMPTS = [
  "レトロなヴェイパーウェーブの彫像、ピンク背景、グリッチ",
  "ポップアートのバナナ、ビビッドドット、コミック調",
  "抽象的な幾何学パターン、バウハウス配色、強コントラスト",
  "サイバーパンク屋台、モノクロ漫画風、雨の夜",
];

const SIZE_OPTIONS = [
  { label: "横向き 21:9", value: "21:9" },
  { label: "横向き 16:9", value: "16:9" },
  { label: "横向き 4:3", value: "4:3" },
  { label: "横向き 3:2", value: "3:2" },
  { label: "正方形 1:1", value: "1:1" },
  { label: "縦向き 9:16", value: "9:16" },
  { label: "縦向き 3:4", value: "3:4" },
  { label: "縦向き 2:3", value: "2:3" },
  { label: "その他 5:4", value: "5:4" },
  { label: "その他 4:5", value: "4:5" },
];

const RATIO_DIMENSIONS: Record<string, { width: number; height: number }> = {
  "21:9": { width: 1680, height: 720 },
  "16:9": { width: 1280, height: 720 },
  "4:3": { width: 1200, height: 900 },
  "3:2": { width: 1200, height: 800 },
  "1:1": { width: 1024, height: 1024 },
  "9:16": { width: 720, height: 1280 },
  "3:4": { width: 900, height: 1200 },
  "2:3": { width: 800, height: 1200 },
  "5:4": { width: 1280, height: 1024 },
  "4:5": { width: 1024, height: 1280 },
};

const parseSize = (value: string) => {
  const ratioPreset = RATIO_DIMENSIONS[value];
  if (ratioPreset) return ratioPreset;

  const [widthStr, heightStr] = value.includes("x")
    ? value.split("x")
    : value.split(":");
  const width = Number(widthStr);
  const height = Number(heightStr);

  if (Number.isNaN(width) || Number.isNaN(height)) {
    return { width: 1024, height: 1024 };
  }

  return { width, height };
};

const ZapIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M13 2 4 13.5h6.5L9.5 22 20 9.8h-6.4z" />
  </svg>
);

const WandIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    <path d="M19 4 4.5 18.5" />
    <path d="m14 4 1-2 1 2 2 .5-2 .5-1 2-1-2-2-.5z" />
    <path d="m5 11 1-.5 1 .5.5 1-.5 1-1 .5-1-.5-.5-1z" />
  </svg>
);

const SparklesIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 32 32"
    fill="currentColor"
    aria-hidden="true"
    {...props}
  >
    <path d="M17 3.5 18.5 8 23 9.5 18.5 11 17 15.5 15.5 11 11 9.5 15.5 8z" />
    <path d="M9.5 16 11 19l3 1.5-3 1.5L9.5 25 8 22l-3-1.5 3-1.5z" />
    <path d="m23 18 1.5 4L29 24l-4.5 2-1.5 4-1.5-4L17 24l4.5-2z" />
  </svg>
);

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState("1:1");
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const trimmedPrompt = useMemo(() => prompt.trim(), [prompt]);

  const performGeneration = useCallback(
    async (params?: { prompt?: string; size?: string }) => {
      const requestedPrompt = params?.prompt?.trim() ?? trimmedPrompt;
      const requestedSize = params?.size ?? size;

      if (!requestedPrompt) {
        setErrorMessage("プロンプトを入力してください。");
        return;
      }

      setIsGenerating(true);
      setErrorMessage(null);

      try {
        const response = await fetch("/api/generate-image", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: requestedPrompt,
            size: requestedSize,
          }),
        });

        const data = (await response.json()) as
          | GenerateResponse
          | ErrorResponse;

        if (!response.ok) {
          setErrorMessage(
            (data as ErrorResponse).error ?? "エラーが発生しました。",
          );
          return;
        }

        const { imageUrl } = data as GenerateResponse;

        setImages((prev) => [
          {
            id: crypto.randomUUID(),
            url: imageUrl,
            prompt: requestedPrompt,
            size: requestedSize,
            timestamp: Date.now(),
          },
          ...prev,
        ]);
      } catch (error) {
        console.error("Failed to generate image", error);
        setErrorMessage("ネットワークエラーが発生しました。");
      } finally {
        setIsGenerating(false);
      }
    },
    [size, trimmedPrompt],
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      await performGeneration();
    },
    [performGeneration],
  );

  const handleRegenerate = useCallback(
    async (image: GeneratedImage) => {
      setPrompt(image.prompt);
      setSize(image.size);
      await performGeneration({ prompt: image.prompt, size: image.size });
    },
    [performGeneration],
  );

  return (
    <main className="relative min-h-screen bg-[#FFDEE9] pb-24 font-[var(--font-space-mono)] text-black">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-cross opacity-35"
      />
      <div className="relative z-10 mx-auto max-w-6xl px-4 py-12">
        <header className="relative mb-20 border-4 border-black bg-[#FF0080] p-8 text-white shadow-[8px_8px_0px_0px_#000] transition-transform duration-300 hover:rotate-0 md:rotate-1">
          <div className="flex flex-col gap-4">
            <p className="text-4xl font-bold uppercase leading-[0.85] tracking-tighter drop-shadow-[4px_4px_0px_rgba(0,0,0,0.7)] md:text-7xl">
              Prism AI スタジオ
            </p>
            <span className="w-fit -rotate-1 bg-black px-4 py-1 text-base font-bold uppercase tracking-[0.2em] text-[#FAFF00] shadow-[4px_4px_0px_rgba(255,255,255,1)] md:text-xl">
              Visual Reality Engine v3.0
            </span>
            <p className="max-w-2xl text-sm uppercase tracking-[0.35em] text-slate-100">
              Google Gemini 画像生成プレイグラウンド
            </p>
          </div>
          <div className="absolute -right-6 -top-6 flex h-16 w-16 items-center justify-center rounded-full border-4 border-black bg-[#FAFF00] text-black shadow-[4px_4px_0px_0px_#000]">
            <ZapIcon className="h-8 w-8" />
          </div>
        </header>

        <section className="relative">
          <form
            onSubmit={handleSubmit}
            className="relative z-10 transform border-4 border-black bg-white p-8 shadow-[12px_12px_0px_0px_#000] md:-rotate-1"
          >
            <label className="flex flex-col gap-4">
              <span className="text-xs font-bold uppercase tracking-[0.5em] text-black">
                プロンプト
              </span>
              <textarea
                className="h-32 w-full border-4 border-black px-6 py-4 text-xl uppercase tracking-tight outline-none focus:bg-[#FAFF00]"
                placeholder="例: ネオンに照らされた東京の雨夜をシネマティックに描いて"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
              />
            </label>

            <div className="mt-6 flex flex-wrap gap-3">
              {SIZE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSize(option.value)}
                  className={`border-4 border-black px-5 py-2 text-sm font-bold uppercase tracking-[0.2em] transition-transform ${
                    size === option.value
                      ? "bg-[#FAFF00] shadow-[6px_6px_0px_0px_#000]"
                      : "bg-white hover:-translate-y-1 hover:-translate-x-1 hover:bg-[#FAFF00]/70"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs font-bold uppercase tracking-[0.3em] text-black">
              解像度ではなく比率を選択。比率に合わせた推奨サイズで生成します。
            </p>

            <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-center">
              <button
                type="submit"
                disabled={isGenerating}
                className="flex w-full items-center justify-center gap-3 border-4 border-black bg-black px-8 py-4 text-xl font-bold uppercase text-white transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-40 md:w-auto"
              >
                {isGenerating ? (
                  <span className="flex items-center gap-3">
                    <span className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    生成中です…
                  </span>
                ) : (
                  <>
                    <WandIcon className="h-7 w-7" />
                    画像を生成する
                  </>
                )}
              </button>
              <p className="text-sm uppercase tracking-[0.3em] text-black">
                {isGenerating
                  ? "Gemini がピクセルを組み立てています"
                  : "Neo-Brutal な結果をすぐに表示"}
              </p>
            </div>
          </form>

          {errorMessage && (
            <p className="mt-8 border-4 border-black bg-red-500 px-6 py-4 text-center text-base font-bold uppercase text-white shadow-[8px_8px_0px_0px_#000]">
              エラー: {errorMessage}
            </p>
          )}
        </section>

        <section className="mt-16">
          <div className="mb-8 flex items-center gap-4">
            <div className="h-1 flex-1 bg-black" />
            <p className="rotate-1 border-4 border-black bg-white px-4 py-1 text-base font-bold uppercase shadow-[4px_4px_0px_0px_#000]">
              アイデアサンプル
            </p>
            <div className="h-1 flex-1 bg-black" />
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            {SAMPLE_PROMPTS.map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => setPrompt(sample)}
                className="border-2 border-black bg-white px-6 py-3 text-xs font-bold uppercase tracking-[0.2em] transition hover:bg-[#FAFF00] hover:shadow-[6px_6px_0px_0px_#000]"
              >
                {sample}
              </button>
            ))}
          </div>
        </section>

        {images.length > 0 ? (
          <section className="mt-20">
            <div className="mb-10 flex items-center justify-between">
              <h2 className="text-3xl font-bold uppercase tracking-tighter">
                最新の生成結果
              </h2>
              <p className="text-xs uppercase tracking-[0.4em] text-black/60">
                {images.length} 件
              </p>
            </div>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {images.map((image) => {
                const dimensions = parseSize(image.size);
                return (
                  <article
                    key={image.id}
                    className="group relative border-4 border-black bg-white shadow-[12px_12px_0px_0px_#000] transition hover:-translate-y-2 hover:shadow-[16px_16px_0px_0px_#000]"
                  >
                    <span className="absolute left-4 top-4 -rotate-6 border-4 border-black bg-[#FAFF00] px-3 py-1 text-xs font-bold uppercase shadow-[4px_4px_0px_0px_#000]">
                      生成済み
                    </span>
                    <div className="relative overflow-hidden border-b-4 border-black">
                      <Image
                        src={image.url}
                        alt={image.prompt}
                        width={dimensions.width}
                        height={dimensions.height}
                        unoptimized
                        className="h-full w-full object-cover"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                      <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/0 opacity-0 transition group-hover:bg-black/30 group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => handleRegenerate(image)}
                          disabled={isGenerating}
                          className="border-2 border-black bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-black transition hover:bg-[#FAFF00] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          再生成
                        </button>
                        <a
                          href={image.url}
                          download="generated.png"
                          className="border-2 border-black bg-black px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-white transition hover:bg-white hover:text-black"
                        >
                          DL
                        </a>
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="truncate text-sm uppercase tracking-[0.15em]">
                        {image.prompt}
                      </p>
                      <div className="mt-2 flex items-center justify-between text-xs uppercase tracking-[0.3em] text-black/60">
                        <span>
                          {new Date(image.timestamp).toLocaleTimeString("ja-JP")}
                        </span>
                        <span>{image.size}</span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : (
          <div className="mt-32 select-none text-center opacity-60">
            <div className="mb-4 flex justify-center text-black/40">
              <SparklesIcon className="h-32 w-32" />
            </div>
            <p className="inline-block -rotate-3 border-4 border-black bg-black px-4 py-2 text-2xl font-bold uppercase tracking-tight text-white">
              データなし
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
