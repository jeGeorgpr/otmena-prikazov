// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... your existing config ...
  
  // Add this to optimize external resources
  experimental: {
    optimizeCss: true,
  },
  
  // Optimize font loading
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Add timeout for external resources during build
  staticPageGenerationTimeout: 120, // 2 minutes
}

module.exports = nextConfig