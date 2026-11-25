# Etapa 1: compila o site (React/Vite)
FROM node:22-slim AS site
WORKDIR /site
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Etapa 2: servidor Flask com a IA, só CPU
FROM python:3.12-slim
RUN useradd -m -u 1000 app
WORKDIR /app
RUN pip install --no-cache-dir torch==2.14.1 torchvision==0.29.1 --index-url https://download.pytorch.org/whl/cpu \
 && pip install --no-cache-dir flask==3.1.3 pillow==13.0.0 open_clip_torch==4.2.2
COPY app.py rvm.py filtro.py ./
COPY templates/ templates/
COPY model/reciclaai.pth model/reciclaai.pth
COPY --from=site /site/dist frontend/dist
ENV HF_HOME=/app/.cache PORT=7860 PYTHONUNBUFFERED=1
# Baixa os pesos do CLIP (~600 MB) agora, para o site não depender disso ao ligar.
RUN python -c "import filtro, sys; sys.exit(filtro.carregar() is None)" && chown -R app:app /app
USER app
EXPOSE 7860
CMD ["python", "app.py"]
