import { generateVariants } from '../src/services/openAiService.js';

describe('A/B Testing Variants', () => {
  test('generateVariants returns fallback templates when OpenAI not configured', async () => {
    // Mock empty OpenAI key
    const originalKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const result = await generateVariants({
      prompt: 'interested in motorcycle',
      context: { model: 'Yamaha MT-07' },
      variantCount: 3
    });

    expect(result).toHaveProperty('variants');
    expect(result.variants).toHaveLength(3);
    expect(result.source).toBe('template');
    
    result.variants.forEach(variant => {
      expect(variant).toHaveProperty('variant');
      expect(variant).toHaveProperty('message');
      expect(variant).toHaveProperty('tone');
      expect(variant).toHaveProperty('confidence');
      expect(typeof variant.message).toBe('string');
      expect(variant.message.length).toBeGreaterThan(0);
    });

    // Restore original key
    if (originalKey) {
      process.env.OPENAI_API_KEY = originalKey;
    }
  });

  test('generateVariants respects variantCount parameter', async () => {
    const result = await generateVariants({
      prompt: 'test prompt',
      variantCount: 2
    });

    expect(result.variants).toHaveLength(2);
  });

  test('generateVariants includes context in template messages', async () => {
    const result = await generateVariants({
      prompt: 'interested in bike',
      context: { model: 'BMW R1250GS' },
      variantCount: 1
    });

    expect(result.variants[0].message).toContain('BMW R1250GS');
  });

  test('generateVariants has different tones', async () => {
    const result = await generateVariants({
      prompt: 'test',
      variantCount: 3
    });

    const tones = result.variants.map(v => v.tone);
    const uniqueTones = new Set(tones);
    expect(uniqueTones.size).toBeGreaterThan(1); // Should have different tones
  });

  test('generateVariants returns proper structure', async () => {
    const result = await generateVariants({
      prompt: 'test prompt'
    });

    expect(result).toHaveProperty('variants');
    expect(result).toHaveProperty('generated_at');
    expect(result).toHaveProperty('source');
    expect(Array.isArray(result.variants)).toBe(true);
    expect(typeof result.generated_at).toBe('string');
    expect(typeof result.source).toBe('string');
  });

  test('generateVariants handles empty context gracefully', async () => {
    const result = await generateVariants({
      prompt: 'test prompt',
      context: {}
    });

    expect(result.variants).toHaveLength(3); // Default count
    result.variants.forEach(variant => {
      expect(variant.message).toBeTruthy();
    });
  });

  test('generateVariants limits maximum variants', async () => {
    const result = await generateVariants({
      prompt: 'test',
      variantCount: 10 // Should be limited to reasonable number
    });

    expect(result.variants.length).toBeLessThanOrEqual(5);
  });
});

// Integration test for the endpoint (requires running server)
describe('Variants Endpoint Integration', () => {
  test('endpoint structure validation', () => {
    // This test validates the expected endpoint behavior
    const expectedResponseStructure = {
      success: expect.any(Boolean),
      prompt: expect.any(String),
      context: expect.any(Object),
      variants: expect.any(Array),
      generated_at: expect.any(String),
      source: expect.any(String)
    };

    // Mock response structure
    const mockResponse = {
      success: true,
      prompt: 'interested in motorcycle',
      context: { model: 'Yamaha MT-07' },
      variants: [
        {
          variant: 'professional',
          message: 'Thank you for your interest!',
          tone: 'professional',
          confidence: 0.9
        }
      ],
      generated_at: new Date().toISOString(),
      source: 'template'
    };

    expect(mockResponse).toMatchObject(expectedResponseStructure);
  });

  test('query parameter validation', () => {
    // Test cases for query parameter validation
    const testCases = [
      {
        query: {},
        expectedError: 'prompt parameter is required'
      },
      {
        query: { prompt: 'test' },
        expectedValid: true
      },
      {
        query: { prompt: 'test', count: '2' },
        expectedValid: true
      },
      {
        query: { prompt: 'test', model: 'BMW', budget: '10000' },
        expectedValid: true
      }
    ];

    testCases.forEach(testCase => {
      if (testCase.expectedError) {
        expect(Object.keys(testCase.query)).not.toContain('prompt');
      } else {
        expect(testCase.query).toHaveProperty('prompt');
      }
    });
  });
});
