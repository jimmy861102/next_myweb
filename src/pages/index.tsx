// pages/index.tsx
import React from "react";
import Link from "next/link";

export default function Home() {
  return (
    <div>
      <nav>
        <Link href="/foodcount">前往 About 頁面</Link>
      </nav>
    </div>
  );
}
