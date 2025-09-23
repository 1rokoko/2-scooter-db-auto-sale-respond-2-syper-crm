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

  const completion = await openAiClient.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{
      role: 'system',
      content: 'You are an AI sales assistant for a premium motorcycle dealership.'
    }, {
      role: 'user',
      content: `${prompt}\n\nContext: ${JSON.stringify(context).slice(0, 4000)}`
    }],
    max_tokens: 500,
    temperature: 0.7
  });

  const text = completion.choices[0]?.message?.content || 'Let me check on that and get back to you shortly.';

  return {
    message: text,
    confidence: 0.85
  };
};

export const generateVariants = async ({ prompt, context = {}, variantCount = 3 }) => {
  if (!openAiClient) {
    // Fallback templates when OpenAI is not configured
    const templates = [
      {
        variant: 'professional',
        message: `Thank you for your interest! Our ${context.model || 'premium motorcycles'} offer exceptional value. Would you like to schedule a test ride?`,
        tone: 'professional',
        confidence: 0.9
      },
      {
        variant: 'friendly',
        message: `Hey there! 🏍️ Excited about our ${context.model || 'bikes'}? Let's get you on the road! When can you come by for a test ride?`,
        tone: 'friendly',
        confidence: 0.9
      },
      {
        variant: 'urgent',
        message: `Limited time offer on our ${context.model || 'motorcycles'}! Don't miss out - only a few units left. Contact us today!`,
        tone: 'urgent',
        confidence: 0.9
      }
    ];

    return {
      variants: templates.slice(0, variantCount),
      generated_at: new Date().toISOString(),
      source: 'template'
    };
  }

  try {
    const systemPrompt = `You are a sales copywriter for a premium motorcycle dealership.
Generate ${variantCount} different sales message variants with different tones and approaches.
Each variant should be engaging, professional, and tailored to motorcycle enthusiasts.

Return a JSON array with this structure:
[
  {
    "variant": "variant_name",
    "message": "sales message text",
    "tone": "tone_description"
  }
]`;

    const userPrompt = `Create ${variantCount} sales message variants for this context:
Prompt: ${prompt}
Context: ${JSON.stringify(context)}

Make each variant unique in tone and approach while maintaining professionalism.`;

    const completion = await openAiClient.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 800,
      temperature: 0.8
    });

    const responseText = completion.choices[0]?.message?.content || '[]';

    try {
      const variants = JSON.parse(responseText);
      return {
        variants: variants.map(v => ({
          ...v,
          confidence: 0.85
        })),
        generated_at: new Date().toISOString(),
        source: 'openai'
      };
    } catch (parseError) {
      // Fallback if JSON parsing fails
      return {
        variants: [{
          variant: 'ai_generated',
          message: responseText,
          tone: 'mixed',
          confidence: 0.7
        }],
        generated_at: new Date().toISOString(),
        source: 'openai_fallback'
      };
    }
  } catch (error) {
    // Return template fallback on any error
    return {
      variants: [{
        variant: 'error_fallback',
        message: 'Thank you for your interest in our motorcycles. Please contact us for more information.',
        tone: 'neutral',
        confidence: 0.5
      }],
      generated_at: new Date().toISOString(),
      source: 'error_fallback',
      error: error.message
    };
  }
};
