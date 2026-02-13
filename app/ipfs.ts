import axios from "axios"

export async function uploadToIPFS(data: any) {
  const res = await axios.post(
    "https://api.pinata.cloud/pinning/pinJSONToIPFS",
    data,
    {
      headers: {
        pinata_api_key: process.env.NEXT_PUBLIC_PINATA_KEY!,
        pinata_secret_api_key: process.env.NEXT_PUBLIC_PINATA_SECRET!,
      },
    }
  )

  return res.data.IpfsHash
}
export async function uploadFileToIPFS(file: File) {
  const formData = new FormData()
  formData.append("file", file)

  const res = await axios.post(
    "https://api.pinata.cloud/pinning/pinFileToIPFS",
    formData,
    {
      maxBodyLength: Infinity,
      headers: {
        "Content-Type": "multipart/form-data",
        pinata_api_key: process.env.NEXT_PUBLIC_PINATA_KEY!,
        pinata_secret_api_key: process.env.NEXT_PUBLIC_PINATA_SECRET!,
      },
    }
  )

  return res.data.IpfsHash
}
