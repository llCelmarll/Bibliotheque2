// utils/testApi.ts - Script de test pour l'API
import { entityService } from '@/services/entityService';

export const testApiIntegration = async () => {
  console.log('🧪 Test de l\'intégration API...');
  
  try {
    // Test recherche auteurs
    console.log('\n📚 Test recherche auteurs:');
    const authors = await entityService.searchAuthors('Hugo', 5);
    console.log('Résultats:', authors);
    
    // Test création auteur
    console.log('\n➕ Test création auteur:');
    const newAuthor = await entityService.createAuthor('Test Auteur API');
    console.log('Auteur créé:', newAuthor);
    
    // Test recherche éditeurs (doit utiliser mock)
    console.log('\n🏢 Test recherche éditeurs (mock):');
    const publishers = await entityService.searchPublishers('Gall', 3);
    console.log('Résultats:', publishers);
    
    console.log('✅ Tests terminés avec succès!');
    
  } catch (error) {
    console.error('❌ Erreur lors des tests:', error);
  }
};