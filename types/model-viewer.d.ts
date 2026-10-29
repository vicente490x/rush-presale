import type { DetailedHTMLProps, HTMLAttributes } from 'react';
import type { ModelViewerElement } from '@google/model-viewer';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': DetailedHTMLProps<HTMLAttributes<ModelViewerElement>, ModelViewerElement> & {
        src: string;
        alt: string;
        poster?: string;
        'camera-controls'?: boolean;
        'disable-pan'?: boolean;
        'touch-action'?: 'pan-y' | 'none';
        'camera-orbit'?: string;
        'min-camera-orbit'?: string;
        'max-camera-orbit'?: string;
        'field-of-view'?: string;
        'environment-image'?: string;
        'shadow-intensity'?: string;
        'shadow-softness'?: string;
        'rotation-per-second'?: string;
        'interaction-prompt'?: 'auto' | 'none';
        exposure?: string;
        loading?: 'auto' | 'lazy' | 'eager';
        reveal?: 'auto' | 'manual';
      };
    }
  }
}
