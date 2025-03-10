import { openai } from "@ai-sdk/openai";
import { convertToCoreMessages, streamText, Message } from "ai";
import { Pica } from "@picahq/ai";
import { z } from "zod";

export async function POST(request: Request) {
  const { messages }: { messages: Message[] } = await request.json();

  const pica = new Pica(process.env.PICA_SECRET_KEY as string);

  const system = await pica.generateSystemPrompt(`
    You are a helpful robot that can self reflect on your abilities and use tools to help you.
    Whenever you feel like you need a new tool/api, you should use the APIGenerationTool tool to generate a new tool/api.
    For example, if the user wants to get some recommendations for a dish, and you realize you don't have a tool for that,
    you should use this tool to generate a new tool, in this case, a tool that queries the Uber Eats API.
    Don't forget to always tell user what you are going to do before you do it.
  `);
  const stream = streamText({
    model: openai("gpt-4o"),
    system,
    tools: {
      ...pica.oneTool,
      showButton: {
        name: "showButton",
        description: "Show a button",
        parameters: z.object({
        }),
      },
      log: {
        name: "log",
        description: "Log a message to the console",
        parameters: z.object({
            message: z.string(),
          }),
          execute: async ({ message }) => {
            console.log(message);
            return {
              error: "Could not log"
            };
          },
      },
      APIGenerationTool: {
        name: "APIGenerationTool",
        description: `Generate an API call on the fly. 
          It calls a backend service that generates an API call based on the desired API usage.
          For example, if the user wants to get some recommendations for a dish, and you realize you don't have a tool for that,
          you should use this tool to generate a new tool, in this case, a tool that queries the Uber Eats API.
        `,
        parameters: z.object({
          api_usage_needed: z.string(),
        }),
        execute: async ({ api_usage_needed }) => {
          console.log(api_usage_needed);
          try {
            const response = await fetch(`http://127.0.0.1:8000/run-integuru?api_usage_needed=${encodeURIComponent(api_usage_needed)}`);
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return {
              status: "Successfully sent request to generate API call for " + api_usage_needed,
              prompt_to_user: `Tell user that you have started generating an API call that does ${api_usage_needed} and will tell them when it's done. 
              In the meantime, you can continue to help them with their other request.`,
              tool_response: data,
            };
          } catch (error) {
            console.error("Error generating API call:", error);
            return {
              error: "Could not generate API call"
            };
          }
          
        },
      },
      deployNewTool: {
        name: "deployNewTool",
        description: `Deploy a new tool so this tool can be used in the future.
        `,
        parameters: z.object({
          tool_name: z.string(),
        }),
        execute: async ({ tool_name }) => {
          console.log(tool_name);
          try {
            const response = await fetch(`http://127.0.0.1:8000/deploy-tool?tool_name=${encodeURIComponent(tool_name)}`);
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log(data)
            return {
              status: data.status,
              prompt_to_user: `Tell user that you have deployed a new tool and will tell them what it is.`,
              tool_response: data,
            };
          } catch (error) {
            console.error("Error deploying new tool:", error);
            return {
              error: "Could not deploy new tool"
            };
          }
        },
      },
      UberEatsSushiRecommendations: {
        name: "UberEatsSushiRecommendations",
        description: "Fetch sushi recommendations from UberEats based on the type of dish requested.",
        parameters: z.object({
          dish_type: z.string().default("sushi"),
        }),
        execute: async ({ dish_type }) => {
          try {
            const response = await fetch(`http://127.0.0.1:8000/ubereats-sushi-recommendations?dish_type=${encodeURIComponent(dish_type)}`);
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return {
              status: "Successfully fetched sushi recommendations",
              recommendations: data.results,
            };
          } catch (error) {
            console.error("Error fetching sushi recommendations:", error);
            return {
              error: "Could not fetch sushi recommendations"
            };
          }
        },
      },
      SteamGameRecommendations: {
        name: "SteamGameRecommendations",
        description: "Fetch Steam game recommendations based on the type of game requested.",
        parameters: z.object({
          game_type: z.string().default("action"),
        }),
        execute: async ({ game_type }: { game_type: string }) => {
          try {
            const response = await fetch(`http://127.0.0.1:8000/run-steam-rec?game_type=${encodeURIComponent(game_type)}`);
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return {
              status: data.status,
              recommendations: data.results,
            };
          } catch (error) {
            console.error("Error fetching Steam game recommendations:", error);
            return {
              error: "Could not fetch Steam game recommendations"
            };
          }
        },
      },
    },
    messages: convertToCoreMessages(messages),
    maxSteps: 20,
  });

  console.log(messages?.[1]?.parts);

  return (await stream).toDataStreamResponse();
}