import os
from collections import namedtuple
from dataclasses import dataclass
from operator import attrgetter

import boto3

S3Obj = namedtuple("S3Obj", ["key", "mtime", "size", "ETag"])


def bucket_list(
    bucket: str | object,
    path,
    start=None,
    end=None,
    recursive=True,
    list_dirs=True,
    list_objs=True,
    limit=None,
):
    """
    Iterator that lists a bucket's objects under path, (optionally) starting with
    start and ending before end.

    If recursive is False, then list only the "depth=0" items (dirs and objects).

    If recursive is True, then list recursively all objects (no dirs).

    Args:
        bucket:
            a boto3.resource('s3').Bucket().
        path:
            a directory in the bucket.
        start:
            optional: start key, inclusive (may be a relative path under path, or
            absolute in the bucket)
        end:
            optional: stop key, exclusive (may be a relative path under path, or
            absolute in the bucket)
        recursive:
            optional, default True. If True, lists only objects. If False, lists
            only depth 0 "directories" and objects.
        list_dirs:
            optional, default True. Has no effect in recursive listing. On
            non-recursive listing, if False, then directories are omitted.
        list_objs:
            optional, default True. If False, then directories are omitted.
        limit:
            optional. If specified, then lists at most this many items.

    Returns:
        an iterator of S3Obj.

    Examples:
        # set up
        >>> s3 = boto3.resource('s3')
        ... bucket = s3.Bucket('bucket-name')

        # iterate through all S3 objects under some dir
        >>> for p in s3list(bucket, 'some/dir'):
        ...     print(p)

        # iterate through up to 20 S3 objects under some dir, starting with foo_0010
        >>> for p in s3list(bucket, 'some/dir', limit=20, start='foo_0010'):
        ...     print(p)

        # non-recursive listing under some dir:
        >>> for p in s3list(bucket, 'some/dir', recursive=False):
        ...     print(p)

        # non-recursive listing under some dir, listing only dirs:
        >>> for p in s3list(bucket, 'some/dir', recursive=False, list_objs=False):
        ...     print(p)
    """
    if isinstance(bucket, str):
        s3 = boto3.resource("s3")
        bucket = s3.Bucket(bucket)

    kwargs = dict()
    if start is not None:
        if not start.startswith(path):
            start = os.path.join(path, start)
        # note: need to use a string just smaller than start, because
        # the list_object API specifies that start is excluded (the first
        # result is *after* start).
        kwargs.update(Marker=__prev_str(start))
    if end is not None:
        if not end.startswith(path):
            end = os.path.join(path, end)
    if not recursive:
        kwargs.update(Delimiter="/")
        if not path.endswith("/"):
            path += "/"
    kwargs.update(Prefix=path)
    if limit is not None:
        kwargs.update(PaginationConfig={"MaxItems": limit})

    paginator = bucket.meta.client.get_paginator("list_objects")
    for resp in paginator.paginate(Bucket=bucket.name, **kwargs):
        q = []

        if "CommonPrefixes" in resp and list_dirs:
            q = [S3Obj(f["Prefix"], None, None, None) for f in resp["CommonPrefixes"]]
        if "Contents" in resp and list_objs:
            q += [
                S3Obj(f["Key"], f["LastModified"], f["Size"], f["ETag"]) for f in resp["Contents"]
            ]
        # note: even with sorted lists, it is faster to sort(a+b)
        # than heapq.merge(a, b) at least up to 10K elements in each list
        q = sorted(q, key=attrgetter("key"))
        if limit is not None:
            q = q[:limit]
            limit -= len(q)
        for p in q:
            if end is not None and p.key >= end:
                return
            yield p


def __prev_str(s):
    if len(s) == 0:
        return s
    s, c = s[:-1], ord(s[-1])
    if c > 0:
        s += chr(c - 1)
    s += "".join(["\u7FFF" for _ in range(10)])
    return s


def download_dir(bucket: str | object, s3_folder, dest_dir=None):
    """
    From: https://stackoverflow.com/questions/49772151/download-a-folder-from-s3-using-boto3
    Download the contents of a folder directory
    Args:
        bucket_name: the name of the s3 bucket
        s3_folder: the folder path in the s3 bucket
        dest_dir: a relative or absolute directory path in the local file system
    """
    if isinstance(bucket, str):
        s3 = boto3.resource("s3")
        bucket = s3.Bucket(bucket)
    if dest_dir is not None:
        dest_dir = os.path.expanduser(dest_dir)
    s3 = boto3.resource("s3")
    print(f"Downloading {s3_folder} to {dest_dir}", flush=True)
    for obj in bucket.objects.filter(Prefix=s3_folder):
        target = (
            obj.key
            if dest_dir is None
            else os.path.join(dest_dir, os.path.relpath(obj.key, s3_folder))
        )
        if not os.path.exists(os.path.dirname(target)):
            os.makedirs(os.path.dirname(target))
        if obj.key[-1] == "/":
            continue
        bucket.download_file(obj.key, target)


@dataclass
class Company:
    time_path: str
    company: str
    already_exists: bool


def download_company(bucket_name: str, webdir: str, company: str, boto_client) -> list[Company]:
    company_path = os.path.join(webdir, company)
    os.makedirs(company_path, exist_ok=True)

    prefix = f"/websites/{company}/"
    result = boto_client.list_objects(Bucket=bucket_name, Prefix=prefix, Delimiter="/")
    print("result=", result)
    times = []
    for o in result.get("CommonPrefixes"):
        print("sub folder : ", o.get("Prefix"), o)
        name = o.get("Prefix").replace(prefix, "").strip("/")
        times.append(name)
    print("Times", times)
    exists = []
    downloaded: list[Company] = []
    for t in times:
        time_path = os.path.join(company_path, t)

        if not os.path.exists(time_path):
            print(f"Downloading {company}_{t} to {time_path}", flush=True)
            download_dir(bucket_name, f"/websites/{company}/{t}", time_path)
            company = Company(time_path, company, False)
        else:
            print(f"Skipping download of {company}_{t} as it exists at '{time_path}'", flush=True)
            exists.append(t)
            company = Company(time_path, company, True)
        downloaded.append(company)
    print(f"    {company} {exists}", flush=True)
    return downloaded


def download_all(bucket_name: str, prefix: str, webdir: str) -> list[str]:
    client = boto3.client("s3")
    company_names = []
    # Make sure you provide / in the end
    result = client.list_objects(Bucket=bucket_name, Prefix=prefix, Delimiter="/")
    for o in result.get("CommonPrefixes"):
        # print("sub folder : ", o.get("Prefix"), o)
        name = o.get("Prefix").replace(prefix, "").strip("/")
        company_names.append(name)
    print(f"Download companies={company_names}", flush=True)
    companies: list[Company] = []
    for company_name in company_names:
        try:
            companies.extend(
                download_company(bucket_name, webdir, company_name, boto_client=client)
            )
        except Exception as e:
            print(f"Error downloading company={company_name}", e, flush=True)
    return companies
