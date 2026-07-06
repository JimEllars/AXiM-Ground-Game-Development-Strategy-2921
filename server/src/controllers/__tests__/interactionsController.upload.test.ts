import { jest } from '@jest/globals';
import { Request, Response } from 'express';
import { AuthRequest } from '../../types/index.js';

const mockSend = jest.fn();
jest.unstable_mockModule('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: mockSend
  })),
  PutObjectCommand: jest.fn().mockImplementation((args) => args)
}));

jest.unstable_mockModule('uuid', () => ({
  v4: jest.fn().mockReturnValue('test-uuid')
}));

describe('Interactions Controller - uploadAudio', () => {
  let uploadAudio: any;
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Dynamically import after mocking
    const module = await import('../interactionsController.js');
    uploadAudio = module.uploadAudio;

    mockRequest = {
      user: { id: 'user-123' } as any,
      file: {
        buffer: Buffer.from('test audio content'),
        mimetype: 'audio/webm',
        fieldname: 'audio',
        originalname: 'test.webm',
        encoding: '7bit',
        size: 1024,
      } as Express.Multer.File,
    };

    mockResponse = {
      status: jest.fn().mockReturnThis() as any,
      json: jest.fn() as any,
    };
  });

  it('should return 400 if no file is provided', async () => {
    mockRequest.file = undefined;
    await uploadAudio(mockRequest as AuthRequest, mockResponse as Response, jest.fn());

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'No audio file provided.' });
  });

  it('should upload audio and return 201 with objectKey', async () => {
    mockSend.mockResolvedValueOnce({} as never);

    await uploadAudio(mockRequest as AuthRequest, mockResponse as Response, jest.fn());

    expect(mockSend).toHaveBeenCalled();
    const commandArg = mockSend.mock.calls[0][0];
    expect((commandArg as any).Key).toBe('audio/user-123/test-uuid.webm');

    expect(mockResponse.status).toHaveBeenCalledWith(201);
    expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Audio uploaded successfully',
      objectKey: 'audio/user-123/test-uuid.webm'
    }));
  });
});
