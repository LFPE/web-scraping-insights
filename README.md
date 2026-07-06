# Web Scraping & Análise de Imóveis 🏢

Este projeto consiste em uma ferramenta de **Web Scraping** desenvolvida em Python para coletar, estruturar e analisar dados imobiliários locais. O objetivo principal é minerar dados do mercado e realizar análise de **Preço por Metro Quadrado** em diferentes bairros de Gramado, RS.

## 🚀 Funcionalidades

* **Web Scraping simulado (Mock)**: Coleta dinâmica de dados simulando requisições HTTP reais com raspagem de tags HTML estruturadas.
* **Processamento de Dados**:
  * Extração de preços brutos (ex: "R$ 450.000" para `450000.0`).
  * Extração e conversão de áreas (ex: "85m²" para `85.0`).
  * Cálculo automático do preço por metro quadrado.
* **Análise Exploratória de Dados (EDA)**:
  * Agrupamento por bairro e cálculo do preço médio do m².
  * Filtragem das melhores oportunidades de mercado (imóveis com preço/m² abaixo da média do bairro).

## 🛠️ Tecnologias Utilizadas

* **Python 3**
* **BeautifulSoup4** (Parse de HTML estruturado)
* **Requests** (Requisições HTTP)
* **Pandas** (Estruturação e Análise Exploratória de Dados)

## 📋 Como Rodar

1. Instale as dependências:
   ```bash
   pip install pandas requests beautifulsoup4
   ```
2. Execute o script principal:
   ```bash
   python scraper_analysis.py
   ```
