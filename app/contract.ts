export const contractConfig = {
  address: "0xEf5bCeB0F946f360aBf0dd42ff3736f64Ece73e3",
  abi: [
    {
      name: "issueCredential",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [
        { name: "user", type: "address" },
        { name: "credentialHash", type: "bytes32" },
        { name: "ipfsCID", type: "string" }
      ],
      outputs: []
    },
    {
      name: "getUserCredentials",
      type: "function",
      stateMutability: "view",
      inputs: [{ name: "user", type: "address" }],
      outputs: [{
        components: [
          { name: "credentialHash", type: "bytes32" },
          { name: "ipfsCID", type: "string" },
          { name: "issuer", type: "address" },
          { name: "isValid", type: "bool" },
          { name: "issuedAt", type: "uint256" }
        ],
        type: "tuple[]"
      }]
    },
    {
    name: "revokeCredential",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
        { name: "user", type: "address" },
        { name: "credentialHash", type: "bytes32" }
    ],
    outputs: []
    }

  ]
} as const
