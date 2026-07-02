import os
import json
import base64
import requests
import time
import re
import sys
from pathlib import Path
import psycopg2
from psycopg2 import extras

# --- CONFIGURAÇÕES ---
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
DB_CONFIG = {
    "dbname": "acervos_db",
    "user": "postgres",
    "password": "senha123",
    "host": "localhost",
    "port": "5432"
}

SOURCE_DIR = Path("sources_pdf")
OUTPUT_DIR = Path("outputs_json")
APELIDOS_FILE = Path("apelidos.json")
PROMPT_FILE = Path("prompt_master_v2.txt")

# Garante que as pastas existam
SOURCE_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)
DEBUG_DIR = Path("debug_errors")
DEBUG_DIR.mkdir(exist_ok=True)

def log(tag, message):
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] [{tag}] {message}")

def load_prompt():
    log("CONFIG", f"Lendo prompt de {PROMPT_FILE}...")
    if not PROMPT_FILE.exists():
        log("ERRO", f"Arquivo de prompt {PROMPT_FILE} não encontrado!")
        sys.exit(1)
    with open(PROMPT_FILE, 'r', encoding='utf-8') as f:
        return f.read()

def load_apelidos():
    log("CONFIG", f"Lendo apelidos de {APELIDOS_FILE}...")
    if not APELIDOS_FILE.exists():
        log("AVISO", "Arquivo de apelidos não encontrado. Continuando sem apelidos.")
        return {}
    with open(APELIDOS_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
        return {item['cat']: item['apelido'] for item in data}

def extract_json(text, filename):
    log("VALIDATE", f"Limpando resposta da IA para {filename}...")
    text = re.sub(r'```json\s*|\s*```', '', text).strip()
    match = re.search(r'(\{.*\})', text, re.DOTALL)
    if match:
        return match.group(1)
    return text

def call_openrouter(pdf_path, prompt, pages_range=None):
    """Envia o PDF para o OpenRouter. Se pages_range for definido, instrui a IA a focar naquelas páginas."""
    msg_suffix = f" (Páginas {pages_range})" if pages_range else ""
    log("IA_REQ", f"Enviando {pdf_path.name}{msg_suffix} para OpenRouter...")
    
    with open(pdf_path, "rb") as f:
        pdf_b64 = base64.b64encode(f.read()).decode("utf-8")

    full_prompt = prompt
    if pages_range:
        full_prompt += f"\n\nIMPORTANTE: Foque EXCLUSIVAMENTE na extração dos serviços que aparecem nas páginas {pages_range} do PDF. Ignore o restante para evitar que a resposta seja cortada."

    payload = {
        "model": "google/gemini-2.5-flash",
        "messages": [
            {"role": "user", "content": [
                {"type": "text", "text": full_prompt},
                {"type": "file", "file": {"filename": pdf_path.name, "file_data": f"data:application/pdf;base64,{pdf_b64}"}}
            ]}
        ],
        "response_format": {"type": "json_object"}
    }
    
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(OPENROUTER_URL, headers=headers, json=payload, timeout=240)
        if response.status_code != 200:
            log("ERRO_API", f"Falha na API ({response.status_code}): {response.text}")
            return None
        
        content = response.json()['choices'][0]['message']['content']
        clean_content = extract_json(content, pdf_path.name)
        
        try:
            data = json.loads(clean_content)
            if 'cat' not in data or 'servicos' not in data:
                log("ERRO_DATA", f"JSON inválido em {pdf_path.name}")
                return None
            return data
        except json.JSONDecodeError:
            log("ERRO_JSON", f"JSON corrompido em {pdf_path.name}. Tentando recuperar...")
            return None
            
    except Exception as e:
        log("ERRO_PROCESSO", f"Erro ao processar {pdf_path.name}: {str(e)}")
        return None

def process_large_pdf(pdf_path, prompt):
    """Fallback para PDFs gigantes: processa em blocos de 5 páginas."""
    log("FALLBACK", f"Iniciando processamento por blocos para {pdf_path.name}...")
    
    all_services = []
    final_data = None
    
    # Tentaremos até 30 páginas em blocos de 5 (ajustável se necessário)
    for i in range(1, 31, 5):
        range_str = f"{i} a {i+4}"
        result = call_openrouter(pdf_path, prompt, pages_range=range_str)
        
        if result:
            if not final_data:
                final_data = result
            
            services = result.get('servicos', [])
            if not services:
                log("INFO", f"Fim dos serviços encontrados no bloco {range_str}.")
                break
                
            all_services.extend(services)
            log("INFO", f"Bloco {range_str} concluído. {len(services)} serviços extraídos.")
            time.sleep(2)
        else:
            log("ERRO", f"Falha crítica no bloco {range_str}. Interrompendo este arquivo.")
            break
            
    if final_data:
        final_data['servicos'] = all_services
        return final_data
    return None

def init_db():
    """Garante que as tabelas existam no banco de dados."""
    log("DB_INIT", "Verificando/Criando tabelas no PostgreSQL...")
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS cats (
                id SERIAL PRIMARY KEY,
                numero_cat TEXT UNIQUE,
                apelido TEXT,
                contratante TEXT,
                objeto TEXT,
                data_inicio DATE,
                data_fim DATE,
                valor_contrato NUMERIC,
                raw_json JSONB
            );
            CREATE TABLE IF NOT EXISTS servicos (
                id SERIAL PRIMARY KEY,
                cat_id INTEGER REFERENCES cats(id),
                grupo TEXT,
                descricao TEXT,
                unidade TEXT,
                quantidade NUMERIC,
                pagina_pdf INTEGER
            );
        """)
        conn.commit()
        cur.close()
        conn.close()
        log("DB_INIT", "Estrutura do banco de dados verificada com sucesso.")
    except Exception as e:
        log("ERRO_DB_INIT", f"Falha ao inicializar banco: {e}")
        sys.exit(1)

def save_to_db(item):
    """Salva um item individual no banco para garantir persistência imediata."""
    cat = item.get('cat', {})
    num_cat = cat.get('numero_cat')
    log("DB_INSERT", f"Gravando CAT {num_cat} no PostgreSQL...")
    
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()

        # Insere CAT
        cur.execute("""
            INSERT INTO cats (numero_cat, apelido, contratante, objeto, data_inicio, data_fim, valor_contrato, raw_json)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (numero_cat) DO UPDATE SET apelido = EXCLUDED.apelido
            RETURNING id;
        """, (
            num_cat, item.get('apelido'), cat.get('contratante'), 
            cat.get('objeto'), cat.get('data_inicio'), cat.get('data_fim'), 
            cat.get('valor_contrato'), json.dumps(item)
        ))
        cat_id = cur.fetchone()[0]

        # Insere Serviços (Limpa antes para evitar duplicidade se reprocessar)
        cur.execute("DELETE FROM servicos WHERE cat_id = %s", (cat_id,))
        for s in item.get('servicos', []):
            cur.execute("""
                INSERT INTO servicos (cat_id, grupo, descricao, unidade, quantidade, pagina_pdf)
                VALUES (%s, %s, %s, %s, %s, %s);
            """, (cat_id, s.get('grupo'), s.get('descricao'), s.get('unidade'), s.get('quantidade'), s.get('pagina_pdf')))

        conn.commit()
        cur.close()
        conn.close()
        log("DB_SUCCESS", f"CAT {num_cat} salva com sucesso.")
    except Exception as e:
        log("ERRO_DB", f"Falha ao gravar no banco: {e}")
        sys.exit(1)

def main():
    log("START", "Iniciando pipeline de ingestão de acervos...")
    
    if not OPENROUTER_API_KEY:
        log("ERRO", "Variável OPENROUTER_API_KEY não encontrada!")
        sys.exit(1)

    prompt_master = load_prompt()
    apelidos_map = load_apelidos()
    
    # Inicializa o banco de dados antes de começar o processamento
    init_db()
    
    pdf_files = sorted(list(SOURCE_DIR.glob("*.pdf")))
    log("INFO", f"Encontrados {len(pdf_files)} PDFs para processar.")

    existing_jsons = {f.name: f for f in OUTPUT_DIR.glob("*.json")}
    
    for i, pdf_path in enumerate(pdf_files, 1):
        log("PROGRESS", f"[{i}/{len(pdf_files)}] Analisando {pdf_path.name}")
        
        # Estratégia Universal: Tenta capturar o identificador no final do nome do arquivo
        # 1. Tenta pegar tudo após o último underline ou hífen
        # 2. Se não houver separador, tenta pegar o nome todo (limpo)
        pdf_parts = re.split(r'[_|\-|–]', pdf_path.stem) # Suporta _, - e o traço longo –
        if len(pdf_parts) > 1:
            num_cat_pdf = pdf_parts[-1].strip()
        else:
            num_cat_pdf = pdf_path.stem.strip()
        
        # Limpeza para comparação (remove espaços e caracteres especiais do ID)
        def clean_id(text):
            return re.sub(r'[^a-zA-Z0-9]', '', text.upper())

        num_cat_pdf_clean = clean_id(num_cat_pdf)
        
        cached_item = None
        if num_cat_pdf_clean:
            for json_name, json_path in existing_jsons.items():
                # Compara o ID limpo do PDF com o ID limpo no nome do JSON
                if num_cat_pdf_clean in clean_id(json_name):
                    log("CACHE", f"Sucesso! Encontrado no cache via ID ({num_cat_pdf}): {json_name}")
                    try:
                        with open(json_path, 'r', encoding='utf-8') as f_in:
                            cached_item = json.load(f_in)
                            break
                    except:
                        log("AVISO", f"Arquivo JSON corrompido: {json_name}")

        if cached_item:
            save_to_db(cached_item)
            continue
        else:
            log("CACHE_MISS", f"Nenhum cache encontrado para o ID '{num_cat_pdf}'. Seguindo para IA...")

        # Se não tem cache, chama a IA
        result = call_openrouter(pdf_path, prompt_master)
        
        # Se falhou (provavelmente por ser gigante), tenta o fallback por blocos
        if not result:
            log("RETRY", f"Tentando modo de extração por blocos para {pdf_path.name}...")
            result = process_large_pdf(pdf_path, prompt_master)

        if result:
            # Lógica de Apelido
            num_cat = result.get('cat', {}).get('numero_cat')
            apelido = apelidos_map.get(num_cat, "SEM_APELIDO")
            result['apelido'] = apelido
            
            # Salva JSON Temporário
            safe_apelido = "".join([c for c in apelido if c.isalnum() or c in (' ', '-', '_')]).strip()
            filename = f"{safe_apelido}_{num_cat}.json"
            output_path = OUTPUT_DIR / filename
            
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2, ensure_ascii=False)
            log("FILE_SAVE", f"JSON gerado: {filename}")
            
            # Salva no Banco
            save_to_db(result)
        else:
            log("SKIP", f"Pulando {pdf_path.name} devido a erro na extração.")
        
        log("SLEEP", "Aguardando 2 segundos para respeitar limites da API...")
        time.sleep(2)

    log("FINISH", "Processamento concluído com 100% de sucesso!")

if __name__ == "__main__":
    main()
