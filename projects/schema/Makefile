# Install the project
install::
	poetry install

# Format the project
format::
	toml-sort pyproject.toml

# Test Project
test:: 
	pytest tests

# Build the project
build:: format
	poetry build

# Publish the project
publish:: test build 
	poetry publish