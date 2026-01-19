#!/usr/bin/env python3
from __future__ import annotations
import argparse
import concurrent.futures as futures
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List, Tuple
import sys
import os

from PIL import Image, ImageOps

HEIF_OK = False
try:
    from pillow_heif import register_heif_opener  # type: ignore
    register_heif_opener()
    HEIF_OK = True
except Exception:
    HEIF_OK = False

SUPPORTED = {".jpg", ".jpeg", ".png", ".heic", ".heif", ".heics", ".heifs"}

@dataclass
class Job:
    src: Path
    dst: Path

def find_images(root: Path, exts: Iterable[str]) -> List[Path]:
    exts = {e.lower() for e in exts}
    files: List[Path] = []
    for p in root.rglob("*"):
        if p.is_file() and p.suffix.lower() in exts:
            files.append(p)
    return files

def make_dst(src: Path, in_root: Path, out_root: Path) -> Path:
    rel = src.relative_to(in_root)
    rel = rel.with_suffix(".webp")
    return (out_root / rel).resolve()

def ensure_parent(path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)

def convert_one(
    job: Job,
    quality: int,
    lossless: bool,
    max_w: int | None,
    max_h: int | None,
    overwrite: bool,
    strip_meta: bool,
) -> Tuple[str, Path]:
    try:
        if job.dst.exists() and not overwrite:
            return ("skipped_exists", job.dst)

        with Image.open(job.src) as im:
            im = ImageOps.exif_transpose(im)

            if max_w or max_h:
                im.thumbnail(
                    (max_w or im.width, max_h or im.height),
                    Image.Resampling.LANCZOS,
                )

            if im.mode in ("I;16", "I", "F"):
                im = im.convert("RGB")
            elif im.mode in ("P", "LA"):
                im = im.convert("RGBA")
            elif im.mode == "CMYK":
                im = im.convert("RGB")

            ensure_parent(job.dst)

            exif_bytes = None
            icc_profile = None
            if not strip_meta:
                try:
                    exif = im.getexif()
                    if exif:
                        exif_bytes = exif.tobytes()
                except Exception:
                    exif_bytes = None
                icc_profile = im.info.get("icc_profile")

            save_kwargs = {
                "format": "WEBP",
                "quality": quality,
                "method": 6,
                "lossless": bool(lossless),
                "optimize": True,
            }
            if icc_profile:
                save_kwargs["icc_profile"] = icc_profile
            if exif_bytes:
                save_kwargs["exif"] = exif_bytes

            im.save(job.dst, **save_kwargs)

        return ("ok", job.dst)

    except Exception as e:
        err_file = job.src.with_suffix(".ERROR.txt")
        try:
            err_file.write_text(
                f"Source: {job.src}\nTarget: {job.dst}\n\n{repr(e)}\n",
                encoding="utf-8",
            )
        except Exception:
            pass
        return ("err", err_file)

def main():
    parser = argparse.ArgumentParser(
        description="Rekurzivní převod JPG/PNG/HEIC → WEBP (rychle, paralelně)."
    )
    parser.add_argument("--input", "-i", type=str, required=True,
                        help="Vstupní složka s obrázky (prohledává rekurzivně).")
    parser.add_argument("--output", "-o", type=str, default=None,
                        help="Výstupní složka. Když nevyplníš, ukládá vedle zdrojů (zachová strukturu).")
    parser.add_argument("--quality", "-q", type=int, default=70,
                        help="Kvalita WEBP 0–100 (default 70).")
    parser.add_argument("--lossless", action="store_true",
                        help="Bezztrátový WEBP (větší soubory; dobré pro grafiku s alfou).")
    parser.add_argument("--max-width", type=int, default=None,
                        help="Maximální šířka (poměr zachován).")
    parser.add_argument("--max-height", type=int, default=None,
                        help="Maximální výška (poměr zachován).")
    parser.add_argument("--ext", nargs="*", default=list(SUPPORTED),
                        help="Přípony ke konverzi (default: .jpg .jpeg .png .heic .heif).")
    parser.add_argument("--overwrite", action="store_true",
                        help="Přepsat existující .webp (jinak se skipne).")
    parser.add_argument("--delete-originals", action="store_true",
                        help="Po úspěšné konverzi smazat původní soubor.")
    parser.add_argument("--workers", type=int, default=os.cpu_count() or 4,
                        help="Počet paralelních vláken (default = počet CPU).")
    parser.add_argument("--dry-run", action="store_true",
                        help="Zkušební běh – jen vypíše, co by dělal.")
    parser.add_argument("--strip", action="store_true",
                        help="NEukládat EXIF/ICC (menší soubory, ale ztratíš metadata).")
    args = parser.parse_args()

    in_root = Path(args.input).resolve()
    if not in_root.exists() or not in_root.is_dir():
        print(f"[ERR] Vstupní složka nenalezena: {in_root}", file=sys.stderr)
        sys.exit(1)

    if not HEIF_OK:
        wanted = {e.lower() for e in args.ext}
        if ".heic" in wanted or ".heif" in wanted or ".heics" in wanted or ".heifs" in wanted:
            print("[WARN] HEIC/HEIF plugin není aktivní. Nainstaluj: pip install pillow-heif", file=sys.stderr)

    out_root = Path(args.output).resolve() if args.output else in_root
    out_root.mkdir(parents=True, exist_ok=True)

    imgs = find_images(in_root, args.ext)
    if not imgs:
        print("[INFO] Nenalezeny žádné obrázky.")
        sys.exit(0)

    jobs: List[Job] = [Job(src=p, dst=make_dst(p, in_root, out_root)) for p in imgs]

    print(f"[INFO] Nalezeno obrázků: {len(jobs)}")
    if args.dry_run:
        for j in jobs[:20]:
            print(f"  {j.src}  ->  {j.dst}")
        if len(jobs) > 20:
            print("  ...")
        print("[DRY-RUN] Konec.")
        sys.exit(0)

    ok = skipped = errs = 0

    with futures.ThreadPoolExecutor(max_workers=args.workers) as ex:
        futs = [
            ex.submit(
                convert_one, j, args.quality, args.lossless,
                args.max_width, args.max_height, args.overwrite,
                args.strip,
            )
            for j in jobs
        ]
        for i, f in enumerate(futs, 1):
            status, path = f.result()
            if status == "ok":
                ok += 1
            elif status == "skipped_exists":
                skipped += 1
            else:
                errs += 1
            if i % 50 == 0 or i == len(futs):
                print(f"[{i}/{len(futs)}] hotovo… (ok={ok}, skip={skipped}, err={errs})")

    if args.delete_originals:
        for j in jobs:
            if j.dst.exists():
                try:
                    j.src.unlink(missing_ok=True)
                except Exception:
                    pass

    print("\n=== Souhrn ===")
    print(f"OK:     {ok}")
    print(f"SKIP:   {skipped} (existoval .webp a --overwrite nebyl zapnut)")
    print(f"ERROR:  {errs}")
    print(f"Výstup: {out_root}")

if __name__ == "__main__":
    main()
