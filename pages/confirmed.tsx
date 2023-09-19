import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export default function Confirmed() {

  return (
    <main
    className={`flex min-h-screen items-center justify-center p-24 ${inter.className}`}
    >
      <h1 className="font-bold text-2xl">Transaction Successful</h1>
    </main>
  );
}
