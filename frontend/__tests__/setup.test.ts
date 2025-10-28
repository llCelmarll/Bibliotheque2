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

  it('should mock modules correctly', () => {
    // Vérifier que les mocks Expo sont en place
    const mockRouter = require('expo-router').useRouter();
    expect(typeof mockRouter.push).toBe('function');
    expect(jest.isMockFunction(mockRouter.push)).toBe(true);
  });
});