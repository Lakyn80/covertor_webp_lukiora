from __future__ import annotations
from pathlib import Path
from typing import Optional, Tuple

from PIL import Image, ImageOps

# HEIC/HEIF podpora (iPhone)
try:
    from pillow_heif import register_heif_opener  # type: ignore
    register_heif_opener()
except Exception:
    pass

def _choose_save_kwargs(src: Path, im: Image.Image, quality: int):
    ext = src.suffix.lower()
    save = {
        "format": "WEBP",
        "method": 6,
        "optimize": True,
    }

    icc = im.info.get("icc_profile")
    if icc:
        save["icc_profile"] = icc
    try:
        exif = im.getexif()
        if exif:
            save["exif"] = exif.tobytes()
    except Exception:
        pass

    if ext in (".jpg", ".jpeg", ".heic", ".heif"):
        save["lossless"] = False
        save["quality"] = int(quality)
    elif ext == ".png":
        if im.mode in ("RGBA", "LA"):
            save["lossless"] = True
        else:
            save["lossless"] = True
            save["quality"] = 90
    else:
        save["lossless"] = False
        save["quality"] = int(quality)

    return save

def _resize_if_needed(im: Image.Image, max_width: Optional[int]) -> Image.Image:
    if max_width and max_width > 0 and im.width > max_width:
        new_h = max(1, int(im.height * (max_width / im.width)))
        im = im.resize((max_width, new_h), Image.Resampling.LANCZOS)
    return im

def convert_to_webp(input_path: Path, output_path: Path, *, quality: int = 72, max_width: Optional[int] = None) -> Tuple[bool, Optional[str]]:
    try:
        with Image.open(input_path) as im:
            im = ImageOps.exif_transpose(im)
            im = _resize_if_needed(im, max_width)

            if im.mode in ("I;16", "I", "F"):
                im = im.convert("RGB")
            elif im.mode in ("P", "LA"):
                im = im.convert("RGBA")
            elif im.mode == "CMYK":
                im = im.convert("RGB")

            save_kwargs = _choose_save_kwargs(input_path, im, quality)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            im.save(output_path, **save_kwargs)

        return True, None
    except Exception as e:
        return False, repr(e)
