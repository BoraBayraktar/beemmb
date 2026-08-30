import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV !== "production";
const scriptSrc = isDevelopment ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'" : "script-src 'self' 'unsafe-inline'";
const imgSrc = isDevelopment ? "img-src 'self' https: http: data:" : "img-src 'self' https: data:";
const contentSecurityPolicy = `default-src 'self'; ${imgSrc}; style-src 'self' 'unsafe-inline'; ${scriptSrc}; connect-src 'self'; frame-ancestors 'none';`;

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit", "fontkit"],
  outputFileTracingIncludes: {
    "/api/admin/expense-reports/report/export": ["./node_modules/pdfkit/js/data/**/*"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
      {
        source: "/api/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
