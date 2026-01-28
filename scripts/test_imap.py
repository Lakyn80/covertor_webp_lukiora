"""
Quick IMAP read-only test.

Usage:
  IMAP_USER=service@lukiora.com IMAP_PASS=secret python scripts/test_imap.py

Optional env vars:
  IMAP_HOST (default 127.0.0.1)
  IMAP_PORT (default 993)
  IMAP_FOLDER (default INBOX)
"""
import email
import imaplib
import os
from email.header import decode_header

IMAP_HOST = os.environ.get("IMAP_HOST", "127.0.0.1")
IMAP_PORT = int(os.environ.get("IMAP_PORT", "993"))
IMAP_USER = os.environ.get("IMAP_USER", "service@lukiora.com")
IMAP_PASS = os.environ.get("IMAP_PASS", "")
IMAP_FOLDER = os.environ.get("IMAP_FOLDER", "INBOX")


def decode(val):
  if not val:
    return ""
  parts = decode_header(val)
  out = ""
  for part, enc in parts:
    if isinstance(part, bytes):
      out += part.decode(enc or "utf-8", errors="ignore")
    else:
      out += part
  return out


def main():
  mail = imaplib.IMAP4_SSL(IMAP_HOST, IMAP_PORT)
  mail.login(IMAP_USER, IMAP_PASS)
  mail.select(IMAP_FOLDER)

  status, data = mail.search(None, "ALL")
  if status != "OK":
    raise RuntimeError(f"IMAP search failed: {status}")

  ids = data[0].split()[-5:]  # last 5 emails
  for num in ids:
    status, msg_data = mail.fetch(num, "(RFC822)")
    if status != "OK" or not msg_data or not msg_data[0]:
      continue
    msg_bytes = msg_data[0][1]
    if isinstance(msg_bytes, bytes):
      msg = email.message_from_bytes(msg_bytes)
    else:
      continue
    print("FROM:", decode(msg.get("From")))
    print("SUBJECT:", decode(msg.get("Subject")))
    print("-" * 40)

  mail.logout()


if __name__ == "__main__":
  main()
