import { fal } from '@fal-ai/client';
import { appEnv } from '@/lib/config';

export interface TryOnProvider {
  generate(modelImage: string, garmentImage: string): Promise<{ imageUrl: string; attempts: number }>;
}

export class MockTryOnProvider implements TryOnProvider {
  async generate(_modelImage: string, _garmentImage: string) {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000"><rect width="100%" height="100%" fill="#111111"/><circle cx="400" cy="300" r="160" fill="#7b1e1e" opacity="0.9"/><rect x="250" y="340" width="300" height="340" rx="36" fill="#b71234"/><text x="400" y="520" fill="white" font-family="Arial" font-size="60" text-anchor="middle">RUSH</text></svg>';
    return { imageUrl: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`, attempts: 1 };
  }
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

export function createTryOnProvider() {
  if (process.env.TRYON_PROVIDER_MODE === 'mock' && appEnv !== 'production') return new MockTryOnProvider();
  if (!process.env.FAL_KEY) throw new Error('Provider try-on non configurato.');
  return new FalFashnProvider(process.env.FAL_KEY, process.env.TRYON_MODEL_ID ?? 'fal-ai/fashn/tryon');
}
