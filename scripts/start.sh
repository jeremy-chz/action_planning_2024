#!/usr/bin/env bash
# Lance backend + frontend en parallèle
set -e

echo "🚀 Action Planning — Démarrage"

# Backend
echo "▶ Démarrage du backend FastAPI..."
cd backend
pip install -r requirements.txt -q
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

# Attendre que le backend soit prêt
sleep 2

# Frontend
echo "▶ Démarrage du frontend React..."
cd frontend
npm install -q
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Prêt !"
echo "   → Frontend : http://localhost:5173"
echo "   → API docs  : http://localhost:8000/docs"
echo ""
echo "Ctrl+C pour tout arrêter"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
