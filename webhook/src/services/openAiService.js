import OpenAI from 'openai';
import config from '../config.js';

const openAiClient = config.openAiApiKey ? new OpenAI({ apiKey: config.openAiApiKey }) : null;

export const generateResponse = async ({ prompt, context }) => {
  if (!openAiClient) {
    return {
      message: 'AI is not configured yet. Please add an OPENAI_API_KEY to the environment.',
      confidence: 0
    };
  }

  const completion = await openAiClient.responses.create({
    model: 'gpt-4.1-mini',
    input: [{
      role: 'system',
      content: 'You are an AI sales assistant for a premium motorcycle dealership.'
    }, {
      role: 'user',
      content: prompt
    }, {
      role: 'assistant',
      content: JSON.stringify(context).slice(0, 4000)
    }]
  });

  const text = completion.output_text || 'Let me check on that and get back to you shortly.';

  return {
    message: text,
    confidence: 0.85
  };
};
