for (const k of ["log", "info", "warn"]) {
    // @ts-ignore
    console[k] = (...args) => {
        process.stderr.write(`[${k}] ` + args.map(a => (typeof a === "string" ? a : JSON.stringify(a))).join(" ") + "\n");
    };
}
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { fetchTranistData, getGoogleMapsUserQuery } from "./helper.js";
export const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || "";
if (!GOOGLE_MAPS_API_KEY) {
    console.error("GOOGLE_MAPS_API_KEY environment variable is not set.");
}
const GOOGLE_MAPS_API_URL = "https://maps.googleapis.com/maps/api/directions/json";
const GOOGLE_QUERY_MAPS_API_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json";
export const User_AGENT = "whatsapp-mcp-maps/1.0.0";
console.log = (...args) => {
    console.error("[redirected-log]", ...args);
};
const server = new McpServer({
    name: "mcp-maps",
    description: "A Model Context Protocol server for Google Maps.",
    version: "1.0.0",
    capabilities: {
        resources: {},
        tools: {},
    },
});
server.tool("user-query-fulfillment", "Fulfill the user query searching about some location on Google Maps", {
    query: z.string().describe("The query to search for on Google Maps."),
}, async ({ query }) => {
    const data = await getGoogleMapsUserQuery(GOOGLE_QUERY_MAPS_API_URL, query);
    return { content: [{ type: "text", text: JSON.stringify(data) }] };
});
server.tool("transit-data-fetch", "Fetch transit data for a user-defined origin and destination.", {
    userData: z.object({
        origin: z.string().describe("The starting point of the journey."),
        destination: z.string().describe("The endpoint of the journey."),
        mode: z.enum(["driving", "walking", "bicycling", "transit"]).describe("The mode of transportation for the journey."),
    }),
}, async ({ userData }) => {
    const data = await fetchTranistData(GOOGLE_MAPS_API_URL, userData);
    return { content: [{ type: "text", text: JSON.stringify(data) }] };
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("mcp-maps server connected (logging only on stderr).");
}
main().catch((error) => {
    console.error("Error starting the server:", error);
    process.exit(1);
});
