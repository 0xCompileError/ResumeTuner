APP_NAME=main
HOST=127.0.0.1
PORT=8000

.PHONY: run install format lint clean

install:
	pip install -r requirements.txt

run:
	uvicorn $(APP_NAME):app --host $(HOST) --port $(PORT) --reload

format:
	black .

lint:
	flake8 .

clean:
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -exec rm -r {} +
