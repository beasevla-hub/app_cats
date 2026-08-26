import sys
import unittest
import unicodedata
from pathlib import Path

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT / "backend"
sys.path.insert(0, str(BACKEND))

from core.database import Base  # noqa: E402
from models.models import Cat, Servico  # noqa: E402
from api.routes.servicos import listar_servicos  # noqa: E402


def strip_accents(value: str | None) -> str:
    if not value:
        return ""
    normalized = unicodedata.normalize("NFKD", value)
    return "".join(char for char in normalized if not unicodedata.combining(char))


def make_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    event.listen(engine, "connect", lambda connection, _: connection.create_function("unaccent", 1, strip_accents))
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)()


class ServiceSearchOrderTests(unittest.TestCase):
    def test_search_prioritizes_phrase_then_quantity(self):
        db = make_session()
        cat = Cat(numero_cat="CAT-ORDER-1", apelido="Obra teste", cao=True)
        db.add(cat)
        db.flush()
        db.add_all([
            Servico(cat_id=cat.id, descricao="Piso intertravado de concreto", quantidade=100),
            Servico(cat_id=cat.id, descricao="Aplicação de piso intertravado", quantidade=250),
            Servico(cat_id=cat.id, descricao="Intertravado em área de piso", quantidade=1000),
        ])
        db.commit()

        result = listar_servicos(
            busca="piso intertravado",
            grupo=None,
            unidade=None,
            contratante=None,
            numero_cat=None,
            numero_art=None,
            apelido=None,
            objeto=None,
            cidade=None,
            data_inicio_de=None,
            data_inicio_ate=None,
            data_fim_de=None,
            data_fim_ate=None,
            area_min=None,
            area_max=None,
            valor_min=None,
            valor_max=None,
            desmaterializado=None,
            autenticado=None,
            cao=None,
            ordenar_quantidade=None,
            page=1,
            page_size=100,
            db=db,
        )

        self.assertEqual([item.descricao for item in result.items], [
        "Aplicação de piso intertravado",
        "Piso intertravado de concreto",
            "Intertravado em área de piso",
        ])
        self.assertEqual([item.quantidade for item in result.items], [250, 100, 1000])


if __name__ == "__main__":
    unittest.main()
