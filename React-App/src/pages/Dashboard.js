import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "components/layout/Navbar/Navbar";
import UploadModal from "components/UploadModal";

function Dashboard() {
  const [documents, setDocuments] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);

  const handleSubmitClick = (doc) => {
    setSelectedDocument(doc);
    setShowSubmitModal(true);
  };

  const handleSubmitDocument = (submissionId) => {
    const submission = availableSubmissions.find((s) => s.id === submissionId);

    const updatedDocuments = documents.map((doc) => {
      if (doc.id === selectedDocument.id) {
        return {
          ...doc,
          status: "Submitted",
          submissionType: submission.name,
          submissionId: submission.id,
          submissionDate: new Date().toISOString(),
        };
      }
      return doc;
    });

    setDocuments(updatedDocuments);
    localStorage.setItem("studentDocuments", JSON.stringify(updatedDocuments));

    // Store submitted documents separately
    const submittedDocs = JSON.parse(
      localStorage.getItem("submittedDocuments") || "[]"
    );
    submittedDocs.push({
      ...selectedDocument,
      status: "Submitted",
      submissionType: submission.name,
      submissionId: submission.id,
      submissionDate: new Date().toISOString(),
    });
    localStorage.setItem("submittedDocuments", JSON.stringify(submittedDocs));

    setShowSubmitModal(false);
    setSelectedDocument(null);
  };

  // Mock data for available submissions - this would come from API/backend
  const availableSubmissions = [
    {
      id: "1",
      name: "SRS Document - SWE301",
      deadline: "2024-02-01",
      description: "Software Requirements Specification Document",
    },
    {
      id: "2",
      name: "SDD Document - SWE301",
      deadline: "2024-02-15",
      description: "Software Design Document",
    },
  ];

  const navigate = useNavigate();

  useEffect(() => {
    const savedDocuments = localStorage.getItem("studentDocuments");
    if (savedDocuments) {
      setDocuments(JSON.parse(savedDocuments));
    }
  }, []);

  const handleStudentUpload = (uploadData) => {
    const newDocument = {
      id: Date.now(),
      name: uploadData.name,
      submissionType: null,
      date: new Date().toLocaleDateString(),
      size: formatFileSize(uploadData.size),
      status: "Uploaded",
      grade: null,
      feedback: null,
    };

    const updatedDocuments = [newDocument, ...documents];
    setDocuments(updatedDocuments);
    localStorage.setItem("studentDocuments", JSON.stringify(updatedDocuments));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 MB";
    const MB = bytes / (1024 * 1024);
    return MB.toFixed(2) + " MB";
  };

  const handleDeleteClick = (doc) => {
    setDocumentToDelete(doc);
    setShowDeleteModal(true);
  };

  const handleDeleteDocument = () => {
    const updatedDocs = documents.filter(
      (doc) => doc.id !== documentToDelete.id
    );
    setDocuments(updatedDocs);
    localStorage.setItem("studentDocuments", JSON.stringify(updatedDocs));
    setShowDeleteModal(false);
    setDocumentToDelete(null);
  };

  const getUpcomingDeadlines = () => {
    const today = new Date();
    return availableSubmissions
      .filter((submission) => new Date(submission.deadline) > today)
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  };

  const SubmissionModal = ({
    isOpen,
    onClose,
    document,
    availableSubmissions,
    onSubmit,
  }) => {
    const [selectedSubmission, setSelectedSubmission] = useState("");

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg max-w-md w-full m-4">
          <h2 className="text-xl font-semibold mb-4">Submit Document</h2>
          <p className="mb-4 text-gray-600">
            Select a submission slot for "{document?.name}"
          </p>

          <select
            value={selectedSubmission}
            onChange={(e) => setSelectedSubmission(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 mb-6"
          >
            <option value="" disabled hidden>
              Select submission type
            </option>
            {availableSubmissions.map((submission) => (
              <option
                key={submission.id}
                value={submission.id}
                className="text-gray-900"
              >
                {submission.name} - Due:{" "}
                {new Date(submission.deadline).toLocaleDateString()}
              </option>
            ))}
          </select>

          <div className="flex justify-end space-x-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors duration-300"
            >
              Cancel
            </button>
            <button
              onClick={() => onSubmit(selectedSubmission)}
              disabled={!selectedSubmission}
              className="px-4 py-2 bg-[#ff6464] text-white rounded-md hover:bg-[#ff4444] transition-colors duration-300 disabled:hover:bg-[#ff6464] disabled:opacity-50"
            >
              Submit
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="max-w-6xl mx-auto mt-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-800">
            Student Dashboard
          </h1>
          <p className="text-gray-500">
            {documents.length} documents submitted
          </p>
        </div>

        <div className="grid grid-cols-3 gap-6 mb-8">
          {/* Upload Card */}
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <h2 className="text-lg font-semibold mb-4">Upload Document</h2>
            <UploadModal onUploadComplete={handleStudentUpload} />
          </div>

          {/* Upcoming Deadlines Card */}
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <h2 className="text-lg font-semibold mb-4">Upcoming Deadlines</h2>
            <div className="space-y-3">
              {getUpcomingDeadlines().map((submission) => (
                <div key={submission.id} className="border-b pb-2">
                  <p className="font-medium text-gray-800">{submission.name}</p>
                  <p className="text-sm text-gray-500">
                    Due: {new Date(submission.deadline).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats Card */}
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <h2 className="text-lg font-semibold mb-4">Overview</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Uploaded Documents</p>
                <p className="text-2xl font-semibold text-[#ff6464]">
                  {documents.length}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Submitted Documents</p>
                <p className="text-2xl font-semibold text-[#ff6464]">
                  {documents.filter((doc) => doc.status === "Submitted").length}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Graded Documents</p>
                <p className="text-2xl font-semibold text-[#ff6464]">
                  {documents.filter((doc) => doc.grade !== null).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Documents Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="grid grid-cols-7 gap-4 px-4 py-3 bg-gray-50 text-sm font-medium text-gray-500">
            <div>DOCUMENT NAME</div>
            <div>SUBMISSION TYPE</div>
            <div>SUBMITTED DATE</div>
            <div>SIZE</div>
            <div>STATUS</div>
            <div>GRADE</div>
            <div>ACTIONS</div>
          </div>

          {documents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No documents submitted yet
            </div>
          ) : (
            documents.map((doc) => (
              <div
                key={doc.id}
                className="grid grid-cols-7 gap-4 px-4 py-3 border-b text-sm text-gray-600 hover:bg-gray-100 hover:cursor-pointer transition-colors duration-300"
              >
                <div className="overflow-hidden">
                  <span className="truncate block" title={doc.name}>
                    {doc.name}
                  </span>
                </div>
                <div>{doc.submissionType || "Not submitted"}</div>
                <div>{doc.date}</div>
                <div>{doc.size}</div>
                <div>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      doc.status === "Graded"
                        ? "bg-green-100 text-green-800"
                        : doc.status === "Submitted"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {doc.status}
                  </span>
                </div>
                <div>{doc.grade ? `${doc.grade}%` : "-"}</div>
                <div className="flex items-center space-x-2">
                  {!doc.submissionType && (
                    <button
                      onClick={() => handleSubmitClick(doc)}
                      className="px-3 py-1 text-sm text-white bg-[#ff6464] rounded-md hover:bg-[#ff4444] transition-colors duration-300"
                    >
                      Submit
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteClick(doc)}
                    className="text-gray-400 hover:text-red-500 transition-colors duration-300"
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
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-md w-full m-4">
              <h2 className="text-xl font-semibold mb-4">Confirm Deletion</h2>
              <p className="mb-6 text-gray-600">
                Are you sure you want to delete "{documentToDelete?.name}"? This
                action cannot be undone.
              </p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteDocument}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {showSubmitModal && (
          <SubmissionModal
            isOpen={showSubmitModal}
            onClose={() => setShowSubmitModal(false)}
            document={selectedDocument}
            availableSubmissions={availableSubmissions}
            onSubmit={handleSubmitDocument}
          />
        )}
      </div>
    </div>
  );
}

export default Dashboard;
