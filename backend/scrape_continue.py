# scrape_meugameusado_pro.py
# Scraper "profissional" com retomada automática, checkpoint, deduplicação e download paralelo de imagens.
#
# Requisitos:
#   pip install requests
#
# Uso:
#   python scrape_meugameusado_pro.py
#
# Arquivos gerados:
#   - products.csv          (append incremental, sem duplicar)
#   - images/               (capas baixadas)
#   - scrape_state.json     (checkpoint para retomada)

import csv
import json
import os
import re
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from typing import Dict, Iterable, List, Optional, Set, Tuple
from urllib.parse import urljoin, urlparse

import requests

API_BASE = "https://cotacoes.meugameusado.com.br/api/v1/products/"
SITE_BASE = "https://cotacoes.meugameusado.com.br/"

CSV_FILE = "products.csv"
STATE_FILE = "scrape_state.json"
IMAGES_DIR = "images"

# Paginação em blocos grandes
LIMIT = 1000

# Rede / estabilidade
TIMEOUT = 30
MAX_RETRIES = 6

# Polidez / throttling
SLEEP_BETWEEN_PAGES = 0.25

# Download paralelo de imagens
MAX_IMAGE_WORKERS = 10

# Se True: ao iniciar, recalcula offset usando o CSV (mais confiável quando sua execução anterior foi manual)
# Se False: usa prioritariamente o STATE_FILE
PREFER_CSV_FOR_RESUME = True


# -------------------------- Helpers --------------------------

def now_iso() -> str:
    return datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def safe_filename(text: str, max_len: int = 180) -> str:
    """
    Nome de arquivo seguro (Windows/Linux).
    """
    text = (text or "").strip()
    text = re.sub(r"[\\/*?:\"<>|]+", "_", text)
    text = re.sub(r"\s+", " ", text)
    if len(text) > max_len:
        text = text[:max_len].rstrip()
    return text or "file"


def build_cover_url(cover_path: Optional[str]) -> str:
    if not cover_path:
        return ""
    return urljoin(SITE_BASE, cover_path.lstrip("/"))


def guess_ext_from_url(url: str) -> str:
    """
    Tenta extrair a extensão do arquivo a partir da URL.
    Se não achar algo válido, retorna .jpg
    """
    try:
        path = urlparse(url).path
        _, ext = os.path.splitext(path)
        ext = ext.lower()
        if ext in (".jpg", ".jpeg", ".png", ".webp"):
            return ext
    except Exception:
        pass
    return ".jpg"


def ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def load_state() -> Dict:
    if not os.path.isfile(STATE_FILE):
        return {}
    try:
        with open(STATE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def save_state(state: Dict) -> None:
    tmp = STATE_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)
    os.replace(tmp, STATE_FILE)


def request_json_with_retry(session: requests.Session, url: str, params: Optional[Dict] = None) -> Dict:
    last_err = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = session.get(url, params=params, timeout=TIMEOUT)
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            last_err = e
            backoff = min(2 ** attempt, 20)
            print(f"[WARN] API falhou ({attempt}/{MAX_RETRIES}): {e} | retry em {backoff}s")
            time.sleep(backoff)
    raise RuntimeError(f"Falha após {MAX_RETRIES} tentativas: {last_err}")


# -------------------------- CSV Resume --------------------------

def csv_stats_and_seen_ids(csv_path: str) -> Tuple[int, Set[int]]:
    """
    Retorna:
      - quantidade de linhas de dados (sem header)
      - set de IDs já presentes (dedupe)
    """
    if not os.path.isfile(csv_path):
        return 0, set()

    seen: Set[int] = set()
    rows = 0

    with open(csv_path, "r", newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows += 1
            try:
                pid = int(row.get("id") or 0)
                if pid:
                    seen.add(pid)
            except Exception:
                pass

    return rows, seen


def ensure_csv_header(csv_path: str) -> None:
    """
    Se CSV não existir, cria com header.
    """
    if os.path.isfile(csv_path):
        return
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(
            f,
            fieldnames=["id", "name", "sku", "cover_image_url", "local_image_path"],
        )
        w.writeheader()


# -------------------------- Image Download (Thread-safe) --------------------------

_thread_local = threading.local()

def get_thread_session() -> requests.Session:
    """
    requests.Session não é garantido thread-safe.
    Criamos 1 session por thread via thread-local.
    """
    sess = getattr(_thread_local, "session", None)
    if sess is None:
        sess = requests.Session()
        sess.headers.update({
            "User-Agent": "Mozilla/5.0 (MGU Scraper Pro)",
            "Accept": "*/*",
        })
        _thread_local.session = sess
    return sess


def download_image(url: str, dest_path: str) -> Tuple[str, bool, str]:
    """
    Retorna (dest_path, ok?, erro_msg).
    """
    if not url:
        return dest_path, False, "no_url"

    # já existe e tem tamanho > 0
    if os.path.exists(dest_path) and os.path.getsize(dest_path) > 0:
        return dest_path, True, "already_exists"

    last_err = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            sess = get_thread_session()
            with sess.get(url, stream=True, timeout=TIMEOUT) as r:
                r.raise_for_status()
                ensure_dir(os.path.dirname(dest_path))
                tmp = dest_path + ".part"
                with open(tmp, "wb") as f:
                    for chunk in r.iter_content(chunk_size=8192):
                        if chunk:
                            f.write(chunk)
                os.replace(tmp, dest_path)
            return dest_path, True, "downloaded"
        except Exception as e:
            last_err = e
            backoff = min(2 ** attempt, 20)
            time.sleep(backoff)

    return dest_path, False, f"failed: {last_err}"


# -------------------------- Main Logic --------------------------

def compute_resume_offset(state: Dict, csv_rows: int) -> int:
    """
    Escolhe offset para retomar:
      - Se PREFER_CSV_FOR_RESUME=True, usa csv_rows como base e "recuo" até boundary do LIMIT
      - Senão usa state.offset se existir
    Estratégia do recuo:
      offset = (csv_rows // LIMIT) * LIMIT
    Assim você reprocessa a última página e deduplica por ID (não perde nada se execução anterior foi interrompida no meio).
    """
    state_offset = int(state.get("offset") or 0)
    if PREFER_CSV_FOR_RESUME:
        return (csv_rows // LIMIT) * LIMIT

    # fallback: state primeiro
    if state_offset > 0:
        return state_offset

    return (csv_rows // LIMIT) * LIMIT


def main():
    ensure_dir(IMAGES_DIR)
    ensure_csv_header(CSV_FILE)

    # Carrega progresso
    state = load_state()

    # Lê CSV para saber onde parou + dedupe
    csv_rows, seen_ids = csv_stats_and_seen_ids(CSV_FILE)
    offset = compute_resume_offset(state, csv_rows)

    print(f"[INFO] Linhas no CSV: {csv_rows}")
    print(f"[INFO] IDs já vistos: {len(seen_ids)}")
    print(f"[INFO] Retomando com offset={offset}, limit={LIMIT}")

    # Session para paginação da API (single-thread)
    api_session = requests.Session()
    api_session.headers.update({
        "User-Agent": "Mozilla/5.0 (MGU Scraper Pro)",
        "Accept": "application/json",
    })

    # Abre CSV em append
    with open(CSV_FILE, "a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=["id", "name", "sku", "cover_image_url", "local_image_path"],
        )

        total_count = None
        processed_total = int(state.get("processed_total") or 0)
        downloaded_images = int(state.get("downloaded_images") or 0)
        skipped_duplicates = int(state.get("skipped_duplicates") or 0)

        while True:
            params = {"limit": LIMIT, "offset": offset}
            print(f"\n[PAGE] Buscando: offset={offset} limit={LIMIT}")

            data = request_json_with_retry(api_session, API_BASE, params=params)

            if total_count is None:
                total_count = data.get("count")
                print(f"[INFO] count informado pela API: {total_count}")

            results = data.get("results") or []
            if not results:
                print("[DONE] Sem mais resultados. Finalizando.")
                break

            # Prepara downloads de imagem (somente para itens novos)
            image_jobs: List[Tuple[str, str]] = []
            rows_to_write: List[Dict] = []

            for item in results:
                try:
                    pid = int(item.get("id"))
                except Exception:
                    continue

                if pid in seen_ids:
                    skipped_duplicates += 1
                    continue

                name = item.get("name") or ""
                sku = item.get("sku") or ""
                cover_url = build_cover_url(item.get("cover_image"))

                ext = guess_ext_from_url(cover_url)
                filename = safe_filename(f"{sku}_{pid}") + ext
                local_path = os.path.join(IMAGES_DIR, filename) if cover_url else ""

                # agenda download (se tiver URL)
                if cover_url:
                    image_jobs.append((cover_url, local_path))

                rows_to_write.append({
                    "id": pid,
                    "name": name,
                    "sku": sku,
                    "cover_image_url": cover_url,
                    "local_image_path": local_path,
                })

                seen_ids.add(pid)

            # Baixa imagens em paralelo
            ok_count = 0
            if image_jobs:
                print(f"[IMG] Baixando {len(image_jobs)} imagens com {MAX_IMAGE_WORKERS} workers...")
                with ThreadPoolExecutor(max_workers=MAX_IMAGE_WORKERS) as ex:
                    futures = [ex.submit(download_image, url, path) for (url, path) in image_jobs]
                    for fut in as_completed(futures):
                        dest, ok, msg = fut.result()
                        if ok:
                            ok_count += 1
                        else:
                            print(f"[WARN] Imagem falhou: {dest} ({msg})")

                downloaded_images += ok_count
                print(f"[IMG] OK nesta página: {ok_count}/{len(image_jobs)}")

            # Escreve CSV (somente itens novos)
            if rows_to_write:
                for row in rows_to_write:
                    writer.writerow(row)
                f.flush()

            processed_total += len(rows_to_write)
            print(f"[INFO] Novos itens gravados nesta página: {len(rows_to_write)}")
            print(f"[INFO] Total novos gravados nesta execução (acumulado): {processed_total}")
            print(f"[INFO] Duplicados pulados (acumulado): {skipped_duplicates}")

            # Atualiza checkpoint
            state = {
                "offset": offset + LIMIT,   # próximo offset a tentar
                "limit": LIMIT,
                "processed_total": processed_total,
                "downloaded_images": downloaded_images,
                "skipped_duplicates": skipped_duplicates,
                "last_update": now_iso(),
                "api_count": total_count,
            }
            save_state(state)

            # Próxima página
            offset += LIMIT
            time.sleep(SLEEP_BETWEEN_PAGES)

    print("\n[FINAL] Concluído.")
    print(f"CSV: {CSV_FILE}")
    print(f"Imagens: ./{IMAGES_DIR}/")
    print(f"State: {STATE_FILE}")


if __name__ == "__main__":
    main()