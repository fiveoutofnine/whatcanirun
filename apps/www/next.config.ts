import type { NextConfig } from 'next';

import createMDX from '@next/mdx';

const nextConfig: NextConfig = {
  cacheComponents: true,
  images: {
    remotePatterns: [{ hostname: 'assets.peval.io' }],
  },
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
  transpilePackages: ['next-mdx-remote'],
  webpack: (config) => {
    // Add rule for handling text files
    config.module.rules.push({
      test: /\.txt$/,
      type: 'asset/source',
    });
    config.experiments = { ...config.experiments, asyncWebAssembly: true };

    return config;
  },
};

const withMDX = createMDX({
  options: {
    remarkPlugins: ['remark-math'],
    rehypePlugins: ['rehype-katex', 'rehype-mdx-code-props'],
  },
});

export default withMDX(nextConfig);
