import path from 'path'
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
    // En monorepo, apuntamos a la raíz del workspace para que Turbopack
    // pueda compilar archivos en packages/* que están fuera de apps/web.
    // __dirname es siempre apps/web (directorio de este config file).
    root: path.resolve(__dirname, '../..'),
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
};

export default nextConfig;
