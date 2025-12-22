/**
 * Tests de base pour valider la configuration Jest
 */

describe('Configuration Jest', () => {
  it('should run basic JavaScript test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle async operations', async () => {
    const promise = new Promise(resolve => {
      setTimeout(() => resolve('success'), 100);
    });
    
    await expect(promise).resolves.toBe('success');
  });

  it('should support TypeScript', () => {
    // Vérifier que TypeScript fonctionne correctement
    const testObject: { value: number } = { value: 42 };
    expect(testObject.value).toBe(42);
  });
});