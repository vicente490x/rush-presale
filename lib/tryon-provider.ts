import { fal } from '@fal-ai/client';

export interface TryOnProvider {
  generate(modelImage: string, garmentImage: string): Promise<{ imageUrl: string; attempts: number }>;
}

export class FalFashnProvider implements TryOnProvider {
  constructor(private readonly key: string, private readonly modelId = 'fal-ai/fashn/tryon') {}

  async generate(modelImage: string, garmentImage: string) {
    fal.config({ credentials: this.key });
    let lastError: unknown;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const result = await fal.subscribe(this.modelId, {
          input: {
            model_image: modelImage,
            garment_image: garmentImage,
            category: 'tops',
            mode: 'balanced'
          },
          logs: false
        });
        const data = result.data as { images?: Array<{ url?: string }> };
        const imageUrl = data.images?.[0]?.url;
        if (!imageUrl || !imageUrl.startsWith('https://')) throw new Error('Il provider non ha restituito un’immagine valida.');
        return { imageUrl, attempts: attempt };
      } catch (error) {
        lastError = error;
        if (attempt === 2) break;
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }
    throw lastError instanceof Error ? lastError : new Error('Il provider non ha completato la prova virtuale.');
  }
}
