import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Web 开发课程",
  description: "一个可以逐步扩展的全栈 Web 课程项目",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
