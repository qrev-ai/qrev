from pathlib import Path
import os
import glob
import boto3

def download_dir(bucket_name, s3_folder, local_dir=None):
    """
    From: https://stackoverflow.com/questions/49772151/download-a-folder-from-s3-using-boto3
    Download the contents of a folder directory
    Args:
        bucket_name: the name of the s3 bucket
        s3_folder: the folder path in the s3 bucket
        local_dir: a relative or absolute directory path in the local file system
    """
    if not local_dir is None:
        local_dir = os.path.expanduser(local_dir)
    s3 = boto3.resource("s3")
    bucket = s3.Bucket(bucket_name)
    for obj in bucket.objects.filter(Prefix=s3_folder):
        target = obj.key if local_dir is None \
            else os.path.join(local_dir, os.path.relpath(obj.key, s3_folder))
        if not os.path.exists(os.path.dirname(target)):
            os.makedirs(os.path.dirname(target))
        if obj.key[-1] == '/':
            continue
        bucket.download_file(obj.key, target)

def upload_dir(localDir, awsInitDir, bucketName, tag="*", prefix="/"):
    """
    from https://stackoverflow.com/questions/56426471/upload-folder-with-sub-folders-and-files-on-s3-using-python
    from current working directory, upload a 'localDir' with all its subcontents (files and subdirectories...)
    to a aws bucket
    Parameters
    ----------
    localDir :   localDirectory to be uploaded, with respect to current working directory
    awsInitDir : prefix 'directory' in aws
    bucketName : bucket in aws
    tag :        tag to select files, like *png
                NOTE: if you use tag it must be given like --tag '*txt', in some quotation marks... for argparse
    prefix :     to remove initial '/' from file names

    Returns
    -------
    None
    """
    s3 = boto3.resource("s3")
    cwd = str(Path.cwd())
    p = Path(os.path.join(Path.cwd(), localDir))
    remove_prefix = os.path.join(*p.parts[:-1])
    print(f"cwd={cwd}  p={p}  remove_prefix={remove_prefix}")

    mydirs = list(p.glob("**"))
    for mydir in mydirs:
        fileNames = glob.glob(os.path.join(mydir, tag))
        fileNames = [f for f in fileNames if not Path(f).is_dir()]
        rows = len(fileNames)
        for i, fileName in enumerate(fileNames):
            fileName = str(fileName).replace(cwd, "")
            if fileName.startswith(prefix):  # only modify the text if it starts with the prefix
                fileName = fileName.replace(prefix, "", 1)  # remove one instance of prefix
            if not fileName.startswith("/"):
                fileName = "/" + fileName

            awsPath = os.path.join(awsInitDir, str(fileName))
            awsPath = awsPath.replace(remove_prefix, "", 1)
            print(f"{i:03d}/{rows}: fileName {fileName}  aws={awsPath}")
            s3.meta.client.upload_file(fileName, bucketName, awsPath)

## list the contents of the bucket
# s3 = boto3.client("s3")
# response = s3.list_objects_v2(Bucket=bucket)
# for obj in response.get("Contents", []):
#     print(obj["Key"])
