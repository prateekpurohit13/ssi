export const interactionHubConfig = {
  address: "0x329C75F53B2b85F83B85b123Fd98b93dDE6FE23a", // your deployed hub
  abi: [
    {
      name: "createClaimRequest",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [
        { name: "target", type: "address" },
        { name: "fields", type: "string[]" },
        { name: "reason", type: "string" }
      ],
      outputs: []
    },
    {
      name: "fulfillClaimRequest",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [{ name: "requestId", type: "uint256" }],
      outputs: []
    },
    {
      name: "createAttestation",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [
        { name: "target", type: "address" },
        { name: "text", type: "string" }
      ],
      outputs: []
    },
    {
      name: "getRequestsForUser",
      type: "function",
      stateMutability: "view",
      inputs: [{ name: "user", type: "address" }],
      outputs: [{ type: "uint256[]" }]
    },
    {
      name: "claimRequests",
      type: "function",
      stateMutability: "view",
      inputs: [{ type: "uint256" }],
      outputs: [
        { type: "uint256" }, // id
        { type: "address" }, // requester
        { type: "address" }, // subject
        { type: "string[]" }, // fields
        { type: "string" }, // purpose
        { type: "bool" }, // fulfilled
        { type: "uint256" } // createdAt
      ]
    },
    {
      name: "getAttestations",
      type: "function",
      stateMutability: "view",
      inputs: [{ type: "address" }],
      outputs: [
        {
          components: [
            { type: "address" },
            { type: "address" },
            { type: "string" },
            { type: "uint256" }
          ],
          type: "tuple[]"
        }
      ]
    }
  ]
} as const;