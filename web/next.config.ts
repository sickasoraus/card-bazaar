import type { NextConfig } from "next";
import path from "path";

const repoName = "metablazt";
const isGithubActions = process.env.GITHUB_ACTIONS === "true";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  typedRoutes: true,
  basePath: isGithubActions ? `/${repoName}` : undefined,
  assetPrefix: isGithubActions ? `/${repoName}/` : undefined,
  trailingSlash: true,
  outputFileTracingRoot: path.join(__dirname, ".."),
};

export default nextConfig;
