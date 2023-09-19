import { NextApiRequest, NextApiResponse } from "next"
import {
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
} from "@solana/spl-token"
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
} from "@solana/web3.js"
import base58 from "bs58"

export type MakeTransactionInputData = {
  account: string
}

type MakeTransactionGetResponse = {
  label: string
  icon: string
}

export type MakeTransactionOutputData = {
  transaction: string
  message: string
}

type ErrorOutput = {
  error: string
}

function get(res: NextApiResponse<MakeTransactionGetResponse>) {
  res.status(200).json({
    label: "Monstrè Pay",
    icon: "https://shdw-drive.genesysgo.net/HcnRQ2WJHfJzSgPrs4pPtEkiQjYTu1Bf6DmMns1yEWr8/monstre%20logo.png",
  })
}

async function post(
  req: NextApiRequest,
  res: NextApiResponse<MakeTransactionOutputData | ErrorOutput>
) {
  try {
    // We pass the amount to use in the query
    const { amount } = req.query
    if (!amount || typeof amount !== "string") {
      res.status(400).json({ error: "No amount provided" })
      return
    }
    console.log("amount is", amount)

    const amountNumber = parseFloat(amount)
    // We pass the buyer's public key in JSON body
    const { account } = req.body as MakeTransactionInputData
    if (!account) {
      res.status(40).json({ error: "No account provided" })
      return
    }

    // We pass the reference to use in the query
    const { reference } = req.query
    if (!reference) {
      res.status(400).json({ error: "No reference provided" })
      return
    }
    console.log(reference)

    // We get the shop private key from .env 
    const shopPrivateKey = process.env.SHOP_PRIVATE_KEY as string
    if (!shopPrivateKey) {
      res.status(500).json({ error: "Shop private key not available" })
    }
    const shopKeypair = Keypair.fromSecretKey(base58.decode(shopPrivateKey))

    const buyerPublicKey = new PublicKey(account)
    const shopPublicKey = shopKeypair.publicKey

    // your rpc connection
    const connection = new Connection("https://api.devnet.solana.com")

    const usdcAddress = new PublicKey(
      "F3hocsFVHrdTBG2yEHwnJHAJo4rZfnSwPg8d5nVMNKYE"
    )

    const buyerUsdcAddress = await getAssociatedTokenAddress(
      usdcAddress,
      buyerPublicKey
    )

    const shopUsdcAddress = await getAssociatedTokenAddress(
      usdcAddress,
      shopPublicKey
    )

    const [{ blockhash, lastValidBlockHeight }] = await Promise.all([
      connection.getLatestBlockhash(),
    ]);

    const transaction = new Transaction({
      feePayer: shopPublicKey,
      blockhash,
      lastValidBlockHeight,
    });

    // Create the instruction to send the usdc from the buyer to the shop
    const usdcTransferInstruction =
      createTransferCheckedInstruction(
        buyerUsdcAddress, // source account 
        usdcAddress, // token address 
        shopUsdcAddress, // destination account
        buyerPublicKey, // owner of source account
        amountNumber * 10 ** 6, // amount to transfer
        6 // decimals of the token - we know this is 6
      )

    // add reference as key in the instruction so that we can query for it upon successful transfer
    usdcTransferInstruction.keys.push({
      pubkey: new PublicKey(reference),
      isSigner: false,
      isWritable: false,
    })

    // Add instruction to the transaction
    transaction.add(usdcTransferInstruction)

    // Sign the transaction as the shop, which is required for fee paying
    // We must partial sign because the transfer instruction still requires the user
    transaction.partialSign(shopKeypair)

    // Serialize the transaction and convert to base64 to return it
    const serializedTransaction = transaction.serialize({
      // We will need the buyer to sign this transaction after it's returned to them
      requireAllSignatures: false,
    })
    const base64 = serializedTransaction.toString("base64")

    const message = "Thanks for your order!"

    // Return the serialized transaction
    res.status(200).json({
      transaction: base64,
      message,
    })
  } catch (err) {
    console.error(err)

    res.status(500).json({ error: "error creating transaction" })
    return
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<
    MakeTransactionGetResponse | MakeTransactionOutputData | ErrorOutput
  >
) {
  if (req.method === "GET") {
    return get(res)
  } else if (req.method === "POST") {
    return await post(req, res)
  } else {
    return res.status(405).json({ error: "Method not allowed" })
  }
}
