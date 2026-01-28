# IMG-WEBP

Web application for converting images to WebP format.

---

## Architecture

img-webp/
├── backend/ # Flask API
│ └── /api/convert
│
├── frontend-next/ # Next.js frontend (active)
│
├── docker-compose.yml
├── deploy_all.ps1
├── deploy/
│ └── nginx.imgwebp.conf
└── README.md


---

## Active stack

- Frontend: **Next.js**
- Backend: **Flask**
- Reverse proxy: **Nginx**
- Containerization: **Docker**

---

## Networking

- `/` → Next.js (port 8084)
- `/api` → Flask backend

Frontend always calls API via:

/api/convert


No hardcoded backend URLs are used.

---

## Request flow

Browser
↓
Nginx
↓
Next.js (8084)
↓
/api/*
↓
Flask backend


---

## Docker

`docker-compose.yml` builds and runs:

- frontend-next
- backend

Legacy Vite frontend is removed and not used.

---

## Deployment

Deployment is handled by:

deploy_all.ps1


Only Next frontend is deployed.

---

## Tests

Backend tests (pytest):

```
python -m pip install -r backend/requirements.txt -r backend/requirements-dev.txt
pytest -q
```

---

## Status

- Single frontend (Next.js)
- Unified API routing
- Production-ready
