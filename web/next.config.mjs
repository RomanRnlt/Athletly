/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @athletly/shared ships TypeScript source (no build step); Next must transpile it.
  transpilePackages: ['@athletly/shared'],
};

export default nextConfig;
