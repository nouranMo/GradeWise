import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import Navbar from "components/layout/Navbar/Navbar";

const DeleteConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  documentName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-md w-full m-4">
        <h2 className="text-xl font-semibold mb-4">Confirm Deletion</h2>
        <p className="mb-6 text-gray-600">
          Are you sure you want to delete "{documentName}"? This action cannot
          be undone.
        </p>
        <div className="flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

function Dashboard() {
  const [analyzedDocuments, setAnalyzedDocuments] = useState([]);
  const [selectedAnalyses, setSelectedAnalyses] = useState({
    SrsValidation: false,
    ReferencesValidation: false,
    ContentAnalysis: false,
    ImageAnalysis: false,
    BusinessValueAnalysis: false,
    DiagramConvention: false,
    SpellCheck: false,
    FullAnalysis: false,
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const savedDocuments = localStorage.getItem("analyzedDocuments");
    if (savedDocuments) {
      setAnalyzedDocuments(JSON.parse(savedDocuments));
    }
  }, []);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 MB";
    const MB = bytes / (1024 * 1024); // Convert bytes to MB
    return MB.toFixed(2) + " MB"; // Show 2 decimal places
  };

  const onDrop = async (acceptedFiles) => {
    const date = new Date();
    const formattedDate = date
      .toLocaleDateString("en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      .replace(/(\d+) ([A-Za-z]+), (\d+)/, "$1, $2, $3");

    // Create new documents without checking for duplicates
    const newDocuments = acceptedFiles.map((file) => ({
      id: Date.now() + Math.random(),
      name: file.name,
      date: formattedDate,
      size: formatFileSize(file.size),
      status: "Pending Analysis",
      analyzed: false,
      file: file,
      analysisProgress: 0,
    }));

    const updatedDocuments = [...newDocuments, ...analyzedDocuments];
    setAnalyzedDocuments(updatedDocuments);
    localStorage.setItem("analyzedDocuments", JSON.stringify(updatedDocuments));

    // If files are dropped, show the analysis modal
    if (newDocuments.length > 0) {
      setSelectedDocument(newDocuments[0]);
      setShowAnalysisModal(true);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    maxSize: 30 * 1024 * 1024, // 30MB
    multiple: true, // Enable multiple file selection
  });

  const handleDeleteClick = (doc) => {
    setDocumentToDelete(doc);
    setShowDeleteModal(true);
  };

  const handleDeleteDocument = () => {
    const updatedDocs = analyzedDocuments.filter(
      (doc) => doc.id !== documentToDelete.id
    );
    setAnalyzedDocuments(updatedDocs);
    localStorage.setItem("analyzedDocuments", JSON.stringify(updatedDocs));
    setShowDeleteModal(false);
    setDocumentToDelete(null);
  };

  const handleDocumentClick = (document) => {
    if (document.analyzed) {
      navigate("/parsing-result", {
        state: { parsingResult: document.results },
      });
    }
  };

  const handleFullAnalysisChange = (checked) => {
    setSelectedAnalyses((prev) => {
      const newState = { ...prev };
      // Set all analyses to the checked value
      Object.keys(newState).forEach((key) => {
        newState[key] = checked;
      });
      return newState;
    });
  };

  const handleIndividualAnalysisChange = (key) => {
    setSelectedAnalyses((prev) => {
      const newState = {
        ...prev,
        [key]: !prev[key],
      };

      // Check if all individual analyses are selected after the change
      const allSelected = Object.entries(newState).every(
        ([k, v]) => k === "FullAnalysis" || v === true
      );

      // Update FullAnalysis based on whether all other options are selected
      newState.FullAnalysis = allSelected;
      return newState;
    });
  };

  const handleAnalyzeClick = (document) => {
    setSelectedDocument(document);
    setShowAnalysisModal(true);
  };

  const startAnalysis = async () => {
    if (!selectedDocument) return;

    setIsAnalyzing(true);
    setShowAnalysisModal(false);

    try {
      // Update initial progress
      const updatedDocuments = analyzedDocuments.map((doc) => {
        if (doc.id === selectedDocument.id) {
          return {
            ...doc,
            status: "Analyzing...",
            analyzed: false,
            analysisProgress: 0,
          };
        }
        return doc;
      });
      setAnalyzedDocuments(updatedDocuments);

      // Create a FormData object
      const formData = new FormData();
      formData.append("pdfFile", selectedDocument.file);
      formData.append("analyses", JSON.stringify(selectedAnalyses));

      // Send the request
      const response = await fetch("http://localhost:5000/analyze_document", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.status === "success") {
        // Update the document status and store results
        const updatedDocuments = analyzedDocuments.map((doc) => {
          if (doc.id === selectedDocument.id) {
            return {
              ...doc,
              status: "Analysis Complete",
              analyzed: true,
              results: result,
              analysisProgress: 100,
            };
          }
          return doc;
        });

        setAnalyzedDocuments(updatedDocuments);
        localStorage.setItem(
          "analyzedDocuments",
          JSON.stringify(updatedDocuments)
        );

        // Navigate to the results page
        navigate("/parsing-result", {
          state: { parsingResult: result },
        });
      } else {
        // Handle error
        const updatedDocuments = analyzedDocuments.map((doc) => {
          if (doc.id === selectedDocument.id) {
            return {
              ...doc,
              status: "Analysis Failed",
              analyzed: false,
              analysisProgress: 0,
            };
          }
          return doc;
        });

        setAnalyzedDocuments(updatedDocuments);
        localStorage.setItem(
          "analyzedDocuments",
          JSON.stringify(updatedDocuments)
        );
        alert("Analysis failed. Please try again.");
      }
    } catch (error) {
      console.error("Error during analysis:", error);
      alert("An error occurred during analysis. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReanalyze = (doc) => {
    setSelectedDocument(doc);
    setSelectedAnalyses({
      SrsValidation: true,
      ReferencesValidation: true,
      ContentAnalysis: true,
      ImageAnalysis: true,
      BusinessValueAnalysis: true,
      DiagramConvention: true,
      SpellCheck: true,
      FullAnalysis: true,
    });
    setShowAnalysisModal(true);
  };

  const handleViewResults = (doc) => {
    if (doc.results) {
      navigate("/parsing-result", {
        state: { parsingResult: doc.results },
      });
    } else {
      alert("No results available for this document.");
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="max-w-6xl mx-auto mt-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-800">
            Document Dashboard
          </h1>
          <p className="text-gray-500">
            {analyzedDocuments.length} documents total
          </p>
        </div>

        <hr className="border-t border-gray-200 mb-8" />

        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={`
            w-1/2 mx-auto border-2 border-dashed rounded-lg p-16 mb-8 text-center cursor-pointer
            transition-colors duration-300 ease-in-out
            ${
              isDragActive
                ? "border-[#ff6464] bg-red-50"
                : "border-gray-300 hover:border-[#ff6464] hover:bg-red-50"
            }
            ${isAnalyzing ? "pointer-events-none opacity-50" : ""}
          `}
        >
          <input {...getInputProps()} />
          <div className="mb-3">
            <svg
              className={`mx-auto h-12 w-12 ${
                isDragActive ? "text-red-400" : "text-gray-400"
              }`}
              stroke="currentColor"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                d="M3 12h18M12 3v18"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          {isAnalyzing ? (
            <div className="flex items-center justify-center space-x-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600" />
              <p className="text-red-600">Analyzing documents...</p>
            </div>
          ) : isDragActive ? (
            <>
              <p className="text-red-500 mb-1">Drop PDF files here</p>
              <p className="text-gray-400 text-sm">
                PDF files only (max 30MB each)
              </p>
            </>
          ) : (
            <>
              <p className="text-gray-600 mb-1">
                Drag & drop PDF files here, or click to select
              </p>
              <p className="text-gray-400 text-sm">
                PDF files only (max 30MB each)
              </p>
            </>
          )}
        </div>

        {/* Document List */}
        <div className="mb-10">
          <div className="flex gap-4 mb-4">
            <div className="relative">
              <select className="flex items-center space-x-2 border rounded-md px-3 py-1.5 pr-8 text-sm text-gray-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-gray-200 cursor-pointer">
                <option>All ({analyzedDocuments.length})</option>
                <option>Analyzed</option>
                <option>Pending</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500"></div>
            </div>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-5 gap-4 px-4 py-2 bg-gray-50 text-sm font-medium text-gray-500">
            <div>DOCUMENT NAME</div>
            <div>
              UPLOAD DATE
              <span className="text-[10px] ml-2 text-gray-400">
                (MMM DD, YYYY)
              </span>
            </div>
            <div>SIZE</div>
            <div>STATUS</div>
          </div>

          {/* Table Content */}
          {analyzedDocuments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No documents uploaded yet
            </div>
          ) : (
            analyzedDocuments.map((doc) => (
              <div
                key={doc.id}
                className="grid grid-cols-5 gap-4 px-4 py-3 border-b text-sm text-gray-600 hover:bg-gray-50"
                onClick={() => handleDocumentClick(doc)}
              >
                <div className="overflow-hidden">
                  <span className="truncate block" title={doc.name}>
                    {doc.name}
                  </span>
                </div>
                <div>{doc.date}</div>
                <div>{doc.size}</div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        doc.analyzed
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {doc.status}
                    </span>
                    {doc.analysisProgress > 0 && doc.analysisProgress < 100 && (
                      <div className="w-20 h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 transition-all duration-300"
                          style={{ width: `${doc.analysisProgress}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-16">
                  {!doc.analyzed && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAnalyzeClick(doc);
                      }}
                      className="px-3 py-1 text-sm text-white bg-[#ff6464] rounded-md hover:bg-[#ff4444] transition-colors duration-300 ease-in-out"
                    >
                      Analyze
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(doc);
                    }}
                    className="text-gray-400 hover:text-red-500 transition-colors duration-300 ease-in-out"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
          <DeleteConfirmationModal
            isOpen={showDeleteModal}
            onClose={() => setShowDeleteModal(false)}
            onConfirm={handleDeleteDocument}
            documentName={documentToDelete?.name}
          />
        </div>

        {/* Analysis Modal */}
        {showAnalysisModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-2xl w-full m-4">
              <h2 className="text-xl font-semibold mb-4">
                Select Analyses to Perform
              </h2>

              {/* Full Analysis Option */}
              <div className="mb-4">
                <label className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 bg-gray-50 hover:cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedAnalyses.FullAnalysis}
                    onChange={(e) => handleFullAnalysisChange(e.target.checked)}
                    className="w-4 h-4 text-[#FF4550] focus:ring-0 focus:ring-offset-0 focus:outline-none hover:cursor-pointer"
                  />
                  <span className="font-semibold">
                    Full Analysis (All Options)
                  </span>
                </label>
              </div>

              {/* Individual Analysis Options */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {Object.entries(selectedAnalyses).map(([key, value]) => {
                  if (key === "FullAnalysis") return null; // Skip Full Analysis in the grid
                  return (
                    <label
                      key={key}
                      className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 hover:cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={() => handleIndividualAnalysisChange(key)}
                        className="w-4 h-4 text-[#FF4550] focus:ring-0 focus:ring-offset-0 focus:outline-none hover:cursor-pointer"
                      />
                      <span>{key.replace(/([A-Z])/g, " $1").trim()}</span>
                    </label>
                  );
                })}
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setShowAnalysisModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={startAnalysis}
                  disabled={
                    !Object.values(selectedAnalyses).some((value) => value) ||
                    isAnalyzing
                  }
                  className={`px-4 py-2 bg-[#ff6464] text-white rounded-md transition-colors duration-300 ease-in-out ${
                    !Object.values(selectedAnalyses).some((value) => value) ||
                    isAnalyzing
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-[#ff4444]"
                  }`}
                >
                  {isAnalyzing ? "Analyzing..." : "Start Analysis"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
