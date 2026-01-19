# Webpify Batch

Fast, modern batch **WebP image converter** for HEIC (iPhone), JPG, and PNG formats.

Webpify Batch is a full‑stack web application combining a **React PWA frontend** with a **Flask API backend**, designed for high‑performance image conversion, optional user accounts, and membership‑based access control.

---

## ✨ Features

* Batch conversion of **HEIC / JPG / PNG → WebP**
* Adjustable image **quality** and **maximum width**
* High‑performance parallel image processing
* Automatic **ZIP download** of converted files
* Client‑side drag & drop UI
* Optional authentication system (JWT)
* Membership / access gating
* **Buy Me a Coffee** webhook integration
* Progressive Web App (PWA) support
* CLI tool for offline recursive batch conversion

---

## 🧰 Tech Stack

### Backend

* Python
* Flask
* Pillow + pillow‑heif
* SQLAlchemy
* JWT authentication
* SQLite (default) / PostgreSQL support

### Frontend

* React
* Vite
* Tailwind CSS
* JSZip
* file‑saver
* PWA (Workbox)

### Deployment

* Docker
* docker‑compose

---

## 📁 Project Structure

```
webpify-batch/
│
├── backend/                 # Flask API & conversion logic
│   ├── app/
│   ├── tools/
│   ├── requirements.txt
│   └── run_local.py
│
├── frontend/
│   └── img-webp-ui/         # React PWA frontend
│
├── docker-compose.yml       # Production deployment
├── deploy_all.ps1           # Optional build & push helper
└── .env.example
```

---

## 🚀 Local Development

### Prerequisites

* Python **3.9+**
* Node.js **18+ (LTS recommended)**

---

### Backend

```bash
python -m venv .venv
source .venv/bin/activate
# Windows:
# .venv\Scripts\activate

pip install -r backend/requirements.txt
python backend/run_local.py
```

Backend runs at:

```
http://127.0.0.1:5000
```

---

### Frontend

```bash
cd frontend/img-webp-ui
npm install
npm run dev
```

Frontend runs at:

```
http://127.0.0.1:5173
```

API requests are proxied automatically:

```
/api → http://127.0.0.1:5000
```

---

## 🔐 Environment Variables

Copy the example configuration:

```bash
cp .env.example .env
```

### Backend (.env)

```
DATABASE_URL=sqlite:///app.db
JWT_SECRET=change-me
JWT_EXPIRES_HOURS=24

FREE_LIMIT=3
MAX_CONCURRENT_CONVERSIONS=4

BMC_WEBHOOK_SECRET=

# Optional Stripe integration
STRIPE_PUBLIC_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_SUCCESS_URL=
STRIPE_CANCEL_URL=

# Optional email activation
IMAP_HOST=
IMAP_USER=
IMAP_PASSWORD=
```

Backend configuration logic is located in:

```
backend/config.py
```

---

### Frontend environment files

```
frontend/img-webp-ui/.env.development
frontend/img-webp-ui/.env.production
```

Main variables:

```
VITE_API_BASE=/api
VITE_BMC_WIDGET_ID=
VITE_BMC_PROFILE_URL=
```

---

## 🔌 API Overview

| Method | Endpoint             | Description                       |
| ------ | -------------------- | --------------------------------- |
| POST   | /api/convert         | Upload images for WebP conversion |
| POST   | /api/register        | User registration                 |
| POST   | /api/login           | User login                        |
| GET    | /api/me              | Current user info                 |
| POST   | /api/activate-access | Membership activation             |
| POST   | /api/webhooks/bmc    | Buy Me a Coffee webhook           |
| GET    | /health              | Service health check              |
| GET    | /api/health          | API health check                  |

---

## 🐳 Docker Deployment

```bash
cp .env.example .env

# set image tags
export FRONTEND_TAG=latest
export BACKEND_TAG=latest

docker compose up -d
```

Docker images can be prebuilt or pulled from a registry.

---

## 🧪 CLI Batch Conversion

Offline recursive image conversion without the web UI:

```bash
python backend/tools/webpify_batch.py \
  --input ./photos \
  --output ./out \
  --quality 72
```

Supports nested folders and preserves directory structure.

---

## 🔒 Security Notes

* Never commit `.env` or `.env.local`
* Rotate secrets if exposed
* Webhooks must be verified via signature
* File uploads are validated and size‑limited

---

## 📜 License

MIT License

---

## 👤 Author

**Lukas Krumpach**
Python Backend Developer

GitHub: [https://github.com/Lakyn80](https://github.com/Lakyn80)

---

If you find this project useful, feel free to ⭐ star the repository.
