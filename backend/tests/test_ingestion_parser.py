import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from api.routes.ingestion import _json_from_model


class IngestionParserTests(unittest.TestCase):
    def setUp(self):
        self.json_payload = '{"tipo_documento":"CAT","cat":{"numero_cat":"TEST-001"},"servicos":[{"descricao":"Serviço de teste"}]}'

    def test_parses_plain_json(self):
        result = _json_from_model(self.json_payload)
        self.assertEqual(result["cat"]["numero_cat"], "TEST-001")
        self.assertEqual(len(result["servicos"]), 1)

    def test_parses_json_after_model_narrative(self):
        result = _json_from_model("Processamento concluído:\n" + self.json_payload)
        self.assertEqual(result["cat"]["numero_cat"], "TEST-001")

    def test_parses_json_code_fence(self):
        result = _json_from_model("```json\n" + self.json_payload + "\n```")
        self.assertEqual(result["cat"]["numero_cat"], "TEST-001")


if __name__ == "__main__":
    unittest.main()
