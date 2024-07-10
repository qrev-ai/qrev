test::
	pytest -v tests

format::
	toml-sort pyproject.toml

build:: format
	poetry build

publish:: build
	poetry publish 