import type {
	GetObjectCommandOutput,
	ObjectCannedACL,
	PutObjectCommandInput,
	S3ClientConfigType,
} from '@aws-sdk/client-s3';
import {
	DeleteObjectsCommand,
	GetObjectCommand,
	PutObjectCommand,
	S3Client,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AbstractFileService, IFileService } from '@medusajs/medusa';
import {
	DeleteFileType,
	FileServiceUploadResult,
	GetUploadedFileType,
	Logger,
	UploadStreamDescriptorType,
} from '@medusajs/types';
import fs from 'fs';
import { parse } from 'path';
import stream from 'stream';

class S3Service extends AbstractFileService implements IFileService {
	protected prefix_: string;
	protected bucket_: string;
	protected s3Url_: string;
	protected accessKeyId_: string;
	protected secretAccessKey_: string;
	protected region_: string;
	protected awsConfigObject_: any;
	protected downloadFileDuration_: number;
	protected cacheControl_: string;
	protected logger_: Logger;
	protected client_: S3Client;

	constructor({ logger }, options) {
		super(arguments[0], options);

		this.prefix_ = process.env.S3_PREFIX ? `${process.env.S3_PREFIX}/` : '';
		this.bucket_ = process.env.S3_BUCKET;
		this.s3Url_ = process.env.S3_URL;
		this.accessKeyId_ = process.env.S3_ACCESS_KEY_ID;
		this.secretAccessKey_ = process.env.S3_SECRET_ACCESS_KEY;
		this.region_ = process.env.S3_REGION;
		this.downloadFileDuration_ = parseInt(
			process.env.S3_DOWNLOAD_FILE_DURATION
		);
		this.awsConfigObject_ = {};
		this.cacheControl_ = process.env.S3_CACHE_CONTROL ?? 'max-age=31536000';
		this.logger_ = logger;
		this.client_ = this.getClient();
	}

	protected getClient(overwriteConfig: Partial<S3ClientConfigType> = {}) {
		const config: S3ClientConfigType = {
			credentials: {
				accessKeyId: this.accessKeyId_,
				secretAccessKey: this.secretAccessKey_,
			},
			region: this.region_,
			...this.awsConfigObject_,
			signatureVersion: 'v4',
			...overwriteConfig,
		};

		return new S3Client(config);
	}

	async upload(file: Express.Multer.File): Promise<FileServiceUploadResult> {
		return await this.uploadFile(file);
	}

	async uploadFile(
		file: Express.Multer.File,
		options: { isProtected?: boolean; acl?: string } = {
			isProtected: false,
			acl: undefined,
		}
	) {
		const parsedFilename = parse(file.originalname);
		this.prefix_ = file.destination ? `${file.destination}/` : '';

		const currentTime = this.formatDateTime();
		const fileKey = `${this.prefix_}${parsedFilename.name}-${currentTime}${parsedFilename.ext}`;

		const command = new PutObjectCommand({
			ACL:
				(options.acl as ObjectCannedACL) ??
				((options.isProtected ? 'private' : 'public-read') as ObjectCannedACL),
			Bucket: this.bucket_,
			Body: fs.createReadStream(file.path),
			Key: fileKey,
			ContentType: file.mimetype,
			CacheControl: this.cacheControl_,
		});

		try {
			await this.client_.send(command);
			return {
				url: `${this.s3Url_}/${fileKey}`,
				key: fileKey,
			};
		} catch (e) {
			this.logger_.error(e);
			throw e;
		}
	}

	async uploadProtected(file: Express.Multer.File) {
		return await this.uploadFile(file, { acl: 'private' });
	}

	async delete(file: DeleteFileType): Promise<void> {
		const fileKeys = file.fileKey.split(',');

		const objectsDelete = fileKeys.map((key) => {
			return {
				Key: key,
			};
		});
		const command = new DeleteObjectsCommand({
			Bucket: this.bucket_,
			Delete: {
				Objects: objectsDelete,
			},
		});

		try {
			await this.client_.send(command);
		} catch (e) {
			this.logger_.error(e);
		}
	}

	async getUploadStreamDescriptor(fileData: UploadStreamDescriptorType) {
		const pass = new stream.PassThrough();

		const isPrivate = fileData.isPrivate ?? true; // default to private

		const fileKey = `${this.prefix_}${fileData.name}.${fileData.ext}`;
		const params: PutObjectCommandInput = {
			ACL: isPrivate ? 'private' : 'public-read',
			Bucket: this.bucket_,
			Body: pass,
			Key: fileKey,
			ContentType: fileData.contentType as string,
		};

		const uploadJob = new Upload({
			client: this.client_,
			params,
		});

		return {
			writeStream: pass,
			promise: uploadJob.done(),
			url: `${this.s3Url_}/${fileKey}`,
			fileKey,
		};
	}

	async getDownloadStream(
		fileData: GetUploadedFileType
	): Promise<NodeJS.ReadableStream> {
		const command = new GetObjectCommand({
			Bucket: this.bucket_,
			Key: `${fileData.fileKey}`,
		});

		const response: GetObjectCommandOutput = await this.client_.send(command);

		return response.Body as NodeJS.ReadableStream;
	}

	async getPresignedDownloadUrl(
		fileData: GetUploadedFileType
	): Promise<string> {
		const command = new GetObjectCommand({
			Bucket: this.bucket_,
			Key: `${fileData.fileKey}`,
		});

		return await getSignedUrl(this.client_, command, {
			expiresIn: this.downloadFileDuration_,
		});
	}

	formatDateTime() {
		const now = new Date(); // Tạo đối tượng Date hiện tại

		const hours = String(now.getHours()).padStart(2, '0'); // Giờ (HH)
		const minutes = String(now.getMinutes()).padStart(2, '0'); // Phút (mm)
		const seconds = String(now.getSeconds()).padStart(2, '0'); // Giây (ss)

		const day = String(now.getDate()).padStart(2, '0'); // Ngày (dd)
		const month = String(now.getMonth() + 1).padStart(2, '0'); // Tháng (mm), chú ý getMonth() từ 0-11
		const year = now.getFullYear(); // Năm (YYYY)
		return `${hours}${minutes}${seconds}_${day}${month}${year}`;
	}
}

export default S3Service;
