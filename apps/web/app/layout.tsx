import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "CDR x A2A — Agent-Native Encrypted Data Markets",
  description:
    "Autonomous agents discover, negotiate, pay for, and unlock encrypted data using A2A, AP2-style mandates, and CDR.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
