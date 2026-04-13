import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Stub out Node.js-only modules that leak into browser bundles
      // via wagmi connectors / coinbase SDK
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        bs58: false,
      }
    }
    return config
  },
}

export default nextConfig
