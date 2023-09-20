import { NextApiRequest, NextApiResponse } from "next";
import {
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import base58 from "bs58";

export type MakeTransactionInputData = {
  account: string;
};

type MakeTransactionGetResponse = {
  label: string;
  icon: string;
};

export type MakeTransactionOutputData = {
  transaction: string;
  message: string;
};

type ErrorOutput = {
  error: string;
};

function get(res: NextApiResponse<MakeTransactionGetResponse>) {
  res.status(200).json({
    label: "Monstrè Pay",
    icon: "https://shdw-drive.genesysgo.net/HcnRQ2WJHfJzSgPrs4pPtEkiQjYTu1Bf6DmMns1yEWr8/monstre%20logo.png",
  });
}

async function post(
  req: NextApiRequest,
  res: NextApiResponse<MakeTransactionOutputData | ErrorOutput>
) {
  try {
    // We pass the amount to use in the query
    const { amount } = req.query;
    if (!amount || typeof amount !== "string") {
      res.status(400).json({ error: "No amount provided" });
      return;
    }
    console.log("amount is", amount);

    const amountNumber = parseFloat(amount);
    // We pass the buyer's public key in JSON body
    const { account } = req.body as MakeTransactionInputData;
    if (!account) {
      res.status(40).json({ error: "No account provided" });
      return;
    }

    // We pass the reference to use in the query
    const { reference } = req.query;
    if (!reference) {
      res.status(400).json({ error: "No reference provided" });
      return;
    }
    console.log(reference);

    const shopPrivateKey = process.env.SHOP_PRIVATE_KEY as string;
    const shopKeypair = Keypair.fromSecretKey(base58.decode(shopPrivateKey));

    const shopPublicKey = shopKeypair.publicKey;

    const buyerPublicKey = new PublicKey(account);

    const usdcAddress = new PublicKey(
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    );

    const shopUsdcAddress = await getAssociatedTokenAddress(
      usdcAddress,
      shopPublicKey
    );

    // your rpc connection
    const connection = new Connection(
      "https://api.mainnet-beta.solana.com/"
    );

    const fetchQuote = async () => {
      const response = await fetch(
        "https://quote-api.jup.ag/v6/quote?inputMint=DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=1000000&swapMode=ExactOut&slippageBps=50&asLegacyTransaction=true"
      );
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return await response.json();
    };

    const quoteResponse = await fetchQuote();

    // Get the serialized transactions for the swap
    // Use the quote response to call the second API endpoint
    const transactionsResponse = await fetch(
      "https://quote-api.jup.ag/v6/swap",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quoteResponse,
          destinationTokenAccount: shopUsdcAddress.toString(),
          userPublicKey: buyerPublicKey.toString(),
          asLegacyTransaction: true,
        }),
      }
    );

    if (!transactionsResponse.ok) {
      throw new Error(`HTTP error! Status: ${transactionsResponse.status}`);
    }

    const transactions = await transactionsResponse.json();
    const { swapTransaction } = transactions;

    const swapTransactionBuf = Buffer.from(swapTransaction, "base64");

    // 1. Import the necessary libraries from the `@solana/web3.js` package.
    // 2. Decode the base64 string into a `Uint8Array`.
    const decodedTransaction = new Uint8Array(swapTransactionBuf);

    // 3. Deserialize the `Uint8Array` into a Solana transaction object.
    const solanaTransaction = Transaction.from(decodedTransaction);
    // 4. Set the fee payer for the transaction.

    solanaTransaction.feePayer = shopPublicKey;
    solanaTransaction.partialSign(shopKeypair);

    // Serialize the transaction and convert to base64 to return it
    const serializedTransaction = solanaTransaction.serialize({
      // We will need the buyer to sign this transaction after it's returned to them
      requireAllSignatures: false,
    });
    const base64 = serializedTransaction.toString("base64");

    const message = "Thanks for your order!";

    // Return the serialized transaction
    res.status(200).json({
      transaction: base64,
      message,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({ error: "error creating transaction" });
    return;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<
    MakeTransactionGetResponse | MakeTransactionOutputData | ErrorOutput
  >
) {
  if (req.method === "GET") {
    return get(res);
  } else if (req.method === "POST") {
    return await post(req, res);
  } else {
    return res.status(405).json({ error: "Method not allowed" });
  }
}
