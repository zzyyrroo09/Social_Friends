/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        // Supabase Storage CDN
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb", // Allow larger form submissions for media metadata
    },
  },
  serverExternalPackages: ["firebase-admin", "firebase-admin/app", "firebase-admin/auth", "firebase-admin/firestore"],
};

export default nextConfig;
