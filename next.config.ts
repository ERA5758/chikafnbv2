
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'era5758.co.id',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      }
    ],
  },
  // Core next settings
  output: 'standalone',

  // Ensure ALL server-only packages are treated as externals for server components
  serverExternalPackages: [
    'firebase-admin',
    'genkit',
    '@genkit-ai/core',
    'genkitx-openai',
    '@genkit-ai/firebase',
    '@genkit-ai/next',
    '@genkit-ai/google-genai',
    'zod',
  ],

  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Prevent server-only packages from being bundled into client builds
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'firebase-admin': false,
        'child_process': false,
        'fs': false,
        'net': false,
        'tls': false,
        'os': false,
        'path': false,
        'crypto': false,
        'http2': false,
        'dns': false,
        'async_hooks': false,
        'dgram': false,
      };
    }
    return config;
  },
};

export default nextConfig;
