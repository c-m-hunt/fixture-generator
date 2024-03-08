import path from "path";
import { Upload } from "@aws-sdk/lib-storage";
import { S3 } from "@aws-sdk/client-s3";
import fs from "fs";

const s3 = new S3();

export const uploadFileToS3 = async (
  fileName: string,
  bucketName: string,
  key: string
) => {
  const fileContent = fs.readFileSync(fileName);

  const params = {
    Bucket: bucketName,
    Key: key,
    Body: fileContent,
  };

  await new Upload({
    client: s3,
    params,
  }).done();
};
