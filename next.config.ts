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

    // Ensure the service worker is correctly handled by webpack
    // This might be needed if you face issues with SW updates or caching in dev
    // For production builds, Next.js usually handles SWs in /public correctly
    if (dev && !isServer) {
      // Example: Force SW to be treated as a separate entry
      // This is often not needed if SW is in `public` and correctly named
    }

    // Important: return the modified config
    return config;
  },
};

export default nextConfig;
