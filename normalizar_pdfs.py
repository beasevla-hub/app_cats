import os
import json
import shutil
import re
from pathlib import Path

# --- CONFIGURAÇÕES ---
SOURCE_DIR = Path("sources_pdf")
OUTPUT_JSON_DIR = Path("outputs_json")
NORMALIZED_DIR = Path("pdfs_normalizados")

# Garante que a pasta de destino exista
NORMALIZED_DIR.mkdir(exist_ok=True)

def clean_id(text):
    """Remove caracteres especiais para comparação de IDs."""
    return re.sub(r'[^a-zA-Z0-9]', '', str(text).upper())

def main():
    print(f"[*] Iniciando normalização de PDFs...")
    
    # 1. Mapeia todos os PDFs originais pelo ID contido no nome
    pdf_map = {}
    all_pdfs = list(SOURCE_DIR.glob("*.pdf"))
    for pdf in all_pdfs:
        # Tenta encontrar qualquer sequência de ID no nome do PDF
        # Ex: SZC-12345 ou 262023...
        ids_found = re.findall(r'([A-Z]{0,3}[-]?\d{5,15})', pdf.name.upper())
        for found_id in ids_found:
            pdf_map[clean_id(found_id)] = pdf

    # 2. Processa cada JSON para renomear o PDF correspondente
    json_files = list(OUTPUT_JSON_DIR.glob("*.json"))
    print(f"[*] Encontrados {len(json_files)} arquivos JSON para processar.")
    
    success_count = 0
    fail_count = 0

    for json_path in json_files:
        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Pega os dados reais de dentro do JSON
            num_cat = data.get('cat', {}).get('numero_cat')
            apelido = data.get('apelido', 'SEM_APELIDO')
            
            if not num_cat:
                print(f"[!] JSON sem número de CAT: {json_path.name}")
                fail_count += 1
                continue

            # Tenta encontrar o PDF original usando o ID do JSON
            cat_id_clean = clean_id(num_cat)
            original_pdf = pdf_map.get(cat_id_clean)
            
            # Fallback: Se não achou pelo mapa, tenta buscar no nome de todos os PDFs
            if not original_pdf:
                for pdf in all_pdfs:
                    if cat_id_clean in clean_id(pdf.name):
                        original_pdf = pdf
                        break

            if original_pdf:
                # Cria o novo nome padrão
                safe_apelido = "".join([c for c in apelido if c.isalnum() or c in (' ', '-', '_')]).strip()
                new_name = f"{safe_apelido}_{num_cat}.pdf"
                dest_path = NORMALIZED_DIR / new_name
                
                # Copia o arquivo
                shutil.copy2(original_pdf, dest_path)
                print(f"[✓] Sucesso: {original_pdf.name} -> {new_name}")
                success_count += 1
            else:
                print(f"[X] Erro: Não encontrei PDF original para a CAT {num_cat} ({json_path.name})")
                fail_count += 1

        except Exception as e:
            print(f"[X] Erro ao processar {json_path.name}: {e}")
            fail_count += 1

    print("\n" + "="*30)
    print(f"NORMALIZAÇÃO CONCLUÍDA")
    print(f"Total processado: {len(json_files)}")
    print(f"Sucesso: {success_count}")
    print(f"Falhas: {fail_count}")
    print("="*30)

if __name__ == "__main__":
    main()
