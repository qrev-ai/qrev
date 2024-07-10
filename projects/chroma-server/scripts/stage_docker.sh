### Stages all the necessary files for the creation of the Docker image
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
PROJECT_DIR=$(python -c "import os,sys; print(os.path.realpath(sys.argv[1]))" ${SCRIPT_DIR}/..)
STAGING_DIR=${PROJECT_DIR}/docker_staging

mkdir -p ${STAGING_DIR}

## Copy Configs
mkdir -p ${STAGING_DIR}/.config
rsync -r ~/.config/chroma-server ${STAGING_DIR}/.config/ || echo ~/.config/chroma-server not found skipping
rsync -r ~/.config/dpypi ${STAGING_DIR}/.config/ || echo ~/.config/dpypi not found skipping

rsync -r ~/.aws ${STAGING_DIR}/ || echo ~/.aws not found skipping

## Copy Cache
mkdir -p ${STAGING_DIR}/.cache
rsync -r ~/.cache/chroma ${STAGING_DIR}/.cache/ || echo ~/.cache/chroma not found skipping

## Strip out local group from pyproject.toml and place it in the staging directory
## Poetry will complain if there are local dependencies that do not exist
python <<EOF
import toml

with open('${PROJECT_DIR}/pyproject.toml', 'r') as f:
    config = toml.load(f)
try: # remove "tool.poetry.group.local"
    del config["tool"]["poetry"]["group"]["local"]
except:
    pass
with open('${STAGING_DIR}/pyproject.toml', 'w') as f:
    toml.dump(config, f)
EOF
