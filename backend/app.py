#!/usr/bin/env python3
from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import io
import os
import tempfile
import threading
import time
import uuid
from pathlib import Path

import jwt
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.utils import secure_filename

from convert import convert_to_webp

app = Flask(__name__)
CORS(app)

# ===============================
# CONFIG
# ===============================
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL", "sqlite:///app.db")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
# max velikost jednoho requestu (~1 GB)
app.config["MAX_CONTENT_LENGTH"] = 1024 * 1024 * 1024

JWT_SECRET = os.environ.get("JWT_SECRET", "change-this-secret")
JWT_ALGO = "HS256"
JWT_EXPIRES_HOURS = int(os.environ.get("JWT_EXPIRES_HOURS", "24"))
BMC_WEBHOOK_SECRET = os.environ.get("BMC_WEBHOOK_SECRET", "change-this-bmc-secret")
FREE_LIMIT = int(os.environ.get("FREE_LIMIT", "3"))

db = SQLAlchemy(app)

# max paralelních konverzí (CPU ochrana)
MAX_CONCURRENT_CONVERSIONS = int(os.environ.get("MAX_CONCURRENT_CONVERSIONS", "4"))
conversion_semaphore = threading.Semaphore(MAX_CONCURRENT_CONVERSIONS)
_anon_usage = {}
_anon_lock = threading.Lock()


def get_anon_usage(client_id):
  if not client_id:
    return 0
  with _anon_lock:
    return _anon_usage.get(client_id, 0)


def increment_anon_usage(client_id):
  if not client_id:
    return 0
  with _anon_lock:
    _anon_usage[client_id] = _anon_usage.get(client_id, 0) + 1
    return _anon_usage[client_id]

# ===============================
# MODELS
# ===============================
def now_utc():
  return datetime.now(timezone.utc)


class User(db.Model):
  __tablename__ = "users"
  id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
  email = db.Column(db.String(255), unique=True, nullable=False)
  first_name = db.Column(db.String(120), nullable=True)
  last_name = db.Column(db.String(120), nullable=True)
  password_hash = db.Column(db.String(255), nullable=False)
  plan = db.Column(db.String(20), nullable=True)  # monthly
  plan_expires_at = db.Column(db.DateTime(timezone=True), nullable=True)
  is_vip = db.Column(db.Boolean, nullable=False, default=False)
  conversions_used = db.Column(db.Integer, nullable=False, default=0)
  created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=now_utc)
  updated_at = db.Column(
    db.DateTime(timezone=True),
    nullable=False,
    default=now_utc,
    onupdate=now_utc,
  )

  def to_dict(self):
    return {
      "id": self.id,
      "email": self.email,
      "first_name": self.first_name or "",
      "last_name": self.last_name or "",
      "plan": self.plan,
      "plan_expires_at": self.plan_expires_at.isoformat() if self.plan_expires_at else None,
      "is_vip": bool(self.is_vip),
      "conversions_used": self.conversions_used or 0,
      "created_at": self.created_at.isoformat() if self.created_at else None,
    }


with app.app_context():
  db.create_all()
  # If the table already exists (older deployment), ensure new columns are present.
  try:
    insp = db.inspect(db.engine)
    cols = {c["name"] for c in insp.get_columns("users")}
    with db.engine.connect() as conn:
      if "is_vip" not in cols:
        conn.execute(db.text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT FALSE"))
      if "conversions_used" not in cols:
        conn.execute(db.text("ALTER TABLE users ADD COLUMN IF NOT EXISTS conversions_used INTEGER DEFAULT 0"))
      conn.execute(db.text("UPDATE users SET is_vip = FALSE WHERE is_vip IS NULL"))
      conn.execute(db.text("UPDATE users SET conversions_used = 0 WHERE conversions_used IS NULL"))
  except Exception as e:
    app.logger.warning(f"Could not ensure user columns: {e}")

# ===============================
# HELPERS
# ===============================
def _to_int(val, default=None, lo=None, hi=None):
  try:
    x = int(val)
    if lo is not None:
      x = max(lo, x)
    if hi is not None:
      x = min(hi, x)
    return x
  except Exception:
    return default


def issue_token(user):
  payload = {
    "sub": user.id,
    "exp": now_utc() + timedelta(hours=JWT_EXPIRES_HOURS),
  }
  return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


def _get_token_from_request():
  auth = request.headers.get("Authorization", "")
  if not auth:
    return None
  parts = auth.split(" ", 1)
  if len(parts) == 2 and parts[0].lower() == "bearer":
    return parts[1].strip()
  return None


def get_current_user():
  token = _get_token_from_request()
  if not token:
    return None
  try:
    payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
  except Exception:
    return None
  user_id = payload.get("sub")
  if not user_id:
    return None
  return db.session.get(User, user_id)


def ensure_auth():
  user = get_current_user()
  if not user:
    return None, (jsonify({"error": "Unauthorized"}), 401)
  return user, None


def plan_active(user):
  if getattr(user, "is_vip", False):
    return True
  if not user.plan_expires_at:
    return False
  return user.plan_expires_at > now_utc()


def normalize_email(email):
  return (email or "").strip().lower()


def infer_plan(payload):
  # Only monthly memberships are supported.
  return "monthly"


def verify_bmc_signature(raw_payload, signature):
  if not signature or not BMC_WEBHOOK_SECRET:
    return False
  try:
    sig_bytes = bytes.fromhex(signature.strip())
    expected = hmac.new(
      BMC_WEBHOOK_SECRET.encode("utf-8"),
      raw_payload,
      hashlib.sha256
    ).digest()
    return hmac.compare_digest(expected, sig_bytes)
  except Exception:
    return False

# ===============================
# HEALTH
# ===============================
@app.get("/health")
def health():
  return {"status": "ok"}


@app.get("/api/health")
def api_health():
  return {"status": "ok"}

# ===============================
# AUTH ENDPOINTS
# ===============================
@app.post("/api/register")
def api_register():
  data = request.get_json(silent=True) or {}
  email = normalize_email(data.get("email"))
  password = data.get("password") or ""
  first_name = (data.get("first_name") or "").strip()
  last_name = (data.get("last_name") or "").strip()

  if not email or not password:
    return jsonify({"error": "Email and password are required"}), 400

  existing = User.query.filter_by(email=email).first()
  if existing:
    return jsonify({"error": "User already exists"}), 409

  user = User(
    email=email,
    first_name=first_name,
    last_name=last_name,
    password_hash=generate_password_hash(password),
    plan=None,
    plan_expires_at=None,
    is_vip=False,
    conversions_used=0,
  )
  db.session.add(user)
  db.session.commit()

  token = issue_token(user)
  return jsonify({"token": token, "user": user.to_dict()}), 201


@app.post("/api/login")
def api_login():
  data = request.get_json(silent=True) or {}
  email = normalize_email(data.get("email"))
  password = data.get("password") or ""

  if not email or not password:
    return jsonify({"error": "Email and password are required"}), 400

  user = User.query.filter_by(email=email).first()
  if not user or not check_password_hash(user.password_hash, password):
    return jsonify({"error": "Invalid credentials"}), 401

  token = issue_token(user)
  return jsonify({"token": token, "user": user.to_dict()})


@app.get("/api/me")
def api_me():
  user = get_current_user()
  if not user:
    return jsonify({"error": "Unauthorized"}), 401
  return jsonify({"user": user.to_dict(), "plan_active": plan_active(user)})


@app.post("/api/activate-access")
def api_activate_access():
  user, err = ensure_auth()
  if err:
    return err

  data = request.get_json(silent=True) or {}
  plan = (data.get("plan") or "").strip().lower()
  if plan in {"daily", "day"}:
    plan = "monthly"
  if plan != "monthly":
    return jsonify({"error": "Invalid plan"}), 400

  delta = timedelta(days=30)
  base = user.plan_expires_at if user.plan_expires_at and user.plan_expires_at > now_utc() else now_utc()
  user.plan = plan
  user.plan_expires_at = base + delta
  user.is_vip = user.is_vip or False
  db.session.commit()

  token = issue_token(user)
  return jsonify({"token": token, "user": user.to_dict(), "plan_active": True})

# ===============================
# WEBHOOK: Buy Me a Coffee
# ===============================
@app.post("/api/webhooks/bmc")
def api_webhook_bmc():
  raw_payload = request.get_data()
  payload = request.get_json(silent=True) or {}

  sig = (
    request.headers.get("x-signature-sha256")
    or request.headers.get("X-Signature-Sha256")
  )

  shared_secret = (
    request.headers.get("X-BMC-Secret")
    or request.headers.get("Authorization", "").replace("Bearer ", "").strip()
  )

  # ===============================
  # AUTHORIZATION (PRODUCTION ONLY)
  # ===============================
  authorized = False

  # 1) PRIMARY – HMAC signature (correct production way)
  if sig and BMC_WEBHOOK_SECRET:
    authorized = verify_bmc_signature(raw_payload, sig)

  # 2) SECONDARY – shared secret (manual / fallback)
  elif shared_secret and BMC_WEBHOOK_SECRET:
    authorized = shared_secret == BMC_WEBHOOK_SECRET

  if not authorized:
    return jsonify({"error": "Unauthorized"}), 401

  # ===============================
  # EVENT + DATA
  # ===============================
  event_type = (payload.get("type") or "").strip().lower()
  data = payload.get("data") or {}

  # ===============================
  # EMAIL
  # ===============================
  email = normalize_email(
    data.get("supporter_email")
    or payload.get("email")
    or payload.get("supporter_email")
    or payload.get("payer_email")
    or payload.get("sender_email")
  )

  if not email:
    return jsonify({"error": "Missing email"}), 400

  user = User.query.filter_by(email=email).first()
  if not user:
    user = User(
      email=email,
      password_hash=generate_password_hash(uuid.uuid4().hex),
      plan=None,
      plan_expires_at=None,
      is_vip=False,
      conversions_used=0,
    )
    db.session.add(user)
    db.session.commit()

  if event_type not in {"membership.started", "membership.renewed", "donation.created"}:
    return jsonify({"ok": True, "ignored": event_type or "unknown"})

  plan = "monthly"
  delta = timedelta(days=30)

  base = (
    user.plan_expires_at
    if user.plan_expires_at and user.plan_expires_at > now_utc()
    else now_utc()
  )

  user.plan = plan
  user.plan_expires_at = base + delta
  user.is_vip = user.is_vip or False

  db.session.commit()

  token = issue_token(user)

  return jsonify({
    "ok": True,
    "email": user.email,
    "plan": plan,
    "plan_active": True,
    "expires_at": user.plan_expires_at.isoformat(),
    "token": token,
  })


# ===============================
# API: /api/convert
# ===============================
@app.post("/api/convert")
def api_convert():
  user = get_current_user()
  client_id = (
    request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
    or request.headers.get("X-Real-IP", "").strip()
    or request.remote_addr
    or "anonymous"
  )

  if "image" not in request.files:
    return jsonify({"error": "No file uploaded"}), 400

  if user and plan_active(user):
    pass
  elif user:
    used = user.conversions_used or 0
    if used >= FREE_LIMIT:
      return jsonify({
        "error": "Membership required",
        "code": "free_limit_reached",
        "remaining": 0,
      }), 402
  else:
    used = get_anon_usage(client_id)
    if used >= FREE_LIMIT:
      return jsonify({
        "error": "Membership required",
        "code": "free_limit_reached",
        "remaining": 0,
      }), 402

  acquired = conversion_semaphore.acquire(timeout=600)
  if not acquired:
    return jsonify({"error": "Server busy, try again later"}), 429

  start_time = time.time()
  conversion_ok = False

  try:
    f = request.files["image"]
    filename = secure_filename(f.filename or "uploaded")
    stem = Path(filename).stem
    outname = f"{stem}.webp"

    q = _to_int(request.form.get("quality"), default=72, lo=1, hi=100)
    if q is None:
      q = 72

    max_w = _to_int(request.form.get("max_width"), default=None, lo=1, hi=12000)

    with tempfile.TemporaryDirectory() as tmpdir:
      tmpdir = Path(tmpdir)
      in_path = tmpdir / filename
      out_path = tmpdir / outname

      f.save(in_path)

      ok, err_msg = convert_to_webp(
        in_path,
        out_path,
        quality=q,
        max_width=max_w
      )

      if not ok or not out_path.exists():
        return jsonify({
          "error": "Conversion failed",
          "detail": err_msg
        }), 500

      with open(out_path, "rb") as fh:
        data = fh.read()

    conversion_ok = True

    bio = io.BytesIO(data)
    bio.seek(0)

    return send_file(
      bio,
      mimetype="image/webp",
      as_attachment=True,
      download_name=outname,
      max_age=0,
      conditional=False,
      etag=False,
      last_modified=None,
    )

  finally:
    if conversion_ok:
      if user and not plan_active(user):
        try:
          if user.conversions_used is None:
            user.conversions_used = 0
          user.conversions_used += 1
          db.session.commit()
        except Exception as e:
          app.logger.warning(f"failed to update conversions_used: {e}")
      elif not user:
        increment_anon_usage(client_id)
    conversion_semaphore.release()
    duration = round(time.time() - start_time, 2)
    app.logger.info(f"conversion finished in {duration}s user={(user.id if user else f'anon:{client_id}')}")

# ===============================
# LOCAL DEV (nepoužívá se v Dockeru)
# ===============================
if __name__ == "__main__":
  app.run(host="0.0.0.0", port=5000, debug=False)
