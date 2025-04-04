import React, { useState } from "react";
import { useDropzone } from "react-dropzone";

const UploadModal = ({ onUploadComplete }) => {
  const [error, setError] = useState("");

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "application/pdf": [".pdf"],
    },
    maxSize: 30 * 1024 * 1024, // 30MB
    multiple: false,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        handleUpload(file);
      }
    },
    onDropRejected: (fileRejections) => {
      const rejection = fileRejections[0];
      if (rejection.errors[0].code === "file-too-large") {
        setError("File is too large. Maximum size is 30MB.");
      } else {
        setError("Please upload a PDF file.");
      }
    },
  });

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 MB";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const handleUpload = (file) => {
    try {
      const uploadData = {
        file: file,
        name: file.name,
        size: file.size,
        uploadDate: new Date().toISOString(),
        status: "Uploaded",
      };

      onUploadComplete(uploadData);
      setError("");
    } catch (error) {
      setError("Upload failed. Please try again.");
    }
  };

  return (
    <div>
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
          transition-colors duration-300 ease-in-out
          ${
            isDragActive
              ? "border-[#ff6464] bg-red-50"
              : "border-gray-300 hover:border-[#ff6464] hover:bg-red-50"
          }
        `}
      >
        <input {...getInputProps()} />
        <div className="mb-3">
          <svg
            className={`mx-auto h-8 w-8 ${
              isDragActive ? "text-red-400" : "text-gray-400"
            }`}
            stroke="currentColor"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path d="M3 12h18M12 3v18" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <p className="text-gray-600 mb-1">
          Drag & drop PDF file here, or click to select
        </p>
        <p className="text-gray-400 text-sm">PDF files only (max 30MB)</p>
      </div>
      {error && <div className="mt-2 text-red-500 text-sm">{error}</div>}
    </div>
  );
};

export default UploadModal;
