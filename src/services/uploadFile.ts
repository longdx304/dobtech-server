import { S3Client, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { TDeleteFile } from "src/types/uploads";

const AWS_REGION = process.env.S3_REGION;
const AWS_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY;
const S3_BUCKET = process.env.S3_BUCKET;

class UploadFileService {
  async deleteFile(fileKey: TDeleteFile) {
    const s3Client = new S3Client({
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
      },
    });
    try {
      if (!fileKey.fileKey) {
        throw new Error("fileKey is required");
      }
      const fileKeys =
        typeof fileKey.fileKey === "string"
          ? [fileKey.fileKey]
          : fileKey.fileKey;
      const objectsDelete = fileKeys.map((key) => {
        return {
          Key: key,
        };
      });
      const deleteObjectsCommand = new DeleteObjectsCommand({
        Bucket: S3_BUCKET,
        Delete: {
          Objects: objectsDelete,
        },
      });
      await s3Client.send(deleteObjectsCommand);
    } catch (error) {
      console.error("Error deleting file:", error);
      throw error;
    }
  }
}
export default UploadFileService;
