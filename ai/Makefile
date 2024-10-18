.clean-venv:
	rm -rf .venv
	find . -name "poetry.lock" -exec rm {} \;

.venv:
	poetry config virtualenvs.create true --local
	poetry install  --no-root

init: .clean-venv .venv

build::
	# sh projects/server/scripts/stage_docker.sh
	# cd projects/server && docker compose -f compose.yml --verbose build
	docker build -t your-image-name .