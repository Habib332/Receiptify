require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function test() {
  try {
    console.log("Testing Gemini...");
    console.log("API key exists:", !!process.env.GEMINI_API_KEY);

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: "Say exactly: Gemini is working",
    });

    console.log("SUCCESS!");
    console.log("Response:", response.text);
  } catch (error) {
    console.error("GEMINI FAILED!");
    console.error("Message:", error.message);
    console.error("Status:", error.status);
    console.error(error);
  }
}

test();
