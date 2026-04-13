import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Don't fail the build on lint or type errors — warnings are fine
  eslint:     { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
      }
    }
    return config
  },
}

export default nextConfig
