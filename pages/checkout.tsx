import { Inter } from "next/font/google";
import {
  createQR,
  encodeURL,
  findReference,
  validateTransfer,
  FindReferenceError,
  ValidateTransferError,
  TransactionRequestURLFields,
} from "@solana/pay";
import { useEffect, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import BigNumber from "bignumber.js";
import router from "next/router";

const inter = Inter({ subsets: ["latin"] });

export default function Checkout() {
  const initialSearchParams = useSearchParams();
  const amountValue = initialSearchParams.get("amount");

  const connection = new Connection("https://api.devnet.solana.com");
  const usdcAddress = new PublicKey(
    "F3hocsFVHrdTBG2yEHwnJHAJo4rZfnSwPg8d5nVMNKYE"
  );
  const shopAddress = new PublicKey(
    "7sMSXETA5q7V8arZAMZY66RSQC2mAoSfb2nWaBJJXbeZ"
  );

  // Generate the unique reference for this transaction
  const reference = useMemo(() => Keypair.generate().publicKey, []);

  // Create a new URLSearchParams instance to build our queryString
  const searchParams = new URLSearchParams();
  if (amountValue) searchParams.append("amount", amountValue);
  searchParams.append("reference", reference.toString());

  const queryString = searchParams.toString();

  const qrRef = useRef<HTMLDivElement>(null);

  // Show the QR code
  useEffect(() => {
    // Use window.location to get the URL
    const { location } = window;
    const apiUrl = `${location.protocol}//${location.host}/api/transaction?${queryString}`;
    const urlParams: TransactionRequestURLFields = {
      link: new URL(apiUrl),
    };
    const solanaUrl = encodeURL(urlParams);
    const qr = createQR(solanaUrl, 512, "transparent");
    if (qrRef.current) {
      qrRef.current.innerHTML = ""; // Clear out any previous QR codes.
      qr.append(qrRef.current);
    }
  }, [amountValue, queryString]); // Regenerate the QR code whenever the amount or reference changes.

  // Check every 0.5s if the transaction is completed
  useEffect(() => {
    if (amountValue === null) {
      console.error("Amount value is missing.");
      return;
    }

    // Convert the string amountValue to BigNumber
    const amountBigNumber = new BigNumber(amountValue);
    console.log(amountValue);

    const interval = setInterval(async () => {
      try {
        // Check if there's any transaction for the reference
        const signatureInfo = await findReference(connection, reference, {
          finality: "confirmed",
        });

        // Validate the transaction with the expected recipient, amount, and SPL token
        await validateTransfer(
          connection,
          signatureInfo.signature,
          {
            recipient: shopAddress,
            amount: amountBigNumber,
            splToken: usdcAddress,
            reference,
          },
          { commitment: "confirmed" }
        );

        router.push("/confirmed");
      } catch (e) {
        if (e instanceof FindReferenceError) {
          return;
        }
        if (e instanceof ValidateTransferError) {
          console.error("Transaction is invalid", e);
          return;
        }
        console.error("Unknown error", e);
      }
    }, 500);

    return () => {
      clearInterval(interval);
    };
  }, [amountValue]);

  return (
    <main
      className={`flex min-h-screen flex-col items-center justify-between p-24 ${inter.className}`}
    >
      <div ref={qrRef}></div>
    </main>
  );
}
