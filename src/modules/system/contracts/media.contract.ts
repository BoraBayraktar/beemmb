export type UploadProductImageInput = {
  bytes: Buffer;
  fileName: string;
  contentType: string;
  productSlug?: string;
};

export type UploadProductImageResult = {
  bucket: string;
  objectKey: string;
  contentType: string;
  size: number;
  url: string;
};

export type UploadCariPhotoInput = {
  bytes: Buffer;
  fileName: string;
  contentType: string;
  cariSlug?: string;
};

export type UploadCariPhotoResult = {
  bucket: string;
  objectKey: string;
  contentType: string;
  size: number;
  url: string;
};

export type UploadExpenseReceiptInput = {
  bytes: Buffer;
  fileName: string;
  contentType: string;
  tenantId: string;
};

export type UploadExpenseReceiptResult = {
  bucket: string;
  objectKey: string;
  contentType: string;
  size: number;
  url: string;
};
