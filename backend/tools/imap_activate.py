#!/usr/bin/env python3
import email
import imaplib
import os
import re
import time
import uuid
from datetime import timedelta
from email.header import decode_header, make_header
from email.utils import parseaddr

from werkzeug.security import generate_password_hash

from app import app, db, now_utc, User
from config import (
  IMAP_ENABLED,
  IMAP_FOLDER,
  IMAP_HOST,
  IMAP_MARK_SEEN,
  IMAP_PASS,
  IMAP_POLL_SECONDS,
  IMAP_PORT,
  IMAP_SENDER_WHITELIST,
  IMAP_USER,
)

EMAIL_RE = re.compile(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", re.IGNORECASE)

PAYMENT_REQUIRED_AMOUNT = (os.environ.get("PAYMENT_REQUIRED_AMOUNT") or "").strip()
PAYMENT_REQUIRED_CURRENCY = (os.environ.get("PAYMENT_REQUIRED_CURRENCY") or "").strip().upper()
PAYMENT_PLAN_DAYS = int(os.environ.get("PAYMENT_PLAN_DAYS", "30"))
PAYMENT_IGNORED_EMAILS = {
  e.strip().lower()
  for e in (os.environ.get("PAYMENT_IGNORED_EMAILS") or "").split(",")
  if e.strip()
}

if not PAYMENT_IGNORED_EMAILS:
  PAYMENT_IGNORED_EMAILS = {e.strip().lower() for e in IMAP_SENDER_WHITELIST if e.strip()}


def decode_header_value(value):
  if not value:
    return ""
  try:
    return str(make_header(decode_header(value)))
  except Exception:
    return str(value)


def extract_text(msg):
  texts = []

  def get_payload(part):
    payload = part.get_payload(decode=True)
    if payload is None:
      return ""
    charset = part.get_content_charset() or "utf-8"
    try:
      return payload.decode(charset, errors="replace")
    except Exception:
      return payload.decode("utf-8", errors="replace")

  if msg.is_multipart():
    for part in msg.walk():
      if part.get_content_type() == "text/plain" and not part.get_filename():
        text = get_payload(part)
        if text:
          texts.append(text)
  else:
    text = get_payload(msg)
    if text:
      texts.append(text)

  if texts:
    return "\n".join(texts).strip()

  for part in msg.walk():
    if part.get_content_type() == "text/html" and not part.get_filename():
      html = get_payload(part)
      html = re.sub(r"<[^>]+>", " ", html or "")
      html = re.sub(r"\s+", " ", html)
      if html:
        return html.strip()

  return ""


def extract_emails(text):
  if not text:
    return []
  emails = [m.group(0).lower() for m in EMAIL_RE.finditer(text)]
  filtered = [e for e in emails if e not in PAYMENT_IGNORED_EMAILS]
  unique = []
  seen = set()
  for e in filtered:
    if e in seen:
      continue
    seen.add(e)
    unique.append(e)
  return unique


def amount_matches(text):
  if not PAYMENT_REQUIRED_AMOUNT:
    return True
  normalized = (text or "").replace(",", ".")
  amount = PAYMENT_REQUIRED_AMOUNT.replace(",", ".")
  if amount not in normalized:
    return False
  if PAYMENT_REQUIRED_CURRENCY:
    return PAYMENT_REQUIRED_CURRENCY in (text or "").upper()
  return True


def pick_email(emails):
  if not emails:
    return None
  with app.app_context():
    for addr in emails:
      if User.query.filter_by(email=addr).first():
        return addr
  return emails[0]


def activate_membership(user_email, dry_run=False):
  if not user_email:
    return False
  with app.app_context():
    user = User.query.filter_by(email=user_email).first()
    if not user:
      user = User(
        email=user_email,
        password_hash=generate_password_hash(uuid.uuid4().hex),
        plan=None,
        plan_expires_at=None,
        is_vip=False,
        conversions_used=0,
      )
      db.session.add(user)

    if dry_run:
      return True

    base = user.plan_expires_at if user.plan_expires_at and user.plan_expires_at > now_utc() else now_utc()
    user.plan = "monthly"
    user.plan_expires_at = base + timedelta(days=PAYMENT_PLAN_DAYS)
    user.is_vip = user.is_vip or False
    db.session.commit()
  return True


def process_inbox(dry_run=False):
  if not IMAP_ENABLED:
    print("IMAP is disabled. Set IMAP_ENABLED=true to activate.")
    return
  if not IMAP_USER or not IMAP_PASS:
    print("IMAP credentials missing. Set IMAP_USER and IMAP_PASS.")
    return

  with imaplib.IMAP4_SSL(IMAP_HOST, IMAP_PORT) as client:
    client.login(IMAP_USER, IMAP_PASS)
    client.select(IMAP_FOLDER)

    status, data = client.search(None, "UNSEEN")
    if status != "OK":
      print("Failed to search inbox.")
      return

    ids = data[0].split()
    for msg_id in ids:
      status, msg_data = client.fetch(msg_id, "(RFC822)")
      if status != "OK" or not msg_data:
        continue
      raw = msg_data[0][1]
      msg = email.message_from_bytes(raw)

      sender = parseaddr(msg.get("From"))[1].lower()
      if IMAP_SENDER_WHITELIST:
        if sender not in [s.lower() for s in IMAP_SENDER_WHITELIST if s.strip()]:
          continue

      subject = decode_header_value(msg.get("Subject"))
      body = extract_text(msg)
      text = f"{subject}\n{body}".strip()

      if not amount_matches(text):
        continue

      emails = extract_emails(text)
      picked = pick_email(emails)
      if not picked:
        continue

      activated = activate_membership(picked, dry_run=dry_run)
      if activated and IMAP_MARK_SEEN and not dry_run:
        client.store(msg_id, "+FLAGS", "\\Seen")


def run_loop(interval, dry_run=False):
  while True:
    try:
      process_inbox(dry_run=dry_run)
    except Exception as exc:
      print(f"IMAP worker error: {exc}")
    time.sleep(interval)


def main():
  import argparse

  parser = argparse.ArgumentParser(description="IMAP payment activation worker")
  parser.add_argument("--once", action="store_true", help="Process inbox once and exit")
  parser.add_argument("--dry-run", action="store_true", help="Parse emails without updating database")
  parser.add_argument("--interval", type=int, default=IMAP_POLL_SECONDS, help="Polling interval in seconds")
  args = parser.parse_args()

  if args.once:
    process_inbox(dry_run=args.dry_run)
    return

  run_loop(args.interval, dry_run=args.dry_run)


if __name__ == "__main__":
  main()
