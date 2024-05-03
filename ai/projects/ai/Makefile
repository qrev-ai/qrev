# Test Project
test:: 
	python -m unittest

# Build the project
build:: test
	poetry install --with dev
	toml-sort pyproject.toml
	poetry build

# Publish the project
publish:: build
	poetry publish