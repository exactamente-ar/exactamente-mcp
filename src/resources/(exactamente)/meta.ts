import { type ResourceMetadata } from "xmcp";
import { config } from "../../config";

export const metadata: ResourceMetadata = {
  name: "exactamente-meta",
  title: "Exactamente MCP metadata",
  description: "Server metadata and public API surface exposed through this MCP",
  mimeType: "application/json",
};

export default function meta() {
  return JSON.stringify(
    {
      apiBaseUrl: config.apiBaseUrl,
      tools: [
        "health-check",
        "list-universities",
        "list-faculties",
        "list-careers",
        "search-subjects",
        "get-subject",
        "list-resources",
      ],
      notes: "Read-only MCP for public Exactamente data",
    },
    null,
    2
  );
}
