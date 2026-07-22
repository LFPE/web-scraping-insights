import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = new Hono();

// Habilita CORS para permitir conexões do React Dashboard
app.use('/*', cors());

// Endpoint de teste básico
app.get('/', (c) => c.json({ name: 'PropIntel API', version: '1.0.0', status: 'ONLINE' }));

// 1. GET /properties - Lista todos os imóveis higienizados
app.get('/properties', async (c) => {
  try {
    const properties = await prisma.property.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return c.json(properties);
  } catch (error: any) {
    return c.json({ error: 'Erro ao buscar imóveis', details: error.message }, 500);
  }
});

// 2. GET /property/:id - Retorna um imóvel específico e seu histórico temporal de preços
app.get('/property/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const property = await prisma.property.findUnique({
      where: { id },
      include: {
        history: {
          orderBy: { capturedAt: 'asc' }
        }
      }
    });

    if (!property) {
      return c.json({ error: 'Imóvel não encontrado' }, 404);
    }

    return c.json(property);
  } catch (error: any) {
    return c.json({ error: 'Erro ao buscar detalhes do imóvel', details: error.message }, 500);
  }
});

// 3. GET /analytics/overview - Estatísticas descritivas (V1 calculada em tempo real)
app.get('/analytics/overview', async (c) => {
  try {
    const properties = await prisma.property.findMany();

    if (properties.length === 0) {
      return c.json({
        totalProperties: 0,
        averagePrice: 0,
        medianPrice: 0,
        averagePricePerM2: 0,
        neighborhoods: []
      });
    }

    // Cálculos estatísticos básicos
    const totalProperties = properties.length;
    const prices = properties.map(p => p.price).sort((a, b) => a - b);
    
    // Média
    const sumPrice = prices.reduce((sum, p) => sum + p, 0);
    const averagePrice = sumPrice / totalProperties;

    // Mediana
    const mid = Math.floor(totalProperties / 2);
    const medianPrice = totalProperties % 2 !== 0 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2;

    // Preço/m² médio
    let validAreaCount = 0;
    let sumPricePerM2 = 0;
    properties.forEach(p => {
      if (p.price && p.area && p.area > 0) {
        sumPricePerM2 += p.price / p.area;
        validAreaCount++;
      }
    });
    const averagePricePerM2 = validAreaCount > 0 ? sumPricePerM2 / validAreaCount : 0;

    // Métricas por Bairro
    const neighborhoodGroups: Record<string, { total: number; sumPrice: number; prices: number[] }> = {};
    properties.forEach(p => {
      const nh = p.neighborhood || 'Não Informado';
      if (!neighborhoodGroups[nh]) {
        neighborhoodGroups[nh] = { total: 0, sumPrice: 0, prices: [] };
      }
      neighborhoodGroups[nh].total++;
      neighborhoodGroups[nh].sumPrice += p.price;
      neighborhoodGroups[nh].prices.push(p.price);
    });

    const neighborhoods = Object.entries(neighborhoodGroups).map(([name, data]) => {
      const sortedNghPrices = data.prices.sort((a, b) => a - b);
      const midNgh = Math.floor(data.total / 2);
      const medianNghPrice = data.total % 2 !== 0 ? sortedNghPrices[midNgh] : (sortedNghPrices[midNgh - 1] + sortedNghPrices[midNgh]) / 2;

      return {
        name,
        count: data.total,
        averagePrice: data.sumPrice / data.total,
        medianPrice: medianNghPrice
      };
    });

    return c.json({
      totalProperties,
      averagePrice,
      medianPrice,
      averagePricePerM2,
      neighborhoods
    });
  } catch (error: any) {
    return c.json({ error: 'Erro ao gerar overview analítico', details: error.message }, 500);
  }
});

// 4. GET /analytics/opportunities - Filtra imóveis com valor 10% abaixo da mediana do bairro
app.get('/analytics/opportunities', async (c) => {
  try {
    const properties = await prisma.property.findMany();
    
    // Agrupa preços por bairro para calcular a mediana local
    const neighborhoodPrices: Record<string, number[]> = {};
    properties.forEach(p => {
      const nh = p.neighborhood || 'Não Informado';
      if (!neighborhoodPrices[nh]) {
        neighborhoodPrices[nh] = [];
      }
      neighborhoodPrices[nh].push(p.price);
    });

    const medians: Record<string, number> = {};
    Object.entries(neighborhoodPrices).forEach(([nh, prices]) => {
      const sorted = prices.sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      medians[nh] = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    });

    // Encontra pechinchas (10% ou mais abaixo da mediana do bairro)
    const opportunities = properties
      .map(p => {
        const nh = p.neighborhood || 'Não Informado';
        const median = medians[nh];
        const pctDiff = median > 0 ? ((p.price - median) / median) * 100 : 0;
        
        return {
          ...p,
          neighborhoodMedian: median,
          discountPercentage: -parseFloat(pctDiff.toFixed(1))
        };
      })
      .filter(p => p.discountPercentage >= 10)
      .sort((a, b) => b.discountPercentage - a.discountPercentage);

    return c.json(opportunities);
  } catch (error: any) {
    return c.json({ error: 'Erro ao buscar oportunidades', details: error.message }, 500);
  }
});

// 5. GET /system/logs - Logs operacionais do pipeline
app.get('/system/logs', async (c) => {
  try {
    const logs = await prisma.pipelineLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    return c.json(logs);
  } catch (error: any) {
    return c.json({ error: 'Erro ao buscar logs do sistema', details: error.message }, 500);
  }
});

// Inicialização do servidor Hono
const port = Number(process.env.PORT) || 3001;
console.log(`[API] Servidor Hono inicializando na porta ${port}...`);

serve({
  fetch: app.fetch,
  port
});
