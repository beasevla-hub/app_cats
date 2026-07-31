import argparse
import json
import re
import unicodedata
from collections import Counter
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent
JSON_DIR = ROOT_DIR / "outputs_json"


def fix_mojibake(text: str) -> str:
    if not any(ch in text for ch in "ÃÂ"):
        return text
    try:
        return text.encode("latin1").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return text


def strip_accents(text: str) -> str:
    normalized = unicodedata.normalize("NFKD", text)
    return "".join(ch for ch in normalized if not unicodedata.combining(ch))


def normalize_key(text: str) -> str:
    text = fix_mojibake(text).strip()
    text = text.replace("\u00a0", " ")
    text = text.replace("²", "2").replace("³", "3")
    text = text.replace("×", "X")
    text = re.sub(r"\s+", " ", text)
    text = strip_accents(text.upper())
    text = text.strip(" .;:,-")
    return text


CANONICAL_MAP = {
    "UN": "UN",
    "UNID": "UN",
    "UND": "UN",
    "UNIDADE": "UN",
    "UM": "UN",
    "UN-": "UN",
    "CJTO": "CJ",
    "DUZIA": "DZ",
    "TON": "T",
    "GLOBAL": "GL",
    "PR": "PAR",
    "METROQUADRADO": "M2",
    "METRO QUADRADO": "M2",
    "MES": "MES",
    "MS": "MES",
}


def canonical_unit(raw_value: object) -> str | None:
    if raw_value is None:
        return None

    original = str(raw_value).strip()
    if not original:
        return None

    key = normalize_key(original)
    compact = key.replace(" ", "")
    compact = compact.replace("/", "X")

    if compact in {"UNXMES", "UNMES", "UNIMES"}:
        return "UNXMES"
    if compact in {"MXMES"}:
        return "MXMES"
    if compact in {"M2XMES"}:
        return "M2XMES"
    if compact in {"M3XMES"}:
        return "M3XMES"
    if compact in {"M3XKM", "M3XK"}:
        return "M3XKM"
    if compact in {"M2XKM"}:
        return "M2XKM"
    if compact in {"MXKM"}:
        return "MXKM"
    if compact in {"HPXH"}:
        return "HPXH"
    if compact in {"0", "|"}:
        return None

    compact = CANONICAL_MAP.get(compact, compact)
    return compact


def normalize_json_file(path: Path, dry_run: bool) -> tuple[int, Counter[tuple[str, str]], Counter[str]]:
    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)

    services = payload.get("servicos") or []
    changes = 0
    replacements: Counter[tuple[str, str]] = Counter()
    final_units: Counter[str] = Counter()

    for service in services:
        before = service.get("unidade")
        after = canonical_unit(before)

        if after is not None:
            final_units[after] += 1

        if before != after:
            service["unidade"] = after
            changes += 1
            replacements[(str(before), str(after))] += 1

    if changes and not dry_run:
        with path.open("w", encoding="utf-8") as handle:
            json.dump(payload, handle, ensure_ascii=False, indent=2)
            handle.write("\n")

    return changes, replacements, final_units


def main() -> None:
    parser = argparse.ArgumentParser(description="Normaliza unidades dos serviços em outputs_json.")
    parser.add_argument("--dry-run", action="store_true", help="Analisa sem regravar os arquivos.")
    args = parser.parse_args()

    if not JSON_DIR.exists():
        raise FileNotFoundError(f"Pasta não encontrada: {JSON_DIR}")

    files = sorted(JSON_DIR.glob("*.json"))
    if not files:
        raise FileNotFoundError(f"Nenhum JSON encontrado em: {JSON_DIR}")

    total_changes = 0
    files_changed = 0
    replacements: Counter[tuple[str, str]] = Counter()
    final_units: Counter[str] = Counter()

    for path in files:
        changes, file_replacements, file_units = normalize_json_file(path, args.dry_run)
        total_changes += changes
        if changes:
            files_changed += 1
        replacements.update(file_replacements)
        final_units.update(file_units)

    mode_label = "DRY RUN" if args.dry_run else "APLICADO"
    print(f"[{mode_label}] Arquivos analisados: {len(files)}")
    print(f"[{mode_label}] Arquivos alterados: {files_changed}")
    print(f"[{mode_label}] Serviços com unidade alterada: {total_changes}")
    print()
    print("Principais substituições:")
    for (before, after), count in replacements.most_common(25):
        print(f"  {before!r} -> {after!r}: {count}")
    print()
    print("Unidades finais encontradas:")
    for unit, count in final_units.most_common():
        print(f"  {unit}: {count}")


if __name__ == "__main__":
    main()
