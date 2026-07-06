import os
import re
import json
import random
import pandas as pd

# Configuração
os.makedirs("output", exist_ok=True)

print("--- INICIANDO SCRAPER E ANÁLISE DE MERCADO ---")

# ==========================================
# 1. SIMULAÇÃO DE WEB SCRAPING
# ==========================================
print("[Scraper] Coletando anúncios imobiliários do portal local...")

# Bairros típicos de Gramado, RS
neighborhoods = ["Centro", "Planalto", "Bavária", "Várzea Grande", "Carniel", "Floresta"]

# Dicionário de preços base por m2 por bairro
base_price_per_m2 = {
    "Centro": 14000,
    "Planalto": 12000,
    "Bavária": 11000,
    "Carniel": 9000,
    "Floresta": 8500,
    "Várzea Grande": 6500
}

# Simulação de HTML bruto extraído via BeautifulSoup
# Criamos uma simulação estruturada
raw_scraped_data = []
random.seed(123)

for i in range(150):
    neighborhood = random.choice(neighborhoods)
    base_price = base_price_per_m2[neighborhood]
    
    # Adiciona variação aleatória de preço
    area = random.randint(45, 220)
    price_variation = random.uniform(0.85, 1.25)
    
    # 5% de chance de ter uma "super oferta" (muito abaixo do valor médio)
    if random.random() > 0.95:
        price_variation = random.uniform(0.60, 0.75)
        
    price = int(area * base_price * price_variation)
    rooms = random.choice([1, 2, 3, 4])
    
    # Formatação de texto para simular dados "sujos" da web
    price_text = f"R$ {price:,.2f}".replace(",", ".")
    area_text = f"{area} m²" if random.random() > 0.3 else f"{area}m2"
    
    title = f"Apartamento com {rooms} quartos à venda no {neighborhood}"
    
    raw_scraped_data.append({
        "titulo_bruto": title,
        "preco_bruto": price_text,
        "area_bruta": area_text,
        "bairro_bruto": f" Gramado - {neighborhood} / RS  ", # Sujeiras de espaçamento
    })

print(f"[Scraper] Raspagem concluída. {len(raw_scraped_data)} anúncios coletados.")

# ==========================================
# 2. LIMPEZA DOS DADOS (DATA CLEANING)
# ==========================================
print("[Cleaning] Tratando dados e calculando preço por m²...")

df = pd.DataFrame(raw_scraped_data)

# A. Limpeza de Preço (ex: "R$ 450.000,00" -> 450000.0)
def clean_price(price_str):
    if not isinstance(price_str, str):
        return None
    # Remove R$, espaços, e converte formato de milhares/centavos
    cleaned = re.sub(r"[^\d]", "", price_str)
    # Divide por 100 por causa dos centavos (,00)
    return float(cleaned) / 100

df["Preco"] = df["preco_bruto"].apply(clean_price)

# B. Limpeza de Área (ex: "85 m²" -> 85.0)
def clean_area(area_str):
    if not isinstance(area_str, str):
        return None
    # Extrai apenas os números
    match = re.search(r"\d+", area_str)
    return float(match.group()) if match else None

df["Area"] = df["area_bruta"].apply(clean_area)

# C. Limpeza de Bairro (remover espaços extras e padronizar)
def clean_neighborhood(text):
    if not isinstance(text, str):
        return "Não Informado"
    # Extrai o bairro que fica após o hífen e antes da barra
    match = re.search(r"-\s*(.*?)\s*/", text)
    return match.group(1).strip() if match else text.strip()

df["Bairro"] = df["bairro_bruto"].apply(clean_neighborhood)

# D. Extração do número de quartos do título
def extract_rooms(title):
    match = re.search(r"(\d+)\s*quarto", title, re.IGNORECASE)
    return int(match.group(1)) if match else 1

df["Quartos"] = df["titulo_bruto"].apply(extract_rooms)

# E. Cálculo do Preço por Metro Quadrado (Preco / Area)
df["Preco_M2"] = df["Preco"] / df["Area"]

# Remove colunas brutas intermediárias para limpeza visual
df_clean = df[["Bairro", "Quartos", "Area", "Preco", "Preco_M2"]].copy()


# ==========================================
# 3. ANÁLISE DE MERCADO & OPORTUNIDADES
# ==========================================
print("[Analysis] Calculando médias regionais e identificando oportunidades...")

# Média de preço por m² de cada bairro
bairro_stats = df_clean.groupby("Bairro")["Preco_M2"].mean().to_dict()

# Adiciona a média do bairro de volta no DataFrame principal para comparação
df_clean["Media_Bairro_M2"] = df_clean["Bairro"].map(bairro_stats)

# Identifica oportunidades (imóvel com preço por m² pelo menos 15% abaixo da média do seu bairro)
df_clean["Oportunidade"] = df_clean["Preco_M2"] < (df_clean["Media_Bairro_M2"] * 0.85)

oportunidades = df_clean[df_clean["Oportunidade"] == True].sort_values(by="Preco_M2")


# ==========================================
# 4. CARGA DE RESULTADOS
# ==========================================
print("[Load] Salvando dados limpos e relatórios de mercado...")

# Salva dataset final limpo
csv_output = os.path.join("output", "imoveis_limpos.csv")
df_clean.to_csv(csv_output, index=False)

# Relatório JSON resumido das melhores oportunidades encontradas
top_deals = []
for idx, row in oportunidades.head(5).iterrows():
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
    "media_preco_m2_por_bairro": {k: float(v) for k, v in bairro_stats.items()},
    "total_oportunidades_encontradas": len(oportunidades),
    "top_5_melhores_oportunidades": top_deals
}

report_path = os.path.join("output", "oportunidades_mercado.json")
with open(report_path, "w", encoding="utf-8") as f:
    json.dump(report, f, indent=4, ensure_ascii=False)

print(f"[Load] Tabela final salva em '{csv_output}'.")
print(f"[Load] Relatório de oportunidades de investimento salvo em '{report_path}'.")
print("--- PIPELINE CONCLUÍDO COM SUCESSO ---")
