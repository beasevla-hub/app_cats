import os
import json
from pathlib import Path
import psycopg2
from psycopg2.extras import Json

DB_CONFIG = {
    "dbname": "acervos_db",
    "user": "postgres",
    "password": os.getenv("PGPASSWORD", "senha123"),
    "host": "localhost",
    "port": "5432",
}

JSON_DIR = Path(r"C:\Users\Win\Documents\app_cats\outputs_json")


def log(msg):
    print(msg)


def get_str(value):
    if value is None:
        return None
    value = str(value).strip()
    return value if value else None


def get_num(value):
    if value in (None, ""):
        return None
    return value


def ensure_tables(conn):
    with conn.cursor() as cur:
        cur.execute("""
        CREATE TABLE IF NOT EXISTS cats (
            id SERIAL PRIMARY KEY,
            tipo_documento TEXT,
            numero_cat TEXT UNIQUE,
            numero_art TEXT,
            profissional TEXT,
            registro_crea TEXT,
            empresa_contratada TEXT,
            contratante TEXT,
            cnpj_contratante TEXT,
            objeto TEXT,
            processo_administrativo TEXT,
            contrato TEXT,
            endereco_obra TEXT,
            cidade TEXT,
            estado TEXT,
            data_inicio DATE,
            data_fim DATE,
            area_m2 NUMERIC,
            valor_contrato NUMERIC,
            apelido TEXT,
            arquivo_pdf TEXT,
            caminho_pdf TEXT,
            raw_json JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)
        cur.execute("""
        CREATE TABLE IF NOT EXISTS servicos (
            id SERIAL PRIMARY KEY,
            cat_id INTEGER REFERENCES cats(id) ON DELETE CASCADE,
            grupo TEXT,
            codigo TEXT,
            fonte TEXT,
            descricao TEXT,
            unidade TEXT,
            quantidade NUMERIC,
            pagina_pdf INTEGER,
            ordem_na_pagina INTEGER
        );
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_servicos_cat_id ON servicos(cat_id);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_cats_numero_cat ON cats(numero_cat);")
    conn.commit()


def upsert_cat(cur, payload, json_path):
    cat = payload.get("cat", {})
    numero_cat = get_str(cat.get("numero_cat"))
    if not numero_cat:
        raise ValueError(f"Arquivo sem numero_cat: {json_path.name}")

    arquivo_pdf = get_str(payload.get("arquivo_pdf"))
    caminho_pdf = get_str(payload.get("caminho_pdf"))

    if not arquivo_pdf:
        inferred_pdf = json_path.with_suffix('.pdf').name
        arquivo_pdf = inferred_pdf
    if not caminho_pdf:
        caminho_pdf = str(json_path.with_suffix('.pdf'))

    cur.execute(
        """
        INSERT INTO cats (
            tipo_documento, numero_cat, numero_art, profissional, registro_crea,
            empresa_contratada, contratante, cnpj_contratante, objeto,
            processo_administrativo, contrato, endereco_obra, cidade, estado,
            data_inicio, data_fim, area_m2, valor_contrato, apelido,
            arquivo_pdf, caminho_pdf, raw_json, updated_at
        ) VALUES (
            %(tipo_documento)s, %(numero_cat)s, %(numero_art)s, %(profissional)s, %(registro_crea)s,
            %(empresa_contratada)s, %(contratante)s, %(cnpj_contratante)s, %(objeto)s,
            %(processo_administrativo)s, %(contrato)s, %(endereco_obra)s, %(cidade)s, %(estado)s,
            %(data_inicio)s, %(data_fim)s, %(area_m2)s, %(valor_contrato)s, %(apelido)s,
            %(arquivo_pdf)s, %(caminho_pdf)s, %(raw_json)s, CURRENT_TIMESTAMP
        )
        ON CONFLICT (numero_cat)
        DO UPDATE SET
            tipo_documento = EXCLUDED.tipo_documento,
            numero_art = EXCLUDED.numero_art,
            profissional = EXCLUDED.profissional,
            registro_crea = EXCLUDED.registro_crea,
            empresa_contratada = EXCLUDED.empresa_contratada,
            contratante = EXCLUDED.contratante,
            cnpj_contratante = EXCLUDED.cnpj_contratante,
            objeto = EXCLUDED.objeto,
            processo_administrativo = EXCLUDED.processo_administrativo,
            contrato = EXCLUDED.contrato,
            endereco_obra = EXCLUDED.endereco_obra,
            cidade = EXCLUDED.cidade,
            estado = EXCLUDED.estado,
            data_inicio = EXCLUDED.data_inicio,
            data_fim = EXCLUDED.data_fim,
            area_m2 = EXCLUDED.area_m2,
            valor_contrato = EXCLUDED.valor_contrato,
            apelido = EXCLUDED.apelido,
            arquivo_pdf = EXCLUDED.arquivo_pdf,
            caminho_pdf = EXCLUDED.caminho_pdf,
            raw_json = EXCLUDED.raw_json,
            updated_at = CURRENT_TIMESTAMP
        RETURNING id;
        """,
        {
            "tipo_documento": get_str(payload.get("tipo_documento")),
            "numero_cat": numero_cat,
            "numero_art": get_str(cat.get("numero_art")),
            "profissional": get_str(cat.get("profissional")),
            "registro_crea": get_str(cat.get("registro_crea")),
            "empresa_contratada": get_str(cat.get("empresa_contratada")),
            "contratante": get_str(cat.get("contratante")),
            "cnpj_contratante": get_str(cat.get("cnpj_contratante")),
            "objeto": get_str(cat.get("objeto")),
            "processo_administrativo": get_str(cat.get("processo_administrativo")),
            "contrato": get_str(cat.get("contrato")),
            "endereco_obra": get_str(cat.get("endereco_obra")),
            "cidade": get_str(cat.get("cidade")),
            "estado": get_str(cat.get("estado")),
            "data_inicio": get_str(cat.get("data_inicio")),
            "data_fim": get_str(cat.get("data_fim")),
            "area_m2": get_num(cat.get("area_m2")),
            "valor_contrato": get_num(cat.get("valor_contrato")),
            "apelido": get_str(payload.get("apelido")) or get_str(json_path.stem.rsplit('_', 1)[0] if '_' in json_path.stem else json_path.stem),
            "arquivo_pdf": arquivo_pdf,
            "caminho_pdf": caminho_pdf,
            "raw_json": Json(payload),
        },
    )
    return cur.fetchone()[0], numero_cat


def replace_servicos(cur, cat_id, payload):
    cur.execute("DELETE FROM servicos WHERE cat_id = %s", (cat_id,))
    rows = []
    for s in payload.get("servicos", []):
        rows.append((
            cat_id,
            get_str(s.get("grupo")),
            get_str(s.get("codigo")),
            get_str(s.get("fonte")),
            get_str(s.get("descricao")),
            get_str(s.get("unidade")),
            get_num(s.get("quantidade")),
            s.get("pagina_pdf"),
            s.get("ordem_na_pagina"),
        ))

    if rows:
        cur.executemany(
            """
            INSERT INTO servicos (
                cat_id, grupo, codigo, fonte, descricao, unidade,
                quantidade, pagina_pdf, ordem_na_pagina
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            rows,
        )
    return len(rows)


def main():
    if not JSON_DIR.exists():
        raise FileNotFoundError(f"Pasta de JSON não encontrada: {JSON_DIR}")

    files = sorted(JSON_DIR.glob("*.json"))
    if not files:
        raise FileNotFoundError(f"Nenhum JSON encontrado em: {JSON_DIR}")

    log(f"Encontrados {len(files)} arquivos JSON em {JSON_DIR}")
    conn = psycopg2.connect(**DB_CONFIG)
    try:
        ensure_tables(conn)
        imported_cats = 0
        imported_servicos = 0

        for json_file in files:
            try:
                with open(json_file, "r", encoding="utf-8") as f:
                    payload = json.load(f)

                with conn.cursor() as cur:
                    cat_id, numero_cat = upsert_cat(cur, payload, json_file)
                    qtd = replace_servicos(cur, cat_id, payload)
                conn.commit()
                imported_cats += 1
                imported_servicos += qtd
                log(f"OK - CAT {numero_cat} importada com {qtd} serviços ({json_file.name})")
            except Exception as e:
                conn.rollback()
                log(f"ERRO - {json_file.name}: {e}")

        log("-" * 80)
        log(f"Concluído. CATs importadas: {imported_cats} | Serviços importados: {imported_servicos}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
