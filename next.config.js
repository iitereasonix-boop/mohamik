/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { serverComponentsExternalPackages: ["mammoth", "unpdf"] },
};

module.exports = nextConfig;
