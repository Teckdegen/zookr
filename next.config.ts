import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Alias Node-only packages to empty stubs so the browser bundle doesn't break.
      // These are pulled in by wagmi's baseAccount connector (which we don't use).
      config.resolve.alias = {
        ...config.resolve.alias,
        'bs58': path.resolve('./lib/empty-stub.js'),
        '@coinbase/cdp-sdk': path.resolve('./lib/empty-stub.js'),
        '@base-org/account': path.resolve('./lib/empty-stub.js'),
      }

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
