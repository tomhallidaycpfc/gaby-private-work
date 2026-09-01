import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Gaby's Private Work",
    short_name: "Gaby's Work",
    description: 'Appointment management and invoicing for Gaby De Luca',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#3e3a53',
    icons: [
      {
        src: '/apple-icon.png',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/apple-icon.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/apple-icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
