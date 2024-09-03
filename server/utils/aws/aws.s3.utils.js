import AWS from "aws-sdk";
import { logger } from "../../logger.js";
import CustomError from "../../std/custom.error.js";
import { functionWrapper } from "../../std/wrappers.js";
import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

const fileName = "AWS S3 Utils";

const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_S3_ACCESS_KEY,
    secretAccessKey: process.env.AWS_S3_ACCESS_SECRET_KEY,
});

async function _uploadFile(
    { file, fileName, makeItPublic = false, ContentType = null },
    { txid, logg, funcName }
) {
    logg.info(`started`);

    const awsS3BucketName = process.env.AWS_S3_BUCKET_NAME;
    const params = {
        Bucket: awsS3BucketName,
        Key: fileName,
        Body: file,
    };

    if (ContentType) {
        params.ContentType = ContentType;
    }

    if (makeItPublic) {
        params.ACL = "public-read";
    }

    try {
        const uploadResult = await s3.upload(params).promise();
        logg.info(
            `File uploaded successfully. Location: ${uploadResult.Location}`
        );
        return [uploadResult.Location, null];
    } catch (error) {
        logg.error(`Error uploading file to S3: ${error.message}`);
        return [
            null,
            new CustomError(
                `Failed to upload file to S3: ${error.message}`,
                500
            ),
        ];
    }
}

export const uploadFile = functionWrapper(fileName, "uploadFile", _uploadFile);

async function _deleteFile({ fileName }, { txid, logg, funcName }) {
    logg.info(`started`);

    const params = {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: fileName,
    };

    try {
        await s3.deleteObject(params).promise();
        logg.info(`File deleted successfully: ${fileName}`);
        return [true, null];
    } catch (error) {
        logg.error(`Error deleting file from S3: ${error.message}`);
        return [
            null,
            new CustomError(
                `Failed to delete file from S3: ${error.message}`,
                500
            ),
        ];
    }
}

export const deleteFile = functionWrapper(fileName, "deleteFile", _deleteFile);
