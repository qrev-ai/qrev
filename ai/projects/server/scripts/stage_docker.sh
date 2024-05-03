QREV_AI_DIR_NAME=ai

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
PROJECT_DIR=$(python -c "import os,sys; print(os.path.realpath(sys.argv[1]))" ${SCRIPT_DIR}/..)
QAI_ROOT_DIR=$(python -c "import os,sys; print(os.path.realpath(sys.argv[1]))" ${SCRIPT_DIR}/../../..)
QAI_ROOT_NAME=$(basename ${QAI_ROOT_DIR})

echo "Project directory: ${PROJECT_DIR}, QAI root directory: ${QAI_ROOT_DIR}"

## Assert that the directory structure is correct. qai/projects/${PROJECT}
if [ ${QAI_ROOT_NAME} != ${QREV_AI_DIR_NAME} ] ; then
    echo "The directory structure should be ai/projects/<project folders>" 1>&2
    echo "Found directory ${QAI_ROOT_NAME}" 1>&2
    exit 1
fi

STAGING_DIR=${QAI_ROOT_DIR}/docker_staging-qai-server
echo "Staging directory: ${STAGING_DIR}"
mkdir -p ${STAGING_DIR}

## AWS credentials
mkdir -p ${STAGING_DIR}/.aws
rsync ~/.aws/config ~/.aws/credentials ${STAGING_DIR}/.aws

## NLTK data to prevent downloading (Optional)
rsync -rt ~/nltk_data ${STAGING_DIR}/

## Configs
mkdir -p ${STAGING_DIR}/.config
rsync -rt ~/.config/qai ${STAGING_DIR}/.config
rsync -rt ~/.config/qai-ai ${STAGING_DIR}/.config
rsync -rt ~/.config/qai-scraper ${STAGING_DIR}/.config
rsync -rt ~/.config/qai-storage ${STAGING_DIR}/.config
rsync -rt ~/.config/dpypi ${STAGING_DIR}/.config

## Update configs with dynamic values
#sed -i '' "s/.*build_time.*/build_time = '$(shell date +%F)'/" ${STAGING_DIR}/.config/chatbot/config.toml
#sed -i '' "s/.*git_hash.*/git_hash = '$(git rev-parse HEAD)'/" ${STAGING_DIR}/.config/chatbot/config.toml

poetry export --without-hashes --format=requirements.txt > ${STAGING_DIR}/requirements.txt