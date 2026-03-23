# scrape_meugameusado.py
import csv
import os
import re
import time
from urllib.parse import urljoin

import requests


API_BASE = "https://cotacoes.meugameusado.com.br/api/v1/products/"
SITE_BASE = "https://cotacoes.meugameusado.com.br/"
LIMIT = 50

OUT_CSV = "products.csv"
IMAGES_DIR = "images"

# Ajustes de rede
TIMEOUT = 30
SLEEP_BETWEEN_PAGES = 0.25
SLEEP_BETWEEN_IMAGES = 0.05
MAX_RETRIES = 5


def safe_filename(text: str, max_len: int = 180) -> str:
    """
    Gera um nome de arquivo seguro (Windows/Linux).
    """
    text = text.strip()
    text = re.sub(r"[\\/*?:\"<>|]+", "_", text)
    text = re.sub(r"\s+", " ", text)
    if len(text) > max_len:
        text = text[:max_len].rstrip()
    return text or "file"


def request_json(session: requests.Session, url: str, params: dict | None = None) -> dict:
    """
    Faz GET com retry + backoff.
    """
    last_err = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = session.get(url, params=params, timeout=TIMEOUT)
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            last_err = e
            wait = min(2 ** attempt, 20)
            print(f"[WARN] Falha na requisição ({attempt}/{MAX_RETRIES}): {e} | aguardando {wait}s")
            time.sleep(wait)
    raise RuntimeError(f"Falha após {MAX_RETRIES} tentativas: {last_err}")


def download_file(session: requests.Session, url: str, dest_path: str) -> bool:
    """
    Baixa um arquivo e salva em disco. Retorna True se baixou / False se pulou.
    """
    if not url:
        return False

    # Se já existe, pula (evita baixar tudo de novo)
    if os.path.exists(dest_path) and os.path.getsize(dest_path) > 0:
        return False

    last_err = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            with session.get(url, stream=True, timeout=TIMEOUT) as r:
                r.raise_for_status()
                os.makedirs(os.path.dirname(dest_path), exist_ok=True)
                with open(dest_path, "wb") as f:
                    for chunk in r.iter_content(chunk_size=8192):
                        if chunk:
                            f.write(chunk)
            return True
        except Exception as e:
            last_err = e
            wait = min(2 ** attempt, 20)
            print(f"[WARN] Falha ao baixar imagem ({attempt}/{MAX_RETRIES}): {e} | aguardando {wait}s")
            time.sleep(wait)

    print(f"[ERROR] Não foi possível baixar: {url} | erro: {last_err}")
    return False


def build_cover_url(cover_path: str | None) -> str:
    """
    Concatena cover_image com o domínio.
    Ex: "/media/..." -> "https://cotacoes.meugameusado.com.br/media/..."
    """
    if not cover_path:
        return ""
    return urljoin(SITE_BASE, cover_path.lstrip("/"))


def main():
    os.makedirs(IMAGES_DIR, exist_ok=True)

    session = requests.Session()
    # Ajuda a evitar bloqueios simples
    session.headers.update(
        {
            "User-Agent": "Mozilla/5.0 (compatible; MGU-Scraper/1.0; +https://example.com)",
            "Accept": "application/json",
        }
    )

    offset = 0
    total_count = None
    fetched = 0

    # CSV: se existir, sobrescreve (mude para "a" se quiser append)
    with open(OUT_CSV, "w", newline="", encoding="utf-8") as csvfile:
        writer = csv.DictWriter(
            csvfile,
            fieldnames=["id", "name", "sku", "cover_image_url", "local_image_path"],
        )
        writer.writeheader()

        while True:
            params = {"limit": LIMIT, "offset": offset}
            data = request_json(session, API_BASE, params=params)

            if total_count is None:
                total_count = data.get("count")
                print(f"[INFO] Total informado pela API: {total_count}")

            results = data.get("results") or []
            if not results:
                print("[INFO] Sem mais resultados. Finalizando.")
                break

            for item in results:
                pid = item.get("id")
                name = item.get("name", "")
                sku = item.get("sku", "")
                cover_path = item.get("cover_image")
                cover_url = build_cover_url(cover_path)

                # nome de arquivo: sku + id ajuda a não duplicar
                # extensão: tenta pegar do final da url, senão usa .jpg
                ext = os.path.splitext(cover_url.split("?")[0])[1].lower()
                if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
                    ext = ".jpg"

                filename = safe_filename(f"{sku}_{pid}") + ext
                local_path = os.path.join(IMAGES_DIR, filename)

                # baixa imagem (se existir)
                if cover_url:
                    downloaded = download_file(session, cover_url, local_path)
                    if downloaded:
                        time.sleep(SLEEP_BETWEEN_IMAGES)
                else:
                    local_path = ""

                writer.writerow(
                    {
                        "id": pid,
                        "name": name,
                        "sku": sku,
                        "cover_image_url": cover_url,
                        "local_image_path": local_path,
                    }
                )

                fetched += 1
                if fetched % 200 == 0:
                    print(f"[INFO] Itens processados: {fetched}")

            offset += LIMIT
            print(f"[INFO] Página concluída. Próximo offset={offset}")
            time.sleep(SLEEP_BETWEEN_PAGES)

    print(f"[DONE] CSV salvo em: {OUT_CSV}")
    print(f"[DONE] Imagens salvas em: ./{IMAGES_DIR}/")
    print(f"[DONE] Total processado: {fetched}")


if __name__ == "__main__":
    main()