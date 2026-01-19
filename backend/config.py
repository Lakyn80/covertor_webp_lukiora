import os


def _env(key, default=None):
  return os.environ.get(key, default)


# Security / auth
JWT_SECRET = _env("JWT_SECRET", "change-this-secret")
JWT_ALGO = "HS256"
JWT_EXPIRES_HOURS = int(_env("JWT_EXPIRES_HOURS", "24"))

# Webhook secrets
BMC_WEBHOOK_SECRET = _env("BMC_WEBHOOK_SECRET", "change-this-bmc-secret")

# IMAP (email-based activation)
IMAP_ENABLED = (_env("IMAP_ENABLED", "false") or "").lower() == "true"
IMAP_HOST = _env("IMAP_HOST", "127.0.0.1")
IMAP_PORT = int(_env("IMAP_PORT", "993"))
IMAP_USER = _env("IMAP_USER")
IMAP_PASS = _env("IMAP_PASS")
IMAP_FOLDER = _env("IMAP_FOLDER", "INBOX")
IMAP_SENDER_WHITELIST = [
  x.strip().lower() for x in (_env("IMAP_SENDER_WHITELIST", "support@buymeacoffee.com,no-reply@buymeacoffee.com") or "").split(",") if x.strip()
]
IMAP_POLL_SECONDS = int(_env("IMAP_POLL_SECONDS", "60"))
IMAP_MARK_SEEN = (_env("IMAP_MARK_SEEN", "true") or "").lower() == "true"

# Stripe (test/prod)
STRIPE_SECRET_KEY = _env("STRIPE_SECRET_KEY")
STRIPE_PUBLISHABLE_KEY = _env("STRIPE_PUBLISHABLE_KEY")
STRIPE_WEBHOOK_SECRET = _env("STRIPE_WEBHOOK_SECRET")
STRIPE_PRICE_DAILY = _env("STRIPE_PRICE_DAILY")
STRIPE_PRICE_MONTHLY = _env("STRIPE_PRICE_MONTHLY")
STRIPE_SUCCESS_URL = _env("STRIPE_SUCCESS_URL", "http://localhost:8084?status=success")
STRIPE_CANCEL_URL = _env("STRIPE_CANCEL_URL", "http://localhost:8084?status=cancel")
