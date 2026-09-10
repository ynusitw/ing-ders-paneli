/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // firebase-admin'in bağımlılık zincirindeki jose/jwks-rsa paketleri webpack ile
  // bundle edilince ESM/CJS çakışmasıyla üretimde çöküyor - Node'a doğrudan bırakılır.
  experimental: {
    serverComponentsExternalPackages: ["firebase-admin"],
  },
};

module.exports = nextConfig;
