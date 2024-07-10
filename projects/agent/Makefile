# Test Project
test:: 
	# python -m unittest
	pytest tests/*test_*.py

# Build the project
build:: 
	poetry install --with dev
	toml-sort pyproject.toml
	poetry build

# Publish the project
publish:: build
	poetry publish
