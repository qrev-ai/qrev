# Test Project
test:: 
	pytest tests/test*.py

# Build the project
build:: test
	poetry install --with dev
	toml-sort pyproject.toml
	poetry build

# Publish the project
publish:: build
	poetry publish