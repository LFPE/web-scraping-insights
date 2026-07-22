import { PrismaClient } from '@prisma/client';
import { scrapeRealizaImoveis } from './providers/realiza';

const prisma = new PrismaClient();

async function runScraper() {
  console.log('[Scraper] Iniciando extração...');
  try {
    const realizaData = await scrapeRealizaImoveis();
    
    console.log(`[Scraper] Salvando ${realizaData.length} registros no RawProperty...`);
    
    for (const data of realizaData) {
      await prisma.rawProperty.upsert({
        where: {
          provider_providerId: {
            provider: 'realiza-imoveis',
            providerId: data.providerId
          }
        },
        update: {
          rawTitle: data.rawTitle,
          rawPrice: data.rawPrice,
          rawArea: data.rawArea,
          rawBedrooms: data.rawBedrooms,
          rawNeighborhood: data.rawNeighborhood,
          url: data.url,
          scrapedAt: new Date()
        },
        create: {
          provider: 'realiza-imoveis',
          providerId: data.providerId,
          rawTitle: data.rawTitle,
          rawPrice: data.rawPrice,
          rawArea: data.rawArea,
          rawBedrooms: data.rawBedrooms,
          rawNeighborhood: data.rawNeighborhood,
          url: data.url
        }
      });
    }

    console.log('[Scraper] Extração concluída com sucesso!');
  } catch (error) {
    console.error('[Scraper] Erro durante a extração:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runScraper();
