/**
 * Gemini Live API WebSocket Proxy Handler
 *
 * This module handles WebSocket connections from frontend clients
 * and proxies them to the Gemini Live API using Vertex AI authentication.
 */

import {
  type FunctionDeclaration,
  GoogleGenAI,
  type LiveConnectConfig,
  type LiveServerMessage,
  type Part,
  type Session,
  Type,
} from '@google/genai';
import type {WebSocket} from 'ws';
import type {
  ClientContentMessage,
  ClientMessage,
  GeminiConfig,
  RealtimeInputMessage,
  SetupMessage,
  ToolResponseMessage,
} from './types.js';
import { product_data } from './product.js';

/**
 * Tool declarations for Gemini Live API
 *
 * These tools are automatically injected into the Gemini session and can be
 * called by the AI model during conversation. The model decides when to use
 * these tools based on user queries.
 *
 * Supported tools:
 * - add/subtract: Basic calculator functions
 * - search_products: Product search with multi-keyword AND logic
 * - cx360: Customer 360 information retrieval
 */
const calculatorTools: FunctionDeclaration[] = [
  {
    name: 'add',
    description: 'Add two numbers together. Use this when the user asks to add or sum numbers.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        a: {
          type: Type.NUMBER,
          description: 'The first number',
        },
        b: {
          type: Type.NUMBER,
          description: 'The second number',
        },
      },
      required: ['a', 'b'],
    },
  },
  {
    name: 'search_products',
    description: 'Search for products based on a keyword. Returns a list of matching products with details.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        keyword: {
          type: Type.STRING,
          description: 'The search keyword',
        },
      },
      required: ['keyword'],
    }

  },
  {
    name: 'cx360',
    description: "Get comprehensive customer information including profile, purchase history, " +
      "segments, preferences, and engagement notes. Returns natural language description " +
      "that's easy for AI to understand and use for recommendations.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        email: {
          type: Type.STRING,
          description: 'email',
        },
      },
      required: ['email'],
    }
  },
  {
    name: 'subtract',
    description: 'Subtract the second number from the first. Use this when the user asks to subtract numbers.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        a: {
          type: Type.NUMBER,
          description: 'The first number (minuend)',
        },
        b: {
          type: Type.NUMBER,
          description: 'The second number to subtract (subtrahend)',
        },
      },
      required: ['a', 'b'],
    },
  },
];


/**
 * Search products by multiple keywords with AND logic
 *
 * Searches across product name, description, category, keywords, and features.
 * All keywords must match for a product to be included in results (AND logic).
 *
 * @param keyword - Space-separated keywords to search for
 * @returns Object containing array of matching products
 *
 * @example
 * search_products('running shoes')
 * // Returns products containing both "running" AND "shoes"
 *
 * search_products('waterproof hiking')
 * // Returns products containing both "waterproof" AND "hiking"
 */
function search_products(keyword: string) {
  // Split keywords by spaces and normalize to lowercase
  const searchKeywords = keyword
    .toLowerCase()
    .split(/\s+/)
    .filter(k => k.length > 0);

  // Return empty result if no valid keywords
  if (searchKeywords.length === 0) {
    return { product: [] };
  }

  // Use real product data from product.ts (12 products)
  const products = product_data.products;

  // Filter products using AND logic (all keywords must match)
  const product = products.filter(p => {
    // Build searchable text from all product fields
    const searchableText = [
      p.name.toLowerCase(),
      p.description.toLowerCase(),
      p.category.toLowerCase(),
      ...(p.keywords || []).map(k => k.toLowerCase()),
      ...(p.features || []).map(f => f.toLowerCase())
    ].join(' ');

    // All keywords must be present (AND logic)
    return searchKeywords.every(keyword =>
      searchableText.includes(keyword)
    );
  });

  return { product };
}

function callCx360Tool(email: string) {
  const info = `The "Pristine Explorer"
Name: Miles Chen
Age: 30
Gender: Male
Occupation: UX Designer
Location: Seattle, WA (Urban resident with easy access to nature)
Income Level: Middle Income (Budget-conscious but willing to pay for durability)
Bio & Personality
Miles is a tech-savvy professional who spends his weekdays in a clean, organized office and his weekends chasing the perfect sunset shot. While he loves the experience of the outdoors—the fresh air, the views, and the exercise—he dislikes the mess associated with it. You will never catch him rolling in the mud or sleeping on the bare ground. He is meticulous, detail-oriented, and values aesthetics just as much as functionality.
Interests & Hobbies
Landscape Photography: He carries expensive camera gear and is terrified of getting dust or grit inside his lenses.
Light Hiking & Trekking: Prefers well-maintained trails over bushwhacking.
Urban Cycling: Commutes to work occasionally but hates arriving sweaty or splashed with road grime.
Tech & Gadgets: Loves integrating technology into his outdoor activities (drones, GPS watches).
Financial Outlook (Moderate Economic Basis)
Miles is financially stable but not wealthy. He researches purchases extensively before buying. He cannot afford to replace gear constantly, so he looks for "investment pieces"—mid-to-high-range products that promise longevity and versatility. He is susceptible to value bundles or financing options (Buy Now, Pay Later) for more expensive items like high-end jackets or tents.
The "Clean Freak" Constraint (Dislikes Dirty/Messy Things)
This is Miles' defining consumer trait.
The Problem: He loves nature but hates the "grime factor" (mud, bugs, sweat, chaotic packing).
The Need: He looks for gear that is stain-resistant, waterproof, easy to wipe down, and anti-microbial.
Organization: He despises a messy backpack. He loves packing cubes, compartmentalized bags, and gear with dedicated pockets for his camera equipment.
Shopping Preferences & Triggers
Style: Minimalist, sleek, "Gorpcore" aesthetic (functional but stylish enough for the city). Avoids overly loud colors or rugged "survivalist" looks.
Keywords that attract him: "Easy-clean," "Water-repellent," "Organized," "Odor-control," "Matte finish."
Deal Breakers: Materials that attract lint/pet hair, light-colored shoes that stain instantly, or complicated gear that is hard to wash.
How Nova (The AI) Should Approach Him:
Tone: Precise, polished, and focusing on specs regarding materials and maintenance.
Strategy: Highlight products with Nano-tech coatings or stain resistance. When suggesting hiking boots, suggest the ones that are easy to rinse off, not the heavy leather ones that hold mud. Suggest accessories like camera inserts or waterproof dry bags to keep his gear spotless.`

  return {
    info
  }
}

/**
 * Execute a tool and return the result
 */
function executeTool(name: string, args: { a: number; b: number }): { result: number } {
  console.log(`[Tool] Executing ${name} with args:`, args);

  switch (name) {
    case 'add':
      return {result: args.a + args.b};
    case 'subtract':
      return {result: args.a - args.b};
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

/**
 * Send a JSON message to the client WebSocket
 */
function sendToClient(ws: WebSocket, type: string, data?: unknown): void {
  if (ws.readyState === 1) {
    // WebSocket.OPEN
    ws.send(JSON.stringify({type, data}));
  }
}

/**
 * Send an error message to the client
 */
function sendError(ws: WebSocket, error: string): void {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify({type: 'error', error}));
  }
}

/**
 * Handle a WebSocket connection from a frontend client
 */
export async function handleProxyConnection(
  clientWs: WebSocket,
  geminiConfig: GeminiConfig
): Promise<void> {
  let geminiSession: Session | null = null;
  let isSetupComplete = false;

  console.log('[Proxy] New client connection');

  // Initialize GoogleGenAI with Vertex AI authentication
  const ai = new GoogleGenAI({
    vertexai: true,
    project: geminiConfig.projectId,
    location: geminiConfig.location,
    googleAuthOptions: {
      keyFilename: geminiConfig.keyFilePath,
    },
  });

  console.log('[Proxy] GoogleGenAI initialized with Vertex AI');

  /**
   * Handle setup message - create Gemini Live session
   */
  async function handleSetup(message: SetupMessage): Promise<void> {
    if (geminiSession) {
      console.log('[Proxy] Session already exists, closing old one');
      geminiSession.close();
    }

    const {config} = message;
    const fullModel = `projects/${geminiConfig.projectId}/locations/${geminiConfig.location}/publishers/google/models/${geminiConfig.modelId}`;

    console.log(`[Proxy] Creating Gemini session with model: ${fullModel}`);

    // Inject calculator tools into config
    const configWithTools: LiveConnectConfig = {
      ...config,
      tools: [
        ...(config.tools || []),
        {functionDeclarations: calculatorTools},
      ],
    };

    configWithTools.thinkingConfig = {
      // includeThoughts: true,
      // thinkingLevel: ThinkingLevel.HIGH
    }


    console.log('[Proxy] Gemini config prepared', configWithTools);
//     configWithTools.systemInstruction = `
// Nova - StrideNova Intelligent Assistant
//     `
    console.log('[Proxy] Injected calculator tools:', calculatorTools.map(t => t.name));

    try {
      geminiSession = await ai.live.connect({
        model: fullModel,
        config: configWithTools,
        callbacks: {
          onopen: () => {
            console.log('[Proxy] Gemini session opened');
            sendToClient(clientWs, 'open');
          },
          onmessage: (message: LiveServerMessage) => {
            handleGeminiMessage(message);
          },
          onerror: (e: ErrorEvent) => {
            console.error('[Proxy] Gemini error:', e.message);
            sendError(clientWs, e.message);
          },
          onclose: (e: CloseEvent) => {
            console.log('[Proxy] Gemini session closed:', e.reason);
            sendToClient(clientWs, 'close', {reason: e.reason});
          },
        },
      });

      isSetupComplete = true;
      console.log('[Proxy] Gemini session created successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[Proxy] Failed to create Gemini session:', errorMessage);
      sendError(clientWs, `Failed to connect to Gemini: ${errorMessage}`);
    }
  }

  /**
   * Handle messages from Gemini and forward to client
   */
  function handleGeminiMessage(message: LiveServerMessage): void {
    // Setup complete
    if (message.setupComplete) {
      console.log('[Proxy] Setup complete');
      sendToClient(clientWs, 'setupComplete');
      return;
    }

    // Tool call - execute locally and respond
    if (message.toolCall) {
      console.log('[Proxy] Tool call received:', message.toolCall);

      const functionCalls = message.toolCall.functionCalls || [];
      const functionResponses: Array<{ id: string; name: string; response: Record<string, unknown> }> = [];

      for (const fc of functionCalls) {
        const {name, args, id} = fc;

        switch (name) {
          case 'search_products':
            const searchResult = search_products((args as any).keyword);
            functionResponses.push({
              id: id || '',
              name: name,
              response: searchResult,
            });
            sendToClient(clientWs, 'toolCall', {
              name,
              args,
              result: searchResult,
            });
            break;

        }

        if (name === 'cx360') {
          const result = callCx360Tool((args as any).email);
          functionResponses.push({
            id: id || '',
            name: name,
            response: result,
          });
          sendToClient(clientWs, 'toolCall', {
            name,
            args,
            result,
          });
        }
        // Check if this is one of our calculator tools
        if (name === 'add' || name === 'subtract') {
          try {
            const result = executeTool(name, args as { a: number; b: number });
            console.log(`[Tool] ${name}(${(args as any).a}, ${(args as any).b}) = ${result.result}`);

            functionResponses.push({
              id: id || '',
              name: name,
              response: result,
            });

            // Also notify client about the tool call for display
            sendToClient(clientWs, 'toolCall', {
              name,
              args,
              result,
            });
          } catch (error) {
            console.error(`[Tool] Error executing ${name}:`, error);
            functionResponses.push({
              id: id || '',
              name: name,
              response: {error: String(error)},
            });
          }
        } else {
          // Forward unknown tools to client
          sendToClient(clientWs, 'toolCall', message.toolCall);
        }
      }

      // Send tool responses back to Gemini
      if (functionResponses.length > 0 && geminiSession) {
        console.log('[Proxy] Sending tool responses to Gemini:', functionResponses);
        geminiSession.sendToolResponse({
          functionResponses,
        });
      }
      return;
    }

    // Tool call cancellation
    if (message.toolCallCancellation) {
      console.log('[Proxy] Tool call cancellation');
      sendToClient(clientWs, 'toolCallCancellation', message.toolCallCancellation);
      return;
    }

    // Server content
    if (message.serverContent) {
      const {serverContent} = message;

      // Interrupted
      if ('interrupted' in serverContent && serverContent.interrupted) {
        console.log('[Proxy] Interrupted');
        sendToClient(clientWs, 'interrupted');
        return;
      }

      // Turn complete
      if ('turnComplete' in serverContent && serverContent.turnComplete) {
        console.log('[Proxy] Turn complete');
        sendToClient(clientWs, 'turnComplete');
      }

      // Model turn with parts
      if ('modelTurn' in serverContent && serverContent.modelTurn) {
        const parts: Part[] = serverContent.modelTurn.parts || [];

        // Extract audio parts
        const audioParts = parts.filter(
          (p) => p.inlineData && p.inlineData.mimeType?.startsWith('audio/pcm')
        );

        // Send audio parts
        for (const audioPart of audioParts) {
          if (audioPart.inlineData?.data) {
            sendToClient(clientWs, 'audio', audioPart.inlineData.data);
          }
        }

        // Send non-audio content
        const otherParts = parts.filter(
          (p) => !p.inlineData || !p.inlineData.mimeType?.startsWith('audio/pcm')
        );

        if (otherParts.length > 0) {
          sendToClient(clientWs, 'content', {
            modelTurn: {parts: otherParts},
          });
        }
      }
    }
  }

  /**
   * Handle realtime input (audio/video)
   */
  function handleRealtimeInput(message: RealtimeInputMessage): void {
    if (!geminiSession || !isSetupComplete) {
      console.warn('[Proxy] Session not ready, dropping realtime input');
      return;
    }

    for (const chunk of message.chunks) {
      geminiSession.sendRealtimeInput({media: chunk});
    }
  }

  /**
   * Handle client content (text)
   */
  function handleClientContent(message: ClientContentMessage): void {
    if (!geminiSession || !isSetupComplete) {
      console.warn('[Proxy] Session not ready, dropping client content');
      return;
    }

    geminiSession.sendClientContent({
      turns: message.turns,
      turnComplete: message.turnComplete,
    });
  }

  /**
   * Handle tool response
   */
  function handleToolResponse(message: ToolResponseMessage): void {
    if (!geminiSession || !isSetupComplete) {
      console.warn('[Proxy] Session not ready, dropping tool response');
      return;
    }

    geminiSession.sendToolResponse({
      functionResponses: message.functionResponses,
    });
  }

  // Handle messages from client
  clientWs.on('message', async (data: Buffer) => {
    try {
      const message: ClientMessage = JSON.parse(data.toString());

      switch (message.type) {
        case 'setup':
          await handleSetup(message);
          break;
        case 'realtimeInput':
          handleRealtimeInput(message);
          break;
        case 'clientContent':
          handleClientContent(message);
          break;
        case 'toolResponse':
          handleToolResponse(message);
          break;
        default:
          console.warn('[Proxy] Unknown message type:', (message as any).type);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[Proxy] Error processing message:', errorMessage);
      sendError(clientWs, errorMessage);
    }
  });

  // Handle client disconnect
  clientWs.on('close', (code: number, reason: Buffer) => {
    console.log(`[Proxy] Client disconnected: ${code} ${reason.toString()}`);
    if (geminiSession) {
      geminiSession.close();
      geminiSession = null;
    }
  });

  // Handle client error
  clientWs.on('error', (error: Error) => {
    console.error('[Proxy] Client WebSocket error:', error.message);
    if (geminiSession) {
      geminiSession.close();
      geminiSession = null;
    }
  });
}
