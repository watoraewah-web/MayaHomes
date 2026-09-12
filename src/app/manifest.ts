import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WFICM Worship Presentation Tool",
    short_name: "WFICM",
    description: "Organize worship lyrics and prepare presentations.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#18181b",
    icons: [],
  };
}
