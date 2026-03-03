import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Lock, FileUp, CheckCircle2, AlertCircle, Loader2, Shield, HardDrive } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import {
  generateAESKey,
  exportAESKey,
  encryptFile,
  formatBytes,
} from '../../utils/fileEncryption';
import { uploadFileMetadata, uploadChunk } from '../../utils/api';

export default function UploadPage() {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [step, setStep] = useState('select'); // select | encrypting | uploading | complete
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [uploadedCID, setUploadedCID] = useState('');
  const [encryptionProgress, setEncryptionProgress] = useState(0);
  const [chunkProgress, setChunkProgress] = useState({ current: 0, total: 0 });

  const handleFileSelect = (file) => {
    if (!file) return;
    
    // Validate file size (max 100MB for prototype)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('File too large. Maximum size is 100MB.');
      return;
    }

    setSelectedFile(file);
    setError('');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setStep('encrypting');
      setProgress(0);
      setError('');

      // Generate AES encryption key
      const aesKey = await generateAESKey();
      const keyB64 = await exportAESKey(aesKey);

      // Encrypt file and split into chunks
      const encryptedResult = await encryptFile(
        selectedFile,
        aesKey,
        (current, total) => {
          setEncryptionProgress(Math.round((current / total) * 100));
        }
      );

      const { cid, encryptedChunks, iv, metadata } = encryptedResult;

      setStep('uploading');
      setProgress(0);
      setChunkProgress({ current: 0, total: encryptedChunks.length });

      // Upload file metadata first
      await uploadFileMetadata(cid, metadata, keyB64, iv);

      // Upload chunks sequentially
      for (let i = 0; i < encryptedChunks.length; i++) {
        const chunk = encryptedChunks[i];
        
        await uploadChunk(
          chunk.chunk_id,
          chunk.index,
          chunk.data,
          cid,
          chunk.hash
        );

        setChunkProgress({ current: i + 1, total: encryptedChunks.length });
        setProgress(Math.round(((i + 1) / encryptedChunks.length) * 100));
      }

      // Success!
      setUploadedCID(cid);
      setStep('complete');

    } catch (err) {
      console.error('Upload error:', err);
      setError(`Upload failed: ${err.message}`);
      setStep('select');
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setStep('select');
    setProgress(0);
    setError('');
    setEncryptionProgress(0);
    setChunkProgress({ current: 0, total: 0 });
  };

  return (
    <div className="p-8">
      <div className="max-w-3xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black mb-2">
            Upload <span className="gradient-text">File</span>
          </h1>
          <p className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
            Securely encrypt and upload files to the decentralized network
          </p>
        </div>

        {/* Select Step */}
        {step === 'select' && (
          <div className={`rounded-3xl p-8 ${isDark ? 'glass' : 'glass-light shadow-xl'}`}>
            
            <input
              ref={fileInputRef}
              type="file"
              onChange={(e) => handleFileSelect(e.target.files[0])}
              className="hidden"
            />

            {!selectedFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className={`drop-zone p-16 rounded-2xl text-center cursor-pointer transition-all
                  ${isDark ? 'hover:border-indigo-500 hover:bg-indigo-500/5' : 'hover:border-indigo-400 hover:bg-indigo-50'}`}>
                <Upload size={64} className="mx-auto mb-4 opacity-40" />
                <h3 className="text-xl font-bold mb-2">Drop file here or click to browse</h3>
                <p className={`text-sm ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                  Maximum file size: 100MB
                </p>
                <p className={`text-xs mt-2 ${isDark ? 'text-white/30' : 'text-gray-300'}`}>
                  Files will be encrypted with AES-256-GCM before upload
                </p>
              </div>
            ) : (
              <>
                <div className={`p-6 rounded-2xl border-2 mb-6
                  ${isDark ? 'border-green-500/30 bg-green-500/5' : 'border-green-500/50 bg-green-50'}`}>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 size={24} className="text-green-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold mb-2">File Selected</h3>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className={`${isDark ? 'text-white/40' : 'text-gray-500'}`}>Name:</span>
                          <span className="ml-2 font-mono text-xs break-all">{selectedFile.name}</span>
                        </div>
                        <div>
                          <span className={`${isDark ? 'text-white/40' : 'text-gray-500'}`}>Size:</span>
                          <span className="ml-2 text-xs">{formatBytes(selectedFile.size)}</span>
                        </div>
                        <div>
                          <span className={`${isDark ? 'text-white/40' : 'text-gray-500'}`}>Type:</span>
                          <span className="ml-2 text-xs">{selectedFile.type || 'Unknown'}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedFile(null)}
                        className="mt-3 text-xs text-red-400 hover:text-red-300 font-medium">
                        Remove and select different file
                      </button>
                    </div>
                  </div>
                </div>

                <div className={`p-4 rounded-xl mb-6 ${isDark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'}`}>
                  <div className="flex items-start gap-2">
                    <Shield size={16} className="text-blue-400 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-1">
                      <p className={`${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                        <strong>Client-Side Encryption:</strong> Your file will be encrypted locally with AES-256-GCM before upload.
                      </p>
                      <p className={`${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                        <strong>Chunked Storage:</strong> Encrypted data will be split into 256KB chunks for distributed storage.
                      </p>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}

                <button
                  onClick={handleUpload}
                  className="btn-primary w-full py-4 rounded-2xl text-base font-bold inline-flex items-center justify-center gap-2">
                  <Lock size={20} />
                  Encrypt & Upload to Network
                </button>
              </>
            )}
          </div>
        )}

        {/* Encrypting Step */}
        {step === 'encrypting' && (
          <div className={`rounded-3xl p-10 ${isDark ? 'glass' : 'glass-light shadow-xl'}`}>
            <div className="text-center mb-6">
              <Loader2 size={48} className="animate-spin mx-auto mb-4 text-purple-500" />
              <h2 className="text-2xl font-bold mb-2">Encrypting File...</h2>
              <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                Applying AES-256-GCM encryption and splitting into chunks
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm mb-2">
                <span className={isDark ? 'text-white/60' : 'text-gray-600'}>Encryption Progress</span>
                <span className="font-mono">{encryptionProgress}%</span>
              </div>
              <div className={`h-3 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}>
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300"
                  style={{ width: `${encryptionProgress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Uploading Step */}
        {step === 'uploading' && (
          <div className={`rounded-3xl p-10 ${isDark ? 'glass' : 'glass-light shadow-xl'}`}>
            <div className="text-center mb-6">
              <FileUp size={48} className="mx-auto mb-4 text-indigo-500 animate-bounce" />
              <h2 className="text-2xl font-bold mb-2">Uploading to Network...</h2>
              <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                Distributing encrypted chunks across storage nodes
              </p>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className={isDark ? 'text-white/60' : 'text-gray-600'}>Upload Progress</span>
                <span className="font-mono">{progress}%</span>
              </div>
              <div className={`h-3 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}>
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
              <div className="flex items-center justify-between text-sm">
                <span className={isDark ? 'text-white/60' : 'text-gray-600'}>Chunks Uploaded</span>
                <span className="font-mono">{chunkProgress.current} / {chunkProgress.total}</span>
              </div>
            </div>
          </div>
        )}

        {/* Complete Step */}
        {step === 'complete' && (
          <div className={`rounded-3xl p-10 text-center ${isDark ? 'glass glow-accent' : 'glass-light shadow-xl'}`}>
            <CheckCircle2 size={64} className="mx-auto mb-6 text-green-400" />
            <h2 className="text-3xl font-black mb-3 gradient-text">Upload Successful!</h2>
            <p className={`text-base mb-6 ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
              Your file has been encrypted and distributed across the network.
            </p>

            <div className={`p-6 rounded-2xl mb-6 ${isDark ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-200'}`}>
              <div className="space-y-3 text-sm text-left">
                <div>
                  <span className={`${isDark ? 'text-white/40' : 'text-gray-500'}`}>Content ID (CID):</span>
                  <div className="mt-1 font-mono text-xs break-all p-2 rounded bg-black/20">
                    {uploadedCID}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <HardDrive size={16} className="opacity-60" />
                  <span className={isDark ? 'text-white/60' : 'text-gray-600'}>
                    Stored across {chunkProgress.total} encrypted chunks
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={resetUpload}
                className={`flex-1 py-3 rounded-2xl font-semibold transition-all
                  ${isDark ? 'bg-white/10 hover:bg-white/15' : 'bg-gray-200 hover:bg-gray-300'}`}>
                Upload Another
              </button>
              <button
                onClick={() => navigate('/app/files')}
                className="flex-1 btn-primary py-3 rounded-2xl font-semibold">
                View My Files
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
