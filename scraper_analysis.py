import os
import re
import json
import random
import logging
import pandas as pd

class RealEstateScraper:
    def __init__(self, output_csv="output/imoveis_limpos.csv", output_json="output/oportunidades_mercado.json"):
        self.output_csv = output_csv
        self.output_json = output_json
        self.logger = self._setup_logging()
        self.neighborhoods = ["Centro", "Planalto", "Bavária", "Várzea Grande", "Carniel", "Floresta"]
        self.base_prices = {
            "Centro": 14000, "Planalto": 12000, "Bavária": 11000,
            "Carniel": 9000, "Floresta": 8500, "Várzea Grande": 6500
        }

    def _setup_logging(self):
        # Configura o registro de logs estruturado
        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s [%(levelname)s] %(message)s",
            handlers=[
                logging.StreamHandler(),
                logging.FileHandler("scraper.log", encoding="utf-8")
            ]
        )
        return logging.getLogger("RealEstateScraper")

    def simulate_scraping(self, count=150):
        """Simula a extração de anúncios do portal imobiliário."""
        self.logger.info(f"Simulando raspagem de {count} anúncios...")
        raw_data = []
        random.seed(123)
        
        try:
            for _ in range(count):
                neighborhood = random.choice(self.neighborhoods)
                base = self.base_prices[neighborhood]
                
                area = random.randint(45, 220)
                variation = random.uniform(0.85, 1.25)
                
                # Oportunidade especial aleatória
                if random.random() > 0.95:
                    variation = random.uniform(0.60, 0.75)
                    
                price = int(area * base * variation)
                rooms = random.choice([1, 2, 3, 4])
                
                # Simula dados sujos de scraping
                price_text = f"R$ {price:,.2f}".replace(",", ".")
                area_text = f"{area} m²" if random.random() > 0.3 else f"{area}m2"
                title = f"Apartamento com {rooms} quartos à venda no {neighborhood}"
                bairro_text = f" Gramado - {neighborhood} / RS  "
                
                raw_data.append({
                    "titulo_bruto": title,
                    "preco_bruto": price_text,
                    "area_bruta": area_text,
                    "bairro_bruto": bairro_text,
                })
            
            self.logger.info(f"Raspagem simulada com sucesso. {len(raw_data)} itens coletados.")
            return pd.DataFrame(raw_data)
        except Exception as e:
            self.logger.error(f"Erro ao simular raspagem: {e}")
            raise

    def clean_data(self, df):
        """Aplica regras de expressões regulares e conversão de tipos nos dados brutos."""
        self.logger.info("Iniciando limpeza dos dados extraídos...")
        try:
            # 1. Regex para Limpeza de Preço (R$ 500.000,00 -> 500000.0)
            def _clean_price(price_str):
                if not isinstance(price_str, str): return 0.0
                cleaned = re.sub(r"[^\d]", "", price_str)
                return float(cleaned) / 100 if cleaned else 0.0

            # 2. Regex para Área (85 m² -> 85.0)
            def _clean_area(area_str):
                if not isinstance(area_str, str): return 0.0
                match = re.search(r"\d+", area_str)
                return float(match.group()) if match else 0.0

            # 3. Regex para Bairro
            def _clean_neighborhood(text):
                if not isinstance(text, str): return "Não Informado"
                match = re.search(r"-\s*(.*?)\s*/", text)
                return match.group(1).strip() if match else text.strip()

            # 4. Regex para Quantidade de Quartos
            def _extract_rooms(title):
                match = re.search(r"(\d+)\s*quarto", title, re.IGNORECASE)
                return int(match.group(1)) if match else 1

            df["Preco"] = df["preco_bruto"].apply(_clean_price)
            df["Area"] = df["area_bruta"].apply(_clean_area)
            df["Bairro"] = df["bairro_bruto"].apply(_clean_neighborhood)
            df["Quartos"] = df["titulo_bruto"].apply(_extract_rooms)
            
            # Remove imóveis sem área válida para evitar divisão por zero
            df = df[df["Area"] > 0].copy()
            df["Preco_M2"] = df["Preco"] / df["Area"]
            
            cleaned_df = df[["Bairro", "Quartos", "Area", "Preco", "Preco_M2"]].copy()
            self.logger.info("Limpeza e conversão de dados concluída.")
            return cleaned_df
        except Exception as e:
            self.logger.error(f"Erro durante a limpeza dos dados: {e}")
            raise

    def analyze_market(self, df):
        """Calcula médias e filtra oportunidades (15% abaixo da média)."""
        self.logger.info("Iniciando análise de mercado e oportunidades...")
        try:
            # Estatísticas do m² por bairro
            bairro_stats = df.groupby("Bairro")["Preco_M2"].mean().to_dict()
            df["Media_Bairro_M2"] = df["Bairro"].map(bairro_stats)
            
            # Filtro de oportunidade
            df["Oportunidade"] = df["Preco_M2"] < (df["Media_Bairro_M2"] * 0.85)
            self.logger.info("Análise estatística e mapeamento concluídos.")
            return df, bairro_stats
        except Exception as e:
            self.logger.error(f"Erro durante a análise de dados: {e}")
            raise

    def load_results(self, df, stats):
        """Salva a tabela limpa em CSV e as oportunidades em JSON."""
        self.logger.info("Carregando resultados nos diretórios de saída...")
        try:
            os.makedirs(os.path.dirname(self.output_csv), exist_ok=True)
            os.makedirs(os.path.dirname(self.output_json), exist_ok=True)
            
            # Salva o CSV final
            df.to_csv(self.output_csv, index=False)
            self.logger.info(f"Dados salvos com sucesso em: {self.output_csv}")

            # Identifica as 5 principais oportunidades
            oportunidades = df[df["Oportunidade"] == True].sort_values(by="Preco_M2")
            top_deals = []
            for _, row in oportunidades.head(5).iterrows():
                top_deals.append({
                    "bairro": row["Bairro"],
                    "quartos": int(row["Quartos"]),
                    "area_m2": float(row["Area"]),
                    "preco_total": float(row["Preco"]),
                    "preco_m2_imovel": float(row["Preco_M2"]),
                    "preco_m2_medio_bairro": float(row["Media_Bairro_M2"]),
                    "desconto_estimado_m2": f"{((1 - (row['Preco_M2'] / row['Media_Bairro_M2'])) * 100):.1f}%"
                })

            report = {
                "media_preco_m2_por_bairro": {k: float(v) for k, v in stats.items()},
                "total_oportunidades_encontradas": len(oportunidades),
                "top_5_melhores_oportunidades": top_deals
            }

            with open(self.output_json, "w", encoding="utf-8") as f:
                json.dump(report, f, indent=4, ensure_ascii=False)
            self.logger.info(f"Relatório de análise de oportunidades de mercado salvo em: {self.output_json}")
        except Exception as e:
            self.logger.error(f"Erro ao salvar os resultados: {e}")
            raise

    def run(self):
        """Método principal para orquestrar o pipeline do Scraper."""
        self.logger.info("=== Executando Pipeline de Web Scraping & Análise ===")
        try:
            raw_df = self.simulate_scraping()
            clean_df = self.clean_data(raw_df)
            analyzed_df, stats = self.analyze_market(clean_df)
            self.load_results(analyzed_df, stats)
            self.logger.info("=== Orquestração concluída com sucesso! ===")
        except Exception as e:
            self.logger.error(f"Pipeline falhou: {e}")
            raise

if __name__ == "__main__":
    scraper = RealEstateScraper()
    scraper.run()
