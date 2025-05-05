import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "components/layout/Navbar/Navbar";
import UploadModal from "components/UploadModal";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function Dashboard() {
  const [documents, setDocuments] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [availableSubmissions, setAvailableSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [courses, setCourses] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedAssignment, setSelectedAssignment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    // Fetch student documents and available submissions from backend
    fetchStudentDocuments();
    fetchAvailableSubmissions();
    fetchUserData();
    fetchCourses();
  }, []);

  const fetchStudentDocuments = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No authentication token found");
        return;
      }

      const response = await fetch(
        "http://localhost:8080/api/student/documents",
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const documents = await response.json();
        console.log("Fetched student documents:", documents);
        setDocuments(documents);
      } else {
        console.error("Failed to fetch documents:", await response.text());
        toast.error("Failed to fetch your documents");
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast.error("Error connecting to server");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableSubmissions = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No authentication token found");
        toast.error("Authentication required. Please log in again.");
        navigate("/login");
        return;
      }

      const response = await fetch(
        "http://localhost:8080/api/submissions/available",
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const submissions = await response.json();
        console.log("Fetched available submissions:", submissions);

        if (submissions.length === 0) {
          toast.info("No available submission slots found for your courses");
        } else {
          toast.success(
            `Found ${submissions.length} available submission slots`
          );
        }

        setAvailableSubmissions(submissions);
      } else if (response.status === 403) {
        console.error("Permission denied when fetching available submissions");
        toast.error(
          "You don't have permission to access available submissions"
        );
      } else if (response.status === 401) {
        console.error("Authentication error");
        toast.error("Authentication required. Please log in again.");
        navigate("/login");
      } else {
        console.error(
          "Failed to fetch available submissions:",
          await response.text()
        );
        toast.error("Failed to load available submissions");
      }
    } catch (error) {
      console.error("Error fetching available submissions:", error);
      toast.error("Error connecting to server");
    }
  };

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:8080/api/users/me", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch user data");
      }

      const data = await response.json();
      setUserData(data);
    } catch (error) {
      console.error("Error fetching user data:", error);
      toast.error("Failed to load user data");
    }
  };

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:8080/api/courses", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch courses");
      }

      const data = await response.json();
      setCourses(data);
    } catch (error) {
      console.error("Error fetching courses:", error);
      toast.error("Failed to load courses");
    }
  };

  const handleSubmitClick = (doc) => {
    setSelectedDocument(doc);
    setShowSubmitModal(true);
  };

  const handleSubmitDocument = async (submissionId) => {
    try {
      const submission = availableSubmissions.find(
        (s) => s.id === submissionId
      );

      if (!submission) {
        toast.error("Selected submission slot not found");
        return;
      }

      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Not authenticated");
        return;
      }

      // Create submission data
      const submissionData = {
        documentId: selectedDocument.id,
        submissionSlotId: submissionId,
        submissionType: submission.name,
        course: submission.course,
      };

      console.log(
        "Submitting document:",
        selectedDocument.id,
        "to slot:",
        submissionId
      );

      // Submit document to backend
      const response = await fetch("http://localhost:8080/api/student/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Handle specific error cases
        if (response.status === 403) {
          if (errorData.error && errorData.error.includes("not enrolled")) {
            toast.error(
              "You are not enrolled in the course for this submission slot"
            );
          } else {
            toast.error("You don't have permission to submit to this slot");
          }
        } else {
          throw new Error(errorData.error || "Submission failed");
        }
        return;
      }

      const responseData = await response.json();
      console.log("Submission response:", responseData);

      // Refresh the documents list
      await fetchStudentDocuments();

      toast.success(`Document submitted to ${submission.name} successfully!`);
      setShowSubmitModal(false);
      setSelectedDocument(null);
    } catch (error) {
      console.error("Submission error:", error);
      toast.error(error.message || "Failed to submit document");
    }
  };

  const handleStudentUpload = async (uploadData) => {
    try {
      // Create FormData
      const formData = new FormData();
      formData.append("file", uploadData.file);
      formData.append("name", uploadData.name);

      // Get JWT token
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Not authenticated");
        return;
      }

      // Upload file to backend
      const response = await fetch(
        "http://localhost:8080/api/student/documents",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const data = await response.json();
      console.log("Upload response:", data);

      // Refresh documents list
      await fetchStudentDocuments();

      toast.success("Document uploaded successfully!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload document");
    }
  };

  const handleDeleteClick = (doc) => {
    setDocumentToDelete(doc);
    setShowDeleteModal(true);
  };

  const handleDeleteDocument = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Not authenticated");
        return;
      }

      const response = await fetch(
        `http://localhost:8080/api/student/documents/${documentToDelete.id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Delete failed");
      }

      // Refresh documents list
      await fetchStudentDocuments();

      toast.success("Document deleted successfully");
      setShowDeleteModal(false);
      setDocumentToDelete(null);
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(error.message || "Failed to delete document");
    }
  };

  const getUpcomingDeadlines = () => {
    const today = new Date();
    return availableSubmissions
      .filter((submission) => new Date(submission.deadline) > today)
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 MB";
    const MB = bytes / (1024 * 1024);
    return MB.toFixed(2) + " MB";
  };

  const handleViewReport = async (document) => {
    try {
      if (document.status !== "Graded") {
        toast.info("This document has not been graded yet");
        return;
      }

      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Not authenticated");
        return;
      }

      // Fetch document results from backend
      const response = await fetch(
        `http://localhost:8080/api/student/documents/${document.id}/results`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch document results");
      }

      const results = await response.json();

      // Navigate to the results page with the document data
      navigate("/parsing-result", {
        state: {
          parsingResult: {
            ...results,
            status: "success",
            document_name: document.name,
            document_type: "student_document",
          },
        },
      });
    } catch (error) {
      console.error("Error viewing report:", error);
      toast.error("Failed to load analysis results");
    }
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

  const handleSubmitAssignment = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("courseId", selectedCourse);
      formData.append("assignmentId", selectedAssignment);

      const response = await fetch("http://localhost:8080/api/submissions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to submit assignment");
      }

      toast.success("Assignment submitted successfully!");
      setSelectedFile(null);
      setSelectedCourse("");
      setSelectedAssignment("");
      fetchCourses();
    } catch (error) {
      console.error("Error submitting assignment:", error);
      toast.error(error.message || "Failed to submit assignment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubmission = async (submissionId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:8080/api/submissions/${submissionId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete submission");
      }

      toast.success("Submission deleted successfully!");
      fetchCourses();
    } catch (error) {
      console.error("Error deleting submission:", error);
      toast.error(error.message || "Failed to delete submission");
    }
  };

  const handleDownloadSubmission = async (submissionId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:8080/api/submissions/${submissionId}/download`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to download submission");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `submission-${submissionId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading submission:", error);
      toast.error(error.message || "Failed to download submission");
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <ToastContainer position="top-right" autoClose={5000} />
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
        <div className="bg-white rounded-lg shadow mb-10">
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
                onClick={
                  doc.status === "Graded"
                    ? () => handleViewReport(doc)
                    : undefined
                }
              >
                <div className="overflow-hidden">
                  <span
                    className={`truncate block ${
                      doc.status === "Graded" ? "text-blue-600 font-medium" : ""
                    }`}
                    title={doc.name}
                  >
                    {doc.name}
                    {doc.status === "Graded" && (
                      <span className="ml-2 text-green-600">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 inline"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </span>
                    )}
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
                  {doc.status === "Graded" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewReport(doc);
                      }}
                      className="px-3 py-1 text-sm text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors duration-300"
                    >
                      View Report
                    </button>
                  )}
                  {!doc.submissionType && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSubmitClick(doc);
                      }}
                      className="px-3 py-1 text-sm text-white bg-[#ff6464] rounded-md hover:bg-[#ff4444] transition-colors duration-300"
                    >
                      Submit
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(doc);
                    }}
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
              <p className="mb-6 text-gray-600 break-words">
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
