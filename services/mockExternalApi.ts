
/**
 * Simulates an external, perhaps slightly lower-quality or raw data API.
 * The AI's job is to polish this.
 */
export const callExternalApi = async (endpoint: string, params: any): Promise<string> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    const userMessage = params.message?.toLowerCase() || "";
    const isSpecificUrl = endpoint.includes("tutorialspoint");

    // SIMULATE FAILURE for testing fallback
    if (userMessage.includes("error") || userMessage.includes("fail") || userMessage.includes("break")) {
        throw new Error("500 Internal Server Error: Simulated API Outage");
    }

    let prefix = isSpecificUrl ? "ext_api_v1: " : "sys_msg: ";

    // Basic keyword matching to generate "raw" responses
    if (userMessage.includes("hello") || userMessage.includes("hi")) {
        return `${prefix}user greeting receive. status active. waiting command.`;
    }

    if (userMessage.includes("weather")) {
        return `${prefix}weather cloudy temp 22c wind 10kmh north. rain chance 20. recommend umbrella maybe.`;
    }

    if (userMessage.includes("react")) {
        return `${prefix}react info: js library ui build. components state props. facebook meta maintain. virtual dom fast rendering.`;
    }

    if (userMessage.includes("code") || userMessage.includes("function")) {
        return `${prefix}snippet_db: function test() { console.log('raw data'); } // warning: syntax check skip. return void.`;
    }

    if (userMessage.includes("time")) {
        return `${prefix}${new Date().toISOString()} // format iso8601 raw. timezone utc.`;
    }

    // Default fallback
    return `${prefix}unknown query '${params.message}'. db search result: null. suggestion: ask explicit term.`;
};
