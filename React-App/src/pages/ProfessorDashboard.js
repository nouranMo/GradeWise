import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "components/layout/Navbar/Navbar";
import UploadModal from "components/UploadModal";
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer, toast } from 'react-toastify';

// Modal for creating new submission slots
const CreateSubmissionModal = ({ isOpen, onClose, onSubmit }) => {
  const initialFormData = {
    name: "",
    description: "",
    deadline: "",
    deadlineTime: "",
    course: "",
  };

  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});

  const resetForm = () => {
    setFormData(initialFormData);
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Get minimum date (today) in YYYY-MM-DD format
  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  // Get current time in HH:mm format
  const getCurrentTime = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Submission name is required";
    }

    if (!formData.deadline) {
      newErrors.deadline = "Deadline date is required";
    }

    if (!formData.deadlineTime) {
      newErrors.deadlineTime = "Deadline time is required";
    }

    if (!formData.course) {
      newErrors.course = "Course selection is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      // Combine date and time for deadline
      const combinedDeadline = new Date(
        `${formData.deadline}T${formData.deadlineTime}`
      );
      onSubmit({
        ...formData,
        deadline: combinedDeadline.toISOString(),
      });
      resetForm(); // Reset the form after successful submission
    }
  };

  const isFormValid = () => {
    return (
      formData.name.trim() !== "" &&
      formData.deadline !== "" &&
      formData.deadlineTime !== "" &&
      formData.course !== ""
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-md w-full m-4">
        <h2 className="text-xl font-semibold mb-4">Create New Submission</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Submission Name*
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (errors.name) {
                  setErrors({ ...errors, name: "" });
                }
              }}
              className={`w-full border rounded-lg px-3 py-2 ${
                errors.name ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="e.g., SRS Document Submission"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full border rounded-lg px-3 py-2"
              rows="3"
              placeholder="Enter submission details..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Deadline Date*
              </label>
              <input
                type="date"
                value={formData.deadline}
                min={getMinDate()}
                onChange={(e) => {
                  setFormData({ ...formData, deadline: e.target.value });
                  if (errors.deadline) {
                    setErrors({ ...errors, deadline: "" });
                  }
                }}
                className={`w-full border rounded-lg px-3 py-2 ${
                  errors.deadline ? "border-red-500" : "border-gray-300"
                } text-gray-500 [&::-webkit-datetime-edit-text]:text-gray-500 [&::-webkit-datetime-edit]:text-gray-500`}
              />
              {errors.deadline && (
                <p className="mt-1 text-sm text-red-500">{errors.deadline}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Deadline Time*
              </label>
              <input
                type="time"
                value={formData.deadlineTime}
                onChange={(e) => {
                  setFormData({ ...formData, deadlineTime: e.target.value });
                  if (errors.deadlineTime) {
                    setErrors({ ...errors, deadlineTime: "" });
                  }
                }}
                className={`w-full border rounded-lg px-3 py-2 ${
                  errors.deadlineTime ? "border-red-500" : "border-gray-300"
                } text-gray-500 [&::-webkit-datetime-edit-text]:text-gray-500 [&::-webkit-datetime-edit]:text-gray-500`}
              />
              {errors.deadlineTime && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.deadlineTime}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Course*
            </label>
            <select
              value={formData.course}
              onChange={(e) =>
                setFormData({ ...formData, course: e.target.value })
              }
              className={`w-full border rounded-lg px-3 py-2 ${
                errors.course ? "border-red-500" : "border-gray-300"
              } ${!formData.course ? "text-gray-500" : "text-gray-900"}`}
              required
            >
              <option value="" hidden className="text-gray-500">
                Select a course
              </option>
              <option value="SWE301" className="text-black">
                SWE 301
              </option>
              <option value="SWE302" className="text-black">
                SWE 302
              </option>
              <option value="SWE401" className="text-black">
                SWE 401
              </option>
              <option value="SWE402" className="text-black">
                SWE 402
              </option>
            </select>
            {errors.course && (
              <p className="mt-1 text-sm text-red-500">{errors.course}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-4 mt-6">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors duration-300"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isFormValid()}
            className="px-4 py-2 bg-[#ff6464] text-white rounded-md hover:bg-[#ff4444] disabled:hover:bg-[#ff6464] disabled:opacity-50 transition-colors duration-300"
          >
            Create Submission
          </button>
        </div>
      </div>
    </div>
  );
};

function ProfessorDashboard() {
  const [submissions, setSubmissions] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [selectedCourse, setSelectedCourse] = useState("all");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateSubmissionModal, setShowCreateSubmissionModal] =
    useState(false);
  const [submissionSlots, setSubmissionSlots] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteType, setDeleteType] = useState(null); // 'submission' or 'slot'
  const [professorDocuments, setProfessorDocuments] = useState([]);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
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

  const navigate = useNavigate();

  useEffect(() => {
    // Get the documents from localStorage that were uploaded by students
    const studentDocuments = JSON.parse(
      localStorage.getItem("studentDocuments") || "[]"
    );

    const submittedDocuments = studentDocuments.filter(
      (doc) => doc.status === "Submitted" || doc.status === "Graded"
    );
    setSubmissions(submittedDocuments);

    // Get submission slots
    const savedSlots = JSON.parse(
      localStorage.getItem("submissionSlots") || "[]"
    );
    setSubmissionSlots(savedSlots);

    const savedProfessorDocs = JSON.parse(
      localStorage.getItem("professorDocuments") || "[]"
    );
    setProfessorDocuments(savedProfessorDocs);
  }, []);

  const handleProfessorUpload = (uploadData) => {
    const newDocument = {
      id: Date.now(),
      name: uploadData.name,
      size: formatFileSize(uploadData.size),
      date: new Date().toLocaleDateString(),
      status: "Uploaded",
      type: "professor_document",
      file: uploadData.file,
    };

    const updatedDocs = [...professorDocuments, newDocument];
    setProfessorDocuments(updatedDocs);
    localStorage.setItem("professorDocuments", JSON.stringify(updatedDocs));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 MB";
    const MB = bytes / (1024 * 1024);
    return MB.toFixed(2) + " MB";
  };

  const handleCreateSubmissionSlot = (formData) => {
    const newSlot = {
      id: Date.now(),
      ...formData,
      status: "Open",
      submissionsCount: 0,
    };

    const updatedSlots = [...submissionSlots, newSlot];
    setSubmissionSlots(updatedSlots);
    localStorage.setItem("submissionSlots", JSON.stringify(updatedSlots));
    setShowCreateSubmissionModal(false);
  };

  const handleAnalyzeSubmission = async (submission) => {
    try {
      // Here you would implement the analysis logic
      // For now, we'll just simulate it
      const updatedSubmissions = submissions.map((sub) => {
        if (sub.id === submission.id) {
          return {
            ...sub,
            status: "Graded",
            grade: Math.floor(Math.random() * 30) + 70, // Random grade between 70-100
            feedback: "Analysis completed successfully.",
          };
        }
        return sub;
      });

      setSubmissions(updatedSubmissions);
      localStorage.setItem(
        "studentDocuments",
        JSON.stringify(updatedSubmissions)
      );
    } catch (error) {
      console.error("Analysis failed:", error);
      alert("Failed to analyze submission. Please try again.");
    }
  };

  const handleDeleteClick = (item, type) => {
    setItemToDelete(item);
    setDeleteType(type);
    setShowDeleteModal(true);
  };

  const handleDelete = () => {
    if (deleteType === "submission") {
      const updatedSubmissions = submissions.filter(
        (sub) => sub.id !== itemToDelete.id
      );
      setSubmissions(updatedSubmissions);
      localStorage.setItem(
        "studentDocuments",
        JSON.stringify(updatedSubmissions)
      );
    } else if (deleteType === "professor_document") {
      // Make sure this matches the deleteType you're passing
      const updatedDocs = professorDocuments.filter(
        (doc) => doc.id !== itemToDelete.id
      );
      setProfessorDocuments(updatedDocs);
      localStorage.setItem("professorDocuments", JSON.stringify(updatedDocs));
    } else if (deleteType === "slot") {
      const updatedSlots = submissionSlots.filter(
        (slot) => slot.id !== itemToDelete.id
      );
      setSubmissionSlots(updatedSlots);
      localStorage.setItem("submissionSlots", JSON.stringify(updatedSlots));
    }
    setShowDeleteModal(false);
    setItemToDelete(null);
    setDeleteType(null);
  };

  const DeleteConfirmationModal = () => {
    if (!showDeleteModal) return null;

    const itemName = itemToDelete?.name;

    const itemType =
      deleteType === "submission"
        ? "submission"
        : deleteType === "professor_document"
        ? "document"
        : "submission slot";

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg max-w-md w-full m-4">
          <h2 className="text-xl font-semibold mb-4">Confirm Deletion</h2>
          <p className="mb-6 text-gray-600">
            Are you sure you want to delete this {itemType}: "{itemName}"? This
            action cannot be undone.
          </p>
          <div className="flex justify-end space-x-4">
            <button
              onClick={() => {
                setShowDeleteModal(false);
                setItemToDelete(null);
                setDeleteType(null);
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  };

  const handleFullAnalysisChange = (checked) => {
    setSelectedAnalyses((prev) => {
      const newState = { ...prev };
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
      const allSelected = Object.entries(newState).every(
        ([k, v]) => k === "FullAnalysis" || v === true
      );
      newState.FullAnalysis = allSelected;
      return newState;
    });
  };

  const handleAnalyzeClick = (document) => {
    setSelectedDocument(document);
    // Reset analysis options when opening modal
    setSelectedAnalyses({
      SrsValidation: false,
      ReferencesValidation: false,
      ContentAnalysis: false,
      ImageAnalysis: false,
      BusinessValueAnalysis: false,
      DiagramConvention: false,
      SpellCheck: false,
      FullAnalysis: false,
    });
    setShowAnalysisModal(true);
  };

  const startAnalysis = async () => {
    if (!selectedDocument) return;

    setIsAnalyzing(true);
    setShowAnalysisModal(false);

    try {
      // Create FormData and append document
      const formData = new FormData();
      formData.append("pdfFile", selectedDocument.file);
      formData.append("analyses", JSON.stringify(selectedAnalyses));

      // Send request to backend
      const response = await fetch("http://localhost:5000/analyze_document", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.status === "success") {
        if (selectedDocument.type === "professor_document") {
          const updatedDocs = professorDocuments.map((doc) => {
            if (doc.id === selectedDocument.id) {
              return {
                ...doc,
                status: "Graded",
                analyzed: true,
                results: result,
              };
            }
            return doc;
          });
          setProfessorDocuments(updatedDocs);
          localStorage.setItem(
            "professorDocuments",
            JSON.stringify(updatedDocs)
          );
        } else {
          const updatedSubmissions = submissions.map((sub) => {
            if (sub.id === selectedDocument.id) {
              return {
                ...sub,
                status: "Graded",
                analyzed: true,
                results: result,
              };
            }
            return sub;
          });
          setSubmissions(updatedSubmissions);
          localStorage.setItem(
            "studentDocuments",
            JSON.stringify(updatedSubmissions)
          );
        }

        // Navigate to results page
        navigate("/parsing-result", {
          state: { parsingResult: result },
        });
      }
    } catch (error) {
      console.error("Analysis failed:", error);
      alert("Failed to analyze document. Please try again.");

      // Update document status to reflect failure
      if (selectedDocument.type === "professor_document") {
        const updatedDocs = professorDocuments.map((doc) => {
          if (doc.id === selectedDocument.id) {
            return { ...doc, status: "Analysis Failed" };
          }
          return doc;
        });
        setProfessorDocuments(updatedDocs);
        localStorage.setItem("professorDocuments", JSON.stringify(updatedDocs));
      } else {
        const updatedSubmissions = submissions.map((sub) => {
          if (sub.id === selectedDocument.id) {
            return { ...sub, status: "Analysis Failed" };
          }
          return sub;
        });
        setSubmissions(updatedSubmissions);
        localStorage.setItem(
          "studentDocuments",
          JSON.stringify(updatedSubmissions)
        );
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const filteredSubmissions = submissions.filter((submission) => {
    if (
      selectedFilter !== "all" &&
      submission.status.toLowerCase() !== selectedFilter
    ) {
      return false;
    }
    if (selectedCourse !== "all" && submission.course !== selectedCourse) {
      return false;
    }
    return true;
  });

  const handleRowClick = (document) => {
    if (document.status === "Graded" && document.results) {
      navigate("/parsing-result", {
        state: { parsingResult: document.results },
      });
    }
    else {
      toast.error("No analysis results available");
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <ToastContainer />
      <div className="max-w-6xl mx-auto mt-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-800">
            Professor Dashboard
          </h1>
          <p className="text-gray-500">
            {submissions.filter((s) => s.status === "Submitted").length}{" "}
            submissions pending review
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          {/* Upload Document Card */}
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <h2 className="text-lg font-semibold mb-4">Upload Document</h2>
            <UploadModal onUploadComplete={handleProfessorUpload} />
          </div>

          {/* Create Submission Slot Card */}
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <h2 className="text-lg font-semibold mb-4">Create Submission</h2>
            <button
              onClick={() => setShowCreateSubmissionModal(true)}
              className="w-full py-3 bg-[#ff6464] text-white rounded-lg hover:bg-[#ff4444] transition-colors duration-300"
            >
              Create New Submission
            </button>
          </div>

          {/* Active Submissions Card */}
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <h2 className="text-lg font-semibold mb-4">Active Submissions</h2>
            <div className="space-y-3">
              {submissionSlots
                .filter((slot) => slot.status === "Open")
                .map((slot) => (
                  <div key={slot.id} className="border-b pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-800">{slot.name}</p>
                        <p className="text-sm text-gray-500">
                          Due: {new Date(slot.deadline).toLocaleDateString()}
                          {" • "}
                          {new Date(slot.deadline).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteClick(slot, "slot")}
                        className="text-gray-400 hover:text-red-500"
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
                ))}
            </div>
          </div>

          {/* Quick Stats Card */}
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <h2 className="text-lg font-semibold mb-4">Overview</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Total Submissions</p>
                <p className="text-2xl font-semibold text-[#ff6464]">
                  {submissions.length}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending Review</p>
                <p className="text-2xl font-semibold text-[#ff6464]">
                  {submissions.filter((s) => s.status === "Submitted").length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <select
            className="border rounded-lg py-2 text-sm max-w-56 truncate"
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
          >
            <option value="all">All Courses</option>
            <option value="SWE301">SWE 301</option>
            <option value="SWE302">SWE 302</option>
            <option value="SWE401">SWE 401</option>
            <option value="SWE402">SWE 402</option>
          </select>

          <select
            className="border rounded-lg py-2 text-sm max-w-56 truncate"
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="submitted">Pending Review</option>
            <option value="graded">Reviewed</option>
          </select>
        </div>

        {/* Tables Section */}
        <div className="space-y-8">
          {/* Student Submissions Table */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Student Submissions</h2>
            <div className="bg-white rounded-lg shadow mb-8">
              <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_140px_150px] gap-4 px-6 py-3 bg-gray-50 text-sm font-medium text-gray-500">
                <div>DOCUMENT NAME</div>
                <div>STUDENT</div>
                <div>SUBMISSION TYPE</div>
                <div>SUBMITTED</div>
                <div>GRADE</div>
                <div>STATUS</div>
                <div>ACTIONS</div>
              </div>

              {filteredSubmissions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No student submissions found
                </div>
              ) : (
                filteredSubmissions.map((submission) => (
                  <div
                    key={submission.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRowClick(submission);
                    }}
                    className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_140px_150px] gap-4 px-6 py-3 border-b text-sm text-gray-600 hover:bg-gray-100 hover:cursor-pointer transition-colors duration-300"
                  >
                    <div className="truncate">{submission.name}</div>
                    <div>{submission.studentName || "Student Name"}</div>
                    <div>{submission.submissionType}</div>
                    <div>{submission.date}</div>
                    <div>{submission.grade || "-"}</div>
                    <div>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          submission.status === "Submitted"
                            ? "bg-yellow-100 text-yellow-800"
                            : submission.status === "Graded"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {submission.status}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {submission.status !== "Graded" && (
                        <button
                          onClick={() => handleAnalyzeClick(submission)}
                          className="px-4 py-1 text-sm text-white bg-[#ff6464] rounded-md hover:bg-[#ff4444] transition-colors duration-300"
                        >
                          Analyze
                        </button>
                      )}
                      <button
                        onClick={() =>
                          handleDeleteClick(submission, "submission")
                        }
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
          </div>

          {/* Professor Documents Table */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Uploaded Documents</h2>
            <div className="bg-white rounded-lg shadow mb-8">
              <div className="grid grid-cols-[1.5fr_1fr_1fr_140px_150px] gap-4 px-6 py-3 bg-gray-50 text-sm font-medium text-gray-500">
                <div>DOCUMENT NAME</div>
                <div>UPLOADED DATE</div>
                <div>SIZE</div>
                <div>STATUS</div>
                <div>ACTIONS</div>
              </div>

              {professorDocuments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No documents uploaded
                </div>
              ) : (
                professorDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => handleRowClick(doc)}
                    className="grid grid-cols-[1.5fr_1fr_1fr_140px_150px] gap-4 px-6 py-3 border-b text-sm text-gray-600 hover:bg-gray-100 hover:cursor-pointer transition-colors duration-300"
                  >
                    <div className="truncate">{doc.name}</div>
                    <div>{doc.date}</div>
                    <div>{doc.size}</div>
                    <div>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          doc.status === "Analysis Failed"
                            ? "bg-red-100 text-red-800"
                            : doc.status === "Uploaded"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {doc.status}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {doc.status !== "Graded" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAnalyzeClick(doc);
                          }}
                          className="px-4 py-1 text-sm text-white bg-[#ff6464] rounded-md hover:bg-[#ff4444] transition-colors duration-300"
                        >
                          Analyze
                        </button>
                      )}
                      <button
                        onClick={() =>
                          handleDeleteClick(doc, "professor_document")
                        }
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
          </div>
        </div>

        {/* Modals */}
        <CreateSubmissionModal
          isOpen={showCreateSubmissionModal}
          onClose={() => setShowCreateSubmissionModal(false)}
          onSubmit={handleCreateSubmissionSlot}
        />

        <DeleteConfirmationModal />

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
                  if (key === "FullAnalysis") return null;
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

export default ProfessorDashboard;
