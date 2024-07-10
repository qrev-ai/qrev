.clean-venv:
	rm -rf .venv
	find . -name "poetry.lock" -exec rm {} \;

.venv:
	poetry config virtualenvs.create true --local
	poetry install  --no-root

init: .clean-venv .venv

