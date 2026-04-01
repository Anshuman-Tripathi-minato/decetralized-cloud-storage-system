import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { File, Download, Trash2, Lock, Unlock, Loader2, AlertCircle, FileText, Image, Video, Music, Archive, HardDrive } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { listFiles, getFileMetadata, retrieveFileChunks, deleteFile } from '../../utils/api';
import { importAESKey, decryptFile, downloadFile as downloadDecryptedFile, formatBytes } from '../../utils/fileEncryption';
import { formatUtcDate } from '../../utils/time';

export default function FilesPage() {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingCID, setDownloadingCID] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await listFiles();
      setFiles(response.files || []);
    } catch (err) {
      setError(`Failed to load files: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (file) => {
    try {
      setDownloadingCID(file.cid);
      setDownloadProgress(0);
      setError('');

      // Get file metadata (includes encryption key and IV)
      const metadata = await getFileMetadata(file.cid);
      
      // Retrieve all chunks
      const chunksResponse = await retrieveFileChunks(file.cid);
      const chunks = chunksResponse.chunks || [];
      
      // Sort chunks by index
      chunks.sort((a, b) => a.chunk_index - b.chunk_index);

      setDownloadProgress(50);

      // Convert chunk data from base64 to ArrayBuffer
      const chunkData = chunks.map(chunk => ({
        data: base64ToArrayBuffer(chunk.data),
      }));

      // Import encryption key
      const aesKey = await importAESKey(metadata.encryption_key);

      setDownloadProgress(75);

      // Decrypt file
      const decryptedData = await decryptFile(chunkData, aesKey, metadata.iv);

      setDownloadProgress(90);

      // Download file
      downloadDecryptedFile(decryptedData, file.filename, file.mime_type);

      setDownloadProgress(100);
      setTimeout(() => {
        setDownloadingCID(null);
        setDownloadProgress(0);
      }, 1000);

    } catch (err) {
      console.error('Download error:', err);
      setError(`Download failed: ${err.message}`);
      setDownloadingCID(null);
      setDownloadProgress(0);
    }
  };

  const handleDelete = async (cid) => {
    if (!confirm('Are you sure you want to delete this file? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteFile(cid);
      setFiles(files.filter(f => f.cid !== cid));
    } catch (err) {
      setError(`Delete failed: ${err.message}`);
    }
  };

  const getFileIcon = (mimeType) => {
    if (!mimeType) return <FileText size={20} />;
    
    if (mimeType.startsWith('image/')) return <Image size={20} className="text-purple-400" />;
    if (mimeType.startsWith('video/')) return <Video size={20} className="text-red-400" />;
    if (mimeType.startsWith('audio/')) return <Music size={20} className="text-green-400" />;
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return <Archive size={20} className="text-yellow-400" />;
    
    return <FileText size={20} className="text-blue-400" />;
  };

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black mb-2">
              My <span className="gradient-text">Files</span>
            </h1>
            <p className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
              Encrypted files stored on the decentralized network
            </p>
          </div>
          <button
            onClick={() => navigate('/app/upload')}
            className="btn-primary px-6 py-3 rounded-2xl font-semibold inline-flex items-center gap-2">
            <Lock size={18} />
            Upload File
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Files List */}
        {loading ? (
          <div className={`rounded-3xl p-16 text-center ${isDark ? 'glass' : 'glass-light shadow-xl'}`}>
            <Loader2 size={48} className="animate-spin mx-auto mb-4 text-purple-500" />
            <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
              Loading your files...
            </p>
          </div>
        ) : files.length === 0 ? (
          <div className={`rounded-3xl p-16 text-center ${isDark ? 'glass' : 'glass-light shadow-xl'}`}>
            <File size={64} className="mx-auto mb-4 opacity-20" />
            <h3 className="text-xl font-bold mb-2">No files uploaded yet</h3>
            <p className={`text-sm mb-6 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
              Upload your first encrypted file to the network
            </p>
            <button
              onClick={() => navigate('/app/upload')}
              className="btn-primary px-6 py-3 rounded-2xl font-semibold inline-flex items-center gap-2">
              <Lock size={18} />
              Upload File
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {files.map((file) => (
              <div
                key={file.cid}
                className={`rounded-2xl p-6 transition-all ${
                  isDark ? 'glass hover:bg-white/5' : 'glass-light shadow hover:shadow-lg'
                }`}>
                
                <div className="flex items-center gap-4">
                  
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    isDark ? 'bg-white/10' : 'bg-gray-100'
                  }`}>
                    {getFileIcon(file.mime_type)}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold mb-1 truncate">{file.filename}</h3>
                    <div className="flex items-center gap-4 text-xs">
                      <span className={`flex items-center gap-1 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                        <HardDrive size={12} />
                        {formatBytes(file.size)}
                      </span>
                      <span className={`flex items-center gap-1 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                        <Lock size={12} />
                        Encrypted
                      </span>
                      <span className={isDark ? 'text-white/40' : 'text-gray-400'}>
                        {formatUtcDate(file.uploaded_at)} UTC
                      </span>
                      <span className={`font-mono ${isDark ? 'text-white/30' : 'text-gray-300'}`}>
                        {file.total_chunks} chunks
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {downloadingCID === file.cid ? (
                      <div className="flex items-center gap-3 px-4">
                        <Loader2 size={18} className="animate-spin text-indigo-500" />
                        <span className="text-sm font-mono">{downloadProgress}%</span>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => handleDownload(file)}
                          className={`p-3 rounded-xl transition-all ${
                            isDark 
                              ? 'bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400' 
                              : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-600'
                          }`}
                          title="Download & Decrypt">
                          <Download size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(file.cid)}
                          className={`p-3 rounded-xl transition-all ${
                            isDark 
                              ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400' 
                              : 'bg-red-100 hover:bg-red-200 text-red-600'
                          }`}
                          title="Delete">
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                  </div>

                </div>

                {/* CID */}
                <div className={`mt-4 pt-4 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                      CID:
                    </span>
                    <code className={`text-xs font-mono ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                      {file.cid}
                    </code>
                  </div>

                  <div className="mt-3">
                    <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                      Stored On Nodes:
                    </span>
                    {Array.isArray(file.storage_nodes) && file.storage_nodes.length > 0 ? (
                      <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                        {file.storage_nodes.map((node) => (
                          <div
                            key={`${file.cid}-${node.node_id}`}
                            className={`px-3 py-2 rounded-lg text-xs flex items-center justify-between gap-2 ${
                              isDark ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-200'
                            }`}
                          >
                            <span className="font-mono truncate">{node.node_id || 'Unknown Node'}</span>
                            <span className={isDark ? 'text-white/60' : 'text-gray-500'}>{node.ip_address || 'N/A'}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className={`mt-1 text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                        Node mapping not available yet.
                      </p>
                    )}
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

// Helper function
function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
