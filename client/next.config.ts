import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  // 1. Matikan error Turbopack vs Webpack
  turbopack: {}, 

  // 2. Izinkan URL Ngrok (Gunakan serverActions jika ada)
  experimental: {
    serverActions: {
      allowedOrigins: ["*.ngrok-free.app"],
    },
  },

  // 3. Konfigurasi Gambar agar Preview muncul di HP
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.ngrok-free.app',
      },
      {
        protocol: 'https',
        hostname: 'ipfs.io',
      },
    ],
  },
};

export default nextConfig;