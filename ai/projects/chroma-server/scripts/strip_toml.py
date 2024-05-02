import toml
 
# Load a TOML file
with open('pyproject.toml', 'r') as f:
    config = toml.load(f)
 
# "tool.poetry.group.local"
del config["tool"]["poetry"]["group"]["local"]
with open('temp.toml', 'w') as f:
    toml.dump(config, f)