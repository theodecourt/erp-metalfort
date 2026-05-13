from supabase import Client, create_client

from app.config import settings

ORCAMENTOS_BUCKET = "orcamentos"

# Singleton: criar Client a cada chamada custava ~550ms cada (auth + httpx pool
# + postgrest setup) e o /api/quote/calculate chamava get_admin_client 4-5x
# por preview, somando ~6s. O Client e thread-safe (postgrest-py usa httpx.Client
# por baixo com pool interno) e FastAPI roda handlers sync em threadpool, entao
# compartilhar a mesma instancia entre requests e seguro. Race-condition na 1a
# chamada concorrente cria 2 instancias brevemente; uma "vence" e a outra e
# garbage-collected sem efeito colateral.
_admin_client: Client | None = None


def get_admin_client() -> Client:
    global _admin_client
    if _admin_client is None:
        _admin_client = create_client(settings.supabase_url, settings.supabase_secret_key)
    return _admin_client
