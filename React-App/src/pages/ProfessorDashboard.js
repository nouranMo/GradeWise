import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "components/layout/Navbar/Navbar";
import UploadModal from "components/UploadModal";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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
    PlagiarismCheck: false,
    FullAnalysis: false,
  });

  const navigate = useNavigate();

  useEffect(() => {
    // Fetch documents from the backend API
    const fetchDocuments = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          console.error("No authentication token found");
          return;
        }

        // Fetch professor documents
        const response = await fetch("http://localhost:8080/api/documents", {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const documents = await response.json();
          console.log("Fetched documents:", documents);
          setProfessorDocuments(documents);
        } else {
          console.error("Failed to fetch documents:", await response.text());
        }

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
      } catch (error) {
        console.error("Error fetching documents:", error);
        toast.error("Failed to fetch documents");
      }
    };

    fetchDocuments();
  }, []);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 MB";
    const MB = bytes / (1024 * 1024); // Convert bytes to MB
    return MB.toFixed(2) + " MB"; // Show 2 decimal places
  };

  const handleProfessorUpload = async (uploadData) => {
    try {
      // Create FormData
      const formData = new FormData();
      formData.append("file", uploadData.file);
      formData.append("analyses", JSON.stringify(selectedAnalyses));

      // Get JWT token
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Not authenticated");
        return;
      }

      // Upload file to backend
      const response = await fetch("http://localhost:8080/api/documents", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const data = await response.json();
      console.log("Upload response:", data);

      // Update documents list with the uploaded document and set status to "Uploaded"
      const newDocument = {
        ...data.document,
        status: "Uploaded", // Set status to "Uploaded" after successful upload
      };

      setProfessorDocuments((prev) => [...prev, newDocument]);
      toast.success("Document uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload document");
    }
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

  const handleDelete = async () => {
    if (deleteType === "professor_document") {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          `http://localhost:8080/api/documents/${itemToDelete.id}`,
          {
            method: "DELETE",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const updatedDocs = professorDocuments.filter(
            (doc) => doc.id !== itemToDelete.id
          );
          setProfessorDocuments(updatedDocs);
          toast.success("Document deleted successfully");
        } else {
          toast.error("Failed to delete document");
        }
      } catch (error) {
        console.error("Error deleting document:", error);
        toast.error("An error occurred while deleting the document");
      }
    } else if (deleteType === "submission") {
      const updatedSubmissions = submissions.filter(
        (sub) => sub.id !== itemToDelete.id
      );
      setSubmissions(updatedSubmissions);
      localStorage.setItem(
        "studentDocuments",
        JSON.stringify(updatedSubmissions)
      );
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
      PlagiarismCheck: false,
      FullAnalysis: false,
    });
    setShowAnalysisModal(true);
  };

  const startAnalysis = async () => {
    if (!selectedDocument) return;

    setIsAnalyzing(true);
    setShowAnalysisModal(false);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Authentication token not found");
        return;
      }

      // Update document status to "Analyzing"
      if (selectedDocument.type === "professor_document") {
        const updatedDocs = professorDocuments.map((doc) =>
          doc.id === selectedDocument.id ? { ...doc, status: "Analyzing" } : doc
        );
        setProfessorDocuments(updatedDocs);
      }

      // Send request to Spring backend with selected analyses
      const response = await fetch(
        `http://localhost:8080/api/documents/${selectedDocument.id}/analyze`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ analyses: selectedAnalyses }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Analysis failed");
      }

      // Wait for 5 seconds to allow the analysis to complete
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Fetch the updated document with analysis results
      const documentResponse = await fetch(
        `http://localhost:8080/api/documents/${selectedDocument.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!documentResponse.ok) {
        throw new Error("Failed to fetch document results");
      }

      const updatedDocument = await documentResponse.json();
      console.log("Updated document with results:", updatedDocument);
      console.log("Updated document results:", updatedDocument.results);

      // Update document status to "Graded" on success
      if (selectedDocument.type === "professor_document") {
        const updatedDocs = professorDocuments.map((doc) => {
          if (doc.id === selectedDocument.id) {
            return {
              ...doc,
              status: "Graded",
              analyzed: true,
              results: updatedDocument.results,
            };
          }
          return doc;
        });
        setProfessorDocuments(updatedDocs);
      } else {
        const updatedSubmissions = submissions.map((sub) => {
          if (sub.id === selectedDocument.id) {
            return {
              ...sub,
              status: "Graded",
              analyzed: true,
              results: updatedDocument.results,
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

      // Navigate to results page with the complete data
      navigate("/parsing-result", {
        state: {
          parsingResult: {
            ...updatedDocument.results,
            status: "success",
            document_name: selectedDocument.name,
            document_type: "professor_document",
          },
        },
      });
      toast.success("Analysis completed successfully");
    } catch (error) {
      console.error("Analysis failed:", error);
      toast.error(error.message || "Failed to analyze document");

      // Update document status to reflect failure
      if (selectedDocument.type === "professor_document") {
        const updatedDocs = professorDocuments.map((doc) => {
          if (doc.id === selectedDocument.id) {
            return { ...doc, status: "Analysis Failed" };
          }
          return doc;
        });
        setProfessorDocuments(updatedDocs);
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

  const handleViewReport = async (document) => {
    console.log("handleViewReport called with document:", document);
    console.log("Document ID:", document.id);
    console.log("Document status:", document.status);
    console.log("Document results:", document.results);

    try {
      // If the document has "Completed" status but no results, add dummy results
      if (document.status === "Completed" && !document.results) {
        console.log(
          "Document has Completed status but no results, adding dummy results"
        );
        document.results = {
          srs_validation: {
            structure_validation: {
              matching_sections: ["Introduction", "Requirements"],
              missing_sections: [],
            },
          },
          status: "success",
        };
      }

      // If we need to fetch fresh data for the document
      if (document.id) {
        const token = localStorage.getItem("token");
        if (!token) {
          console.log("No authentication token found");
          toast.error("Authentication token not found");
          return;
        }

        console.log("Fetching document with ID:", document.id);
        // Fetch the document to get the latest results
        const response = await fetch(
          `http://localhost:8080/api/documents/${document.id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Failed to fetch document results:", errorText);
          throw new Error("Failed to fetch document results");
        }

        const updatedDocument = await response.json();
        console.log("Fetched updated document:", updatedDocument);
        console.log("Updated document results:", updatedDocument.results);

        // Check if the document has results
        if (updatedDocument.results) {
          const reportData = {
            ...updatedDocument.results,
            status: "success",
            document_name: document.name || updatedDocument.name,
            document_type: "professor_document",
          };
          console.log("Report data to navigate with:", reportData);

          navigate("/parsing-result", {
            state: { parsingResult: reportData },
          });
          return;
        } else if (document.status === "Completed") {
          // If the updated document doesn't have results but status is Completed,
          // use the dummy results we added
          const reportData = {
            ...document.results,
            status: "success",
            document_name: document.name,
            document_type: "professor_document",
          };
          console.log("Using dummy report data:", reportData);

          navigate("/parsing-result", {
            state: { parsingResult: reportData },
          });
          return;
        } else {
          console.log("Updated document has no results");
        }
      } else {
        console.log("Document has no ID, skipping fetch");
      }

      // Fallback to using the document object directly if it has results
      if (document.results) {
        console.log("Using document results directly:", document.results);
        const reportData = {
          ...document.results,
          status: "success",
          document_name: document.name,
          document_type: "professor_document",
        };
        console.log("Report data from direct document:", reportData);

        navigate("/parsing-result", {
          state: { parsingResult: reportData },
        });
      } else {
        console.log("No results found in document");
        toast.error("No analysis results available for this document");
      }
    } catch (error) {
      console.error("Error viewing report:", error);
      toast.error("Failed to load analysis results");
    }
  };

  // Add this new function to debug document status
  const debugDocumentStatus = (doc) => {
    console.log("Document:", doc);
    console.log("Status:", doc.status);
    console.log("Has results:", !!doc.results);
    console.log(
      "Is viewable:",
      doc.status === "Graded" ||
        doc.status === "Analyzed" ||
        doc.status === "Completed"
    );
    return (
      doc.status === "Graded" ||
      doc.status === "Analyzed" ||
      doc.status === "Completed"
    );
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

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <ToastContainer position="top-right" autoClose={5000} />
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
                  <div
                    key={slot.id}
                    className="flex justify-between items-center"
                  >
                    <div>
                      <p className="font-medium">{slot.name}</p>
                      <p className="text-sm text-gray-500">
                        Due: {new Date(slot.deadline).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteClick(slot, "slot")}
                      className="text-red-500 hover:text-red-700"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
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
              <div className="flex items-center px-6 py-3 bg-gray-50 text-sm font-medium text-gray-500">
                <div className="flex-1 grid grid-cols-5 gap-4">
                  <div>STUDENT</div>
                  <div>DOCUMENT</div>
                  <div>SUBMISSION TYPE</div>
                  <div>SUBMITTED</div>
                  <div>GRADE</div>
                </div>
                <div className="w-[120px]">STATUS</div>
                <div className="w-[150px]">ACTIONS</div>
              </div>

              {filteredSubmissions.map((submission) => {
                // Check if submission is viewable (has completed analysis)
                const isViewable =
                  submission.status === "Graded" ||
                  submission.status === "Analyzed";

                return (
                  <div
                    key={submission.id}
                    onClick={() => {
                      if (isViewable) {
                        handleViewReport(submission);
                      }
                    }}
                    className={`flex items-center px-6 py-3 border-b text-sm text-gray-600 relative ${
                      isViewable
                        ? "hover:bg-blue-50 cursor-pointer group transition-colors"
                        : ""
                    }`}
                  >
                    <div className="flex-1 grid grid-cols-5 gap-4">
                      <div>{submission.studentName || "Student Name"}</div>
                      <div
                        className={`truncate ${
                          isViewable ? "font-medium text-blue-600" : ""
                        }`}
                      >
                        {submission.name}
                        {isViewable && (
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
                      </div>
                      <div>{submission.submissionType}</div>
                      <div>{submission.date}</div>
                      <div>{submission.grade || "-"}</div>
                    </div>
                    <div className="w-[120px]">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          isViewable
                            ? "bg-green-100 text-green-800"
                            : submission.status === "Analyzing"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {submission.status}
                      </span>
                    </div>
                    <div
                      className="w-[150px] flex items-center space-x-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isViewable ? (
                        <>
                          <button
                            onClick={() => handleViewReport(submission)}
                            className="px-4 py-1 text-sm text-white bg-green-600 rounded-md hover:bg-green-700"
                          >
                            View Report
                          </button>
                          <button
                            onClick={() => handleAnalyzeClick(submission)}
                            className="px-4 py-1 text-sm text-white bg-[#ff6464] rounded-md hover:bg-[#ff4444]"
                          >
                            Re-analyze
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleAnalyzeClick(submission)}
                          className="px-4 py-1 text-sm text-white bg-[#ff6464] rounded-md hover:bg-[#ff4444]"
                        >
                          Analyze
                        </button>
                      )}
                      <button
                        onClick={() =>
                          handleDeleteClick(submission, "submission")
                        }
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
                );
              })}
            </div>
          </div>

          {/* Professor Documents Table */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Uploaded Documents</h2>
            <div className="bg-white rounded-lg shadow mb-8">
              <div className="flex items-center px-6 py-3 bg-gray-50 text-sm font-medium text-gray-500">
                <div className="flex-1 grid grid-cols-3 gap-4">
                  <div>DOCUMENT NAME</div>
                  <div>UPLOADED DATE</div>
                  <div>SIZE</div>
                </div>
                <div className="w-[120px]">STATUS</div>
                <div className="w-[150px]">ACTIONS</div>
              </div>

              {professorDocuments.map((doc) => {
                // Check if document is viewable (has completed analysis)
                const isViewable = debugDocumentStatus(doc);

                return (
                  <div
                    key={doc.id}
                    onClick={() => {
                      console.log("Row clicked for document:", doc.name);
                      if (isViewable || doc.status === "Completed") {
                        console.log(
                          "Document is viewable, calling handleViewReport"
                        );
                        handleViewReport(doc);
                      } else {
                        console.log(
                          "Document is not viewable, status:",
                          doc.status
                        );
                      }
                    }}
                    className={`flex items-center px-6 py-3 border-b text-sm text-gray-600 relative ${
                      isViewable || doc.status === "Completed"
                        ? "hover:bg-blue-50 cursor-pointer group transition-colors"
                        : ""
                    }`}
                  >
                    <div className="flex-1 grid grid-cols-3 gap-4">
                      <div
                        className={`truncate ${
                          isViewable || doc.status === "Completed"
                            ? "font-medium text-blue-600"
                            : ""
                        }`}
                      >
                        {doc.name}
                        {(isViewable || doc.status === "Completed") && (
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
                      </div>
                      <div>{doc.date}</div>
                      <div>{doc.size}</div>
                    </div>
                    <div className="w-[120px]">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          isViewable ||
                          doc.status === "Completed" ||
                          doc.status === "Graded" ||
                          doc.status === "Analyzed"
                            ? "bg-green-100 text-green-800"
                            : doc.status === "Analyzing"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {doc.status}
                      </span>
                    </div>
                    <div
                      className="w-[150px] flex items-center space-x-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isViewable || doc.status === "Completed" ? (
                        <>
                          <button
                            onClick={() => handleViewReport(doc)}
                            className="px-4 py-1 text-sm text-white bg-green-600 rounded-md hover:bg-green-700"
                          >
                            View Report
                          </button>
                          <button
                            onClick={() => handleAnalyzeClick(doc)}
                            className="px-4 py-1 text-sm text-white bg-[#ff6464] rounded-md hover:bg-[#ff4444]"
                          >
                            Re-analyze
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleAnalyzeClick(doc)}
                          className="px-4 py-1 text-sm text-white bg-[#ff6464] rounded-md hover:bg-[#ff4444]"
                        >
                          Analyze
                        </button>
                      )}
                      <button
                        onClick={() =>
                          handleDeleteClick(doc, "professor_document")
                        }
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
                );
              })}
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
