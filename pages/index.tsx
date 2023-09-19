import Image from "next/image";
import { Inter } from "next/font/google";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export default function Home() {
  const [amount, setAmount] = useState("");

  return (
    <main
    className={`flex min-h-screen items-center justify-center p-24 ${inter.className}`}
    >
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle className="text-center">Jimmy's Hot Dog Stand</CardTitle>
          <CardDescription className="text-center">
            Pay with Solana Pay
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  placeholder="8.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Link href={`/checkout?amount=${amount}`} className="w-full">
            <Button className="w-full">Checkout</Button>
          </Link>
        </CardFooter>
      </Card>
    </main>
  );
}
