import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CipherVault — Encrypted Web3 Vault",
    short_name: "CipherVault",
    description: "Decentralized zero-knowledge encrypted vault and data marketplace on Avalanche Subnet",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#091540",
    theme_color: "#1B2CC1",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
