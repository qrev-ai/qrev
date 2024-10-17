
# Install the project
install:: 
	poetry install --with dev
	
# Test Project
test:: 
	python -m unittest discover tests

# Build the project
build:: 
	poetry install --with dev
	toml-sort pyproject.toml
	poetry build

# Publish the project
publish:: build
	poetry publish