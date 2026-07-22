import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Esquema Zod de validação para a tabela final "Property"
const PropertyCleanSchema = z.object({
  provider: z.string(),
  providerId: z.string(),
  title: z.string().min(1),
  price: z.number().positive(),
  area: z.number().positive().nullable(),
  bedrooms: z.number().nonnegative().nullable(),
  bathrooms: z.number().nonnegative().nullable(),
  garage: z.number().nonnegative().nullable(),
  neighborhood: z.string().nullable(),
  city: z.string(),
  url: z.string().url()
});

// Funções de limpeza
function parsePrice(raw: string | null | undefined): number {
  if (!raw) return 0;
  let clean = raw.replace(/R\$\s?/gi, '').trim();
  clean = clean.replace(/,00$/, '');
  clean = clean.replace(/\./g, '');
  clean = clean.replace(/,/g, '.');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
}

function parseNumeric(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const match = raw.match(/\d+(\.\d+)?/);
  if (!match) return null;
  const parsed = parseFloat(match[0]);
  return isNaN(parsed) ? null : parsed;
}

function cleanNeighborhood(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return raw.replace(/(\s?-?\s?(Gramado|Canela))/gi, '').trim() || null;
}

async function runETL() {
  console.log('[ETL] Iniciando processo de limpeza...');
  const startTime = Date.now();
  let itemsFound = 0;
  let itemsValid = 0;

  try {
    const rawProperties = await prisma.rawProperty.findMany();
    itemsFound = rawProperties.length;
    console.log(`[ETL] ${itemsFound} registros brutos encontrados para processar.`);

    for (const raw of rawProperties) {
      const cleanData = {
        provider: raw.provider,
        providerId: raw.providerId,
        title: raw.rawTitle || 'Imóvel sem título',
        price: parsePrice(raw.rawPrice),
        area: parseNumeric(raw.rawArea),
        bedrooms: parseNumeric(raw.rawBedrooms),
        bathrooms: parseNumeric(raw.rawBathrooms),
        garage: parseNumeric(raw.rawGarage),
        neighborhood: cleanNeighborhood(raw.rawNeighborhood),
        city: 'Gramado', // Fixo por enquanto ou extraído do scraper
        url: raw.url
      };

      // Validação usando Zod
      const result = PropertyCleanSchema.safeParse(cleanData);

      if (!result.success) {
        console.warn(`[ETL] Registro inválido pulado (${raw.providerId}):`, result.error.format());
        continue;
      }

      const valid = result.data;
      itemsValid++;

      // Busca se o imóvel já existe na tabela final
      const existing = await prisma.property.findUnique({
        where: {
          provider_providerId: {
            provider: valid.provider,
            providerId: valid.providerId
          }
        }
      });

      let propertyId = '';

      if (existing) {
        propertyId = existing.id;
        // Atualiza se mudou alguma coisa
        await prisma.property.update({
          where: { id: propertyId },
          data: {
            title: valid.title,
            price: valid.price,
            area: valid.area,
            bedrooms: valid.bedrooms,
            bathrooms: valid.bathrooms,
            garage: valid.garage,
            neighborhood: valid.neighborhood,
            url: valid.url
          }
        });

        // Se o preço alterou, insere no histórico
        if (existing.price !== valid.price) {
          console.log(`[ETL] Preço alterado para ${valid.title}: R$ ${existing.price} -> R$ ${valid.price}`);
          await prisma.propertyHistory.create({
            data: {
              propertyId: propertyId,
              price: valid.price
            }
          });
        }
      } else {
        // Cria novo imóvel
        const created = await prisma.property.create({
          data: {
            provider: valid.provider,
            providerId: valid.providerId,
            title: valid.title,
            price: valid.price,
            area: valid.area,
            bedrooms: valid.bedrooms,
            bathrooms: valid.bathrooms,
            garage: valid.garage,
            neighborhood: valid.neighborhood,
            city: valid.city,
            url: valid.url
          }
        });
        propertyId = created.id;

        // Adiciona registro de histórico inicial
        await prisma.propertyHistory.create({
          data: {
            propertyId: propertyId,
            price: valid.price
          }
        });
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[ETL] Higienização concluída. Válidos: ${itemsValid}/${itemsFound}`);

    // Salva logs do pipeline
    await prisma.pipelineLog.create({
      data: {
        stage: 'ETL',
        status: 'SUCCESS',
        itemsFound,
        itemsValid,
        durationMs: duration
      }
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('[ETL] Falha crítica no pipeline:', error);
    
    await prisma.pipelineLog.create({
      data: {
        stage: 'ETL',
        status: 'FAILED',
        itemsFound,
        itemsValid,
        durationMs: duration,
        error: error.message
      }
    });
  } finally {
    await prisma.$disconnect();
  }
}

runETL();
