import mongoose from 'mongoose';

const getBucket = (bucketName = 'articleImages') => {
  const connection = mongoose.connection;

  if (!connection || !connection.db) {
    throw new Error('MongoDB connection is not ready for GridFS');
  }

  return new mongoose.mongo.GridFSBucket(connection.db, {
    bucketName: bucketName
  });
};

const getFileStream = (fileId, bucketName = 'articleImages') => {
  if (!fileId) {
    throw new Error('File ID is required');
  }

  try {
    const bucketInstance = getBucket(bucketName);
    const stream = bucketInstance.openDownloadStream(new mongoose.Types.ObjectId(fileId));
    return stream;
  } catch (error) {
    console.error('❌ Error creating file stream:', error);
    throw error;
  }
};

const deleteFile = async (fileId, bucketName = 'articleImages') => {
  if (!fileId) {
    return;
  }

  try {
    const bucketInstance = getBucket(bucketName);
    await bucketInstance.delete(new mongoose.Types.ObjectId(fileId));
    console.log(`✅ File deleted: ${fileId}`);
  } catch (error) {
    // File might not exist, which is okay
    if (error.code !== 'ENOENT') {
      console.error('❌ Error deleting file:', error);
      throw error;
    }
  }
};

export { deleteFile, getBucket, getFileStream };

