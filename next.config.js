import withPWAInit from 'next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development', // Disable PWA in development to avoid caching issues
});

/** @type {import('next').NextConfig} */
const nextConfig = {
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
    ],
  },
  webpack: (config, { isServer, dev }) => {
    // For client-side bundles, provide an empty mock for 'async_hooks'
    // to prevent "Module not found" errors.
    if (!isServer) {
      config.resolve.fallback = {
        // Ensure we spread any existing fallbacks
        ...(config.resolve.fallback || {}), 
        'async_hooks': false, // Mock async_hooks
      };
    }
    return config;
  },
};

export default withPWA(nextConfig);
