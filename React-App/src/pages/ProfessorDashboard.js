import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "components/layout/Navbar/Navbar";
import UploadModal from "components/UploadModal";

import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// API URL constant
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8080";

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
  const [showDocTypeModal, setShowDocTypeModal] = useState(false);
  const [showCreateSubmissionModal, setShowCreateSubmissionModal] =
    useState(false);
  const [submissionSlots, setSubmissionSlots] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteType, setDeleteType] = useState(null); // 'submission' or 'slot'
  const [professorDocuments, setProfessorDocuments] = useState([]);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [documentType, setDocumentType] = useState(null);
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
  const [analyzingSubmission, setAnalyzingSubmission] = useState(null);

  const navigate = useNavigate();

  const sortDocuments = (documents) => {
    return [...documents].sort((a, b) => {
      // Sort by date in descending order (newest first)
      return new Date(b.date) - new Date(a.date);
    });
  };

  // Define fetchSubmissions function to reload submissions
  const fetchSubmissions = useCallback(async () => {
    try {
      console.log("Fetching submissions...");
      setSubmissions([]); // Clear existing submissions while loading
      toast.info("Refreshing submissions...", { autoClose: 2000 });

      // Fetch student submissions directly from API
      const submissionsResponse = await fetch(`${API_URL}/api/submissions`);

      if (submissionsResponse.ok) {
        const submissionData = await submissionsResponse.json();
        console.log("Fetched student submissions:", submissionData);

        if (Array.isArray(submissionData) && submissionData.length > 0) {
          setSubmissions(submissionData);
          toast.success(`Found ${submissionData.length} submissions`, {
            autoClose: 2000,
          });
        } else {
          console.log("No submissions found or empty array returned");
          toast.info("No submissions found", { autoClose: 2000 });
          // Keep the submissions array empty
        }
      } else {
        const errorText = await submissionsResponse.text();
        console.error(
          `Failed to fetch submissions: ${submissionsResponse.status} ${submissionsResponse.statusText}`,
          errorText
        );
        toast.error(
          `Error fetching submissions: ${submissionsResponse.status} ${submissionsResponse.statusText}`
        );

        // Try to get student submissions from localStorage as fallback
        const studentSubmissions = JSON.parse(
          localStorage.getItem("submittedDocuments") || "[]"
        );

        if (studentSubmissions.length > 0) {
          console.log("Using fallback student submissions from localStorage");
          setSubmissions(studentSubmissions);
        }
      }
    } catch (error) {
      console.error("Error fetching submissions:", error);
      toast.error(`Failed to fetch submissions: ${error.message}`);
    }
  }, [API_URL]);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const response = await fetch(`${API_URL}/api/documents`);

        if (response.ok) {
          const documents = await response.json();
          console.log("Raw documents from API:", documents);

          const processedDocuments = documents.map((doc) => {
            let status = doc.status;
            if (doc.analysisInProgress) {
              status = "Analyzing";
            } else if (!status) {
              status = doc.analyzed && doc.results ? "Completed" : "Uploaded";
            }

            return {
              ...doc,
              status: status,
              results: doc.results || null,
            };
          });

          // Sort documents by date
          const sortedDocuments = processedDocuments.sort((a, b) => {
            const dateA = new Date(a.date || a.uploadDate);
            const dateB = new Date(b.date || b.uploadDate);
            return dateB - dateA;
          });

          console.log("Final processed documents:", sortedDocuments);
          setProfessorDocuments(sortedDocuments);
        } else {
          console.error("Failed to fetch documents:", await response.text());
        }

        // Fetch submission slots code remains the same...
        const slotsResponse = await fetch(`${API_URL}/api/submissions/slots`);
        if (slotsResponse.ok) {
          const slots = await slotsResponse.json();
          console.log("Fetched submission slots:", slots);
          setSubmissionSlots(slots);
        } else {
          console.error(
            "Failed to fetch submission slots:",
            await slotsResponse.text()
          );

          // Get submission slots from localStorage as fallback
          const savedSlots = JSON.parse(
            localStorage.getItem("submissionSlots") || "[]"
          );
          setSubmissionSlots(savedSlots);
        }
      } catch (error) {
        console.error("Error fetching documents:", error);
        toast.error("Failed to fetch documents");
      }
    };

    fetchDocuments();
    // Also fetch submissions when component loads
    fetchSubmissions();
  }, [fetchSubmissions]); // Add fetchSubmissions to dependencies

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
      formData.append("documentType", documentType || "SRS");
      console.log("Uploading document with type:", documentType);
      // Upload file to backend without auth token for now
      const response = await fetch(`${API_URL}/api/documents`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const data = await response.json();
      console.log("Upload response:", data);

      const newDocument = {
        ...data.document,
        status: "Uploaded",
        analyzed: false,
        results: null,
        uploadDate: new Date().toISOString(),
      };

      console.log("New document being added:", newDocument);
      setProfessorDocuments((prevDocs) => {
        const updatedDocs = [newDocument, ...prevDocs];
        return updatedDocs.sort((a, b) => {
          const dateA = new Date(a.date || a.uploadDate);
          const dateB = new Date(b.date || b.uploadDate);
          return dateB - dateA;
        });
      });
      toast.success("Document uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload document");
    }
  };

  const handleCreateSubmissionSlot = async (formData) => {
    try {
      // Create submission slot on the backend
      const response = await fetch(`${API_URL}/api/submissions/slots`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create submission slot");
      }

      const newSlot = await response.json();
      console.log("Created new submission slot:", newSlot);

      // Update the local state with the new slot
      setSubmissionSlots((prev) => [...prev, newSlot]);

      toast.success(
        `New submission slot "${formData.name}" created successfully`
      );
      setShowCreateSubmissionModal(false);
    } catch (error) {
      console.error("Error creating submission slot:", error);
      toast.error(error.message || "Failed to create submission slot");
    }
  };

  const handleAnalyzeSubmission = async (submission) => {
    setSelectedDocument(submission);
    setShowDocTypeModal(true);

    // Reset analysis options when opening modal
    setSelectedAnalyses({
      SrsValidation: true,
      ReferencesValidation: true,
      ContentAnalysis: true,
      ImageAnalysis: false,
      BusinessValueAnalysis: false,
      DiagramConvention: false,
      SpellCheck: true,
      PlagiarismCheck: false,
      FullAnalysis: false,
    });
    // Show the analysis options modal
    setShowAnalysisModal(true);
  };

  const handleDocTypeSelection = (type) => {
    console.log("Selected document type:", type);
    setDocumentType(type);
    setShowDocTypeModal(false);

    // Set appropriate default analyses based on document type
    if (type === "SRS") {
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
    } else if (type === "SDD") {
      // SDD
      setSelectedAnalyses({
        SDDValidation: false,
        DesignPatterns: false,
        ComponentAnalysis: false,
        DiagramConvention: false,
        InterfaceAnalysis: false,
        SecurityAnalysis: false,
        SpellCheck: false,
        PlagiarismCheck: false,
        FullAnalysis: false,
        ContentAnalysis: false,
      });
    }

    setShowAnalysisModal(true);
  };

  const handleDeleteClick = (item, type) => {
    setItemToDelete(item);
    setDeleteType(type);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    try {
      if (deleteType === "professor_document") {
        const response = await fetch(
          `${API_URL}/api/documents/${itemToDelete.id}`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
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
      } else if (deleteType === "submission") {
        const response = await fetch(
          `${API_URL}/api/submissions/${itemToDelete.id}`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (response.ok) {
          const updatedSubmissions = submissions.filter(
            (sub) => sub.id !== itemToDelete.id
          );
          setSubmissions(updatedSubmissions);
          toast.success("Student submission deleted successfully");
        } else {
          toast.error("Failed to delete submission");
        }
      } else if (deleteType === "slot") {
        const response = await fetch(
          `${API_URL}/api/submissions/slots/${itemToDelete.id}`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (response.ok) {
          const updatedSlots = submissionSlots.filter(
            (slot) => slot.id !== itemToDelete.id
          );
          setSubmissionSlots(updatedSlots);
          toast.success("Submission slot deleted successfully");
        } else {
          toast.error("Failed to delete submission slot");
        }
      }
    } catch (error) {
      console.error("Error during deletion:", error);
      toast.error("An error occurred while deleting");
    } finally {
      setShowDeleteModal(false);
      setItemToDelete(null);
      setDeleteType(null);
    }
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
          <div className="mb-6">
            <p className="text-gray-600 mb-2">
              Are you sure you want to delete this {itemType}:
            </p>
            <p className="text-gray-800 font-medium break-words">
              "{itemName}"
            </p>
            <p className="text-gray-600 mt-2">This action cannot be undone.</p>
          </div>
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
              className="px-4 py-2 bg-[#ff6464] text-white rounded-md hover:bg-[#ff4444] transition-colors duration-300"
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
    setShowDocTypeModal(true);
  };

  const startAnalysis = async () => {
    if (!selectedDocument) return;

    setIsAnalyzing(true);
    setShowAnalysisModal(false);

    // Determine if we're analyzing a professor document or a student submission
    const isSubmission =
      !!selectedDocument.submissionSlotId || selectedDocument.submissionType;
    const endpointUrl = isSubmission
      ? `${API_URL}/api/submissions/${selectedDocument.id}/analyze`
      : `${API_URL}/api/documents/${selectedDocument.id}/analyze`;

    console.log(
      `Starting analysis for ${isSubmission ? "submission" : "document"}: ${
        selectedDocument.id
      }`
    );
    console.log("Selected analyses:", selectedAnalyses);

    try {
      // Update status to "Analyzing" in the UI
      if (isSubmission) {
        // Also set the analyzing submission ID for UI feedback
        setAnalyzingSubmission(selectedDocument.id);

        // Update submission status
        const updatedSubmissions = submissions.map((sub) =>
          sub.id === selectedDocument.id ? { ...sub, status: "Analyzing" } : sub
        );
        setSubmissions(updatedSubmissions);
      } else {
        // Update document status
        const updatedDocs = professorDocuments.map((doc) =>
          doc.id === selectedDocument.id ? { ...doc, status: "Analyzing" } : doc
        );
        setProfessorDocuments(updatedDocs);
      }

      // Send request to Spring backend with selected analyses
      const response = await fetch(endpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          analyses: selectedAnalyses,
          documentType: documentType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Analysis failed");
      }

      // Wait for 5 seconds to allow the analysis to complete
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Fetch the updated document or submission with analysis results
      const resultResponse = await fetch(
        isSubmission
          ? `${API_URL}/api/submissions/${selectedDocument.id}`
          : `${API_URL}/api/documents/${selectedDocument.id}`
      );

      if (!resultResponse.ok) {
        throw new Error(
          `Failed to fetch ${isSubmission ? "submission" : "document"} results`
        );
      }

      const updatedItem = await resultResponse.json();
      console.log(
        `Updated ${isSubmission ? "submission" : "document"} with results:`,
        updatedItem
      );
      console.log("Updated results:", updatedItem.results);

      // Update document/submission status to "Graded" on success
      if (isSubmission) {
        const updatedSubmissions = submissions.map((sub) => {
          if (sub.id === selectedDocument.id) {
            return {
              ...sub,
              status: "Graded",
              analyzed: true,
              results: updatedItem.results,
            };
          }
          return sub;
        });
        setSubmissions(updatedSubmissions);

        // Also fetch all submissions to make sure our list is updated
        fetchSubmissions();
      } else {
        const updatedDocs = professorDocuments.map((doc) => {
          if (doc.id === selectedDocument.id) {
            return {
              ...doc,
              status: "Graded",
              analyzed: true,
              results: updatedItem.results,
            };
          }
          return doc;
        });
        setProfessorDocuments(updatedDocs);
      }

      toast.success("Analysis completed successfully");
    } catch (error) {
      console.error("Analysis failed:", error);
      toast.error(error.message || "Failed to analyze document");

      // Update document/submission status to reflect failure
      const isSubmission =
        !!selectedDocument.submissionSlotId || selectedDocument.submissionType;

      if (isSubmission) {
        const updatedSubmissions = submissions.map((sub) => {
          if (sub.id === selectedDocument.id) {
            return { ...sub, status: "Analysis Failed" };
          }
          return sub;
        });
        setSubmissions(updatedSubmissions);
      } else {
        const updatedDocs = professorDocuments.map((doc) => {
          if (doc.id === selectedDocument.id) {
            return { ...doc, status: "Analysis Failed" };
          }
          return doc;
        });
        setProfessorDocuments(updatedDocs);
      }
    } finally {
      setIsAnalyzing(false);
      setAnalyzingSubmission(null);
    }
  };

  // Unified view report function for both professor documents and student submissions
  const handleViewReport = (item) => {
    console.log("Viewing report for item:", item);

    if (!item || !item.id) {
      toast.error("Invalid item data");
      return;
    }

    // Determine if this is a submission or a document
    const isSubmission = !!item.submissionSlotId || !!item.documentId;
    const endpoint = isSubmission
      ? `${API_URL}/api/submissions/${item.id}`
      : `${API_URL}/api/documents/${item.id}`;

    console.log(
      `Fetching ${
        isSubmission ? "submission" : "document"
      } data from: ${endpoint}`
    );

    // Fetch the item with the latest results
    fetch(endpoint)
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Error fetching ${isSubmission ? "submission" : "document"}: ${
              response.status
            }`
          );
        }
        return response.json();
      })
      .then((data) => {
        console.log(
          `Fetched ${isSubmission ? "submission" : "document"} data:`,
          data
        );

        // For submissions, we might need to fetch the document
        if (isSubmission && !data.results && data.documentId) {
          // If submission has no results directly, try to fetch the document
          return fetch(`${API_URL}/api/documents/${data.documentId}`)
            .then((docResponse) => {
              if (!docResponse.ok) {
                throw new Error(
                  `Error fetching document: ${docResponse.status}`
                );
              }
              return docResponse.json();
            })
            .then((docData) => {
              if (!docData.results) {
                throw new Error("No analysis results found for this document");
              }

              // Navigate with document results
              navigate("/parsing-result", {
                state: {
                  parsingResult: {
                    ...docData.results,
                    status: "success",
                    document_name: data.documentName || docData.name,
                    document_type: "student_submission",
                    document_id: data.documentId,
                  },
                },
              });
            });
        }

        // If no results are available
        if (!data.results) {
          throw new Error(
            `No analysis results found for this ${
              isSubmission ? "submission" : "document"
            }`
          );
        }

        // Navigate with results
        navigate("/parsing-result", {
          state: {
            parsingResult: {
              ...data.results,
              status: "success",
              document_name: isSubmission ? data.documentName : data.name,
              document_type: isSubmission
                ? "student_submission"
                : "professor_document",
              document_id: isSubmission ? data.documentId : data.id,
            },
          },
        });
      })
      .catch((error) => {
        console.error("Error viewing report:", error);
        toast.error(error.message || "Error viewing report");
      });
  };

  const debugDocumentStatus = (doc) => {
    console.log("Document:", doc);
    console.log("Selected document type:", documentType);
    console.log("Status:", doc.status);
    console.log("Has results:", !!doc.results);
    console.log(
      "Is viewable:",
      doc.status === "Graded" ||
        doc.status === "Analyzed" ||
        doc.status === "Completed"
    );
    return (
      (doc.status === "Graded" ||
        doc.status === "Analyzed" ||
        doc.status === "Completed") &&
      doc.results
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

  const handleRowClick = (document) => {
    if (document.status === "Graded" && document.results) {
      navigate("/parsing-result", {
        state: { parsingResult: document.results },
      });
    } else {
      toast.error("No analysis results available");
    }
  };

  const handleDeleteSubmission = (submissionId) => {
    // Find the submission to delete
    const submission = submissions.find((sub) => sub.id === submissionId);
    if (submission) {
      // Call the existing delete function with the correct parameters
      handleDeleteClick(submission, "submission");
    } else {
      toast.error("Submission not found");
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <ToastContainer position="top-right" autoClose={5000} />

      <div className="max-w-6xl mx-auto mt-8 px-4">
        {/* Header and Statistics Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Upload Document Card */}
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            {" "}
            <h2 className="text-base font-semibold mb-3">
              Upload Document
            </h2>{" "}
            <UploadModal onUploadComplete={handleProfessorUpload} />
          </div>

          {/* Active Submissions Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold mb-4">Active Submissions</h2>
            <div className="space-y-3">
              {submissionSlots
                .filter((slot) => slot.status === "Open")
                .map((slot) => (
                  <div
                    key={slot.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{slot.name}</p>
                      <p className="text-sm text-gray-500">
                        Due: {new Date(slot.deadline).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteClick(slot, "slot")}
                      className="text-gray-400 hover:text-[#ff6464] transition-colors duration-300"
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
                ))}
            </div>
          </div>

          {/* Quick Stats Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold mb-4">Overview</h2>
            <div className="space-y-4">
              {" "}
              <div>
                <p className="text-xs text-gray-500">Total Submissions</p>
                <p className="text-xl font-semibold text-[#ff6464]">
                  {" "}
                  {submissions.length}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Pending Review</p>
                <p className="text-xl font-semibold text-[#ff6464]">
                  {submissions.filter((s) => s.status === "Submitted").length}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Student Submissions</h2>
              <button
                onClick={() => setShowCreateSubmissionModal(true)}
                className="flex items-center px-4 py-2 bg-[#ff6464] text-white rounded-lg hover:bg-[#ff4444] transition-colors duration-300"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5 mr-2"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                    clipRule="evenodd"
                  />
                </svg>
                Create New Submission
              </button>
            </div>
          </div>

          {/* Tables Section */}
          <div className="space-y-8">
            {/* Student Submissions Table */}
            <div className="bg-white rounded-lg">
              {/* Header and Filters Row */}
              <div className="flex justify-between items-center px-6 py-3 bg-white">
                <div className="flex gap-4">
                  <select
                    className="border rounded-lg py-2 px-3 text-sm w-40 truncate"
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
                    className="border rounded-lg py-2 px-3 text-sm w-40 truncate"
                    value={selectedFilter}
                    onChange={(e) => setSelectedFilter(e.target.value)}
                  >
                    <option value="all">All Status</option>
                    <option value="submitted">Pending Review</option>
                    <option value="graded">Reviewed</option>
                  </select>
                </div>

                <button
                  onClick={fetchSubmissions}
                  className="px-3 py-2 text-sm text-white bg-blue-500 rounded-md hover:bg-blue-600 transition-colors duration-300 flex items-center"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Refresh
                </button>
              </div>
              <div className="grid grid-cols-8 gap-4 px-4 py-3 bg-gray-50 text-sm font-medium text-gray-500">
                <div>STUDENT</div>
                <div>DOCUMENT</div>
                <div>SUBMISSION TYPE</div>
                <div>COURSE</div>
                <div>SUBMISSION DATE</div>
                <div>STATUS</div>
                <div>GRADE</div>
                <div>ACTIONS</div>
              </div>

              {submissions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No student submissions yet
                </div>
              ) : (
                submissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="grid grid-cols-8 gap-4 px-4 py-3 border-b text-sm text-gray-600 hover:bg-gray-50 transition-colors duration-300"
                  >
                    <div>{submission.studentName || "Unknown"}</div>
                    <div className="overflow-hidden">
                      <span
                        title={`Document ID: ${submission.documentId}`}
                        className="truncate block"
                      >
                        {submission.documentName}
                      </span>
                      <span className="text-xs text-gray-400">
                        ID: {submission.documentId}
                      </span>
                    </div>
                    <div>{submission.submissionType}</div>
                    <div>{submission.course}</div>
                    <div>
                      {submission.submissionDate
                        ? new Date(
                            submission.submissionDate
                          ).toLocaleDateString()
                        : "-"}
                    </div>
                    <div className="col-span-1 flex items-center">
                      {document.status === "Analyzing" ||
                      document.analysisInProgress ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          Submitted
                        </span>
                      ) : submission.status === "Analyzing" ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                          <span className="flex items-center">
                            <svg
                              className="animate-spin -ml-1 mr-2 h-3 w-3 text-yellow-800"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            Analyzing
                          </span>
                        </span>
                      ) : submission.status === "Failed" ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                          Failed
                        </span>
                      ) : submission.status === "Analyzed" ||
                        submission.status === "Graded" ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          Analyzed
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                          {submission.status}
                        </span>
                      )}
                    </div>
                    <div>{submission.grade ? `${submission.grade}%` : "-"}</div>
                    <div className="flex items-center space-x-2">
                      {submission.status === "Submitted" && (
                        <button
                          onClick={() => handleAnalyzeSubmission(submission)}
                          className="px-3 py-1 text-xs text-white bg-[#ff6464] rounded-md hover:bg-[#ff4444] transition-colors duration-300"
                          disabled={analyzingSubmission === submission.id}
                        >
                          {analyzingSubmission === submission.id ? (
                            <span className="flex items-center">
                              <svg
                                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                ></circle>
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                              </svg>
                              Analyzing...
                            </span>
                          ) : (
                            "Analyze"
                          )}
                        </button>
                      )}

                      {(submission.status === "Analyzed" ||
                        submission.status === "Graded") && (
                        <button
                          onClick={() => handleViewReport(submission)}
                          className="px-3 py-1 text-xs text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors duration-300"
                        >
                          View Report
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteSubmission(submission.id)}
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

        {/* Professor Documents Table */}
        <div>
          <h2 className="text-xl font-semibold mb-4">My Uploaded Documents</h2>
          <div className="bg-white rounded-lg shadow mb-8">
            {/* Header row */}
            <div className="grid grid-cols-[minmax(300px,2fr)_200px_100px_120px_250px] gap-4 px-6 py-3 bg-gray-50 text-sm font-medium text-gray-500">
              <div>DOCUMENT NAME</div>
              <div>UPLOAD DATE</div>
              <div>SIZE</div>
              <div>STATUS</div>
              <div className="text-center">ACTIONS</div>
            </div>

            {/* Table rows */}
            {professorDocuments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No documents uploaded yet
              </div>
            ) : (
              professorDocuments.map((doc) => {
                const isViewable = debugDocumentStatus(doc);

                return (
                  <div
                    key={doc.id}
                    className="grid grid-cols-[minmax(300px,2fr)_200px_100px_120px_250px] gap-4 px-6 py-4 border-b text-sm text-gray-600 hover:bg-gray-50 transition-colors duration-300"
                  >
                    <div className="flex items-center min-w-0">
                      {" "}
                      {/* Add min-w-0 to enable truncation */}
                      <span
                        className="text-blue-600 hover:underline cursor-pointer truncate"
                        title={doc.name}
                      >
                        {doc.name}
                      </span>
                      {(isViewable || doc.status === "Completed") && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 ml-2 flex-shrink-0 text-green-500" // Add flex-shrink-0
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                    <div className="truncate">
                      {doc.uploadDate
                        ? new Date(doc.uploadDate).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                          })
                        : "-"}
                    </div>
                    <div className="truncate">{doc.size}</div>
                    <div>
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                          doc.status === "Completed" || doc.status === "Graded"
                            ? "bg-green-100 text-green-800"
                            : doc.status === "Analyzing"
                            ? "bg-blue-100 text-blue-800"
                            : doc.status === "Failed"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {doc.status === "Analyzing" && (
                          <svg
                            className="animate-spin h-3 w-3"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                        )}
                        {doc.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-end gap-2 w-[250px]">
                      {isViewable || doc.status === "Completed" ? (
                        <>
                          <button
                            onClick={() => handleViewReport(doc)}
                            className="px-3 py-1 text-xs text-white bg-green-600 rounded-md hover:bg-green-700 whitespace-nowrap"
                          >
                            View Report
                          </button>
                          <button
                            onClick={() => handleAnalyzeClick(doc)}
                            className="px-3 py-1 text-xs text-white bg-[#ff6464] rounded-md hover:bg-[#ff4444] whitespace-nowrap"
                          >
                            Re-analyze
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="flex-1"></div>
                          <button
                            onClick={() => handleAnalyzeClick(doc)}
                            className="px-3 py-1 text-xs text-white bg-[#ff6464] rounded-md hover:bg-[#ff4444] whitespace-nowrap"
                          >
                            Analyze
                          </button>
                        </>
                      )}
                      <button
                        onClick={() =>
                          handleDeleteClick(doc, "professor_document")
                        }
                        className="text-gray-400 hover:text-[#ff6464] flex-shrink-0 transition-colors duration-300"
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
              })
            )}
          </div>
        </div>

        {/* Modals */}
        <CreateSubmissionModal
          isOpen={showCreateSubmissionModal}
          onClose={() => setShowCreateSubmissionModal(false)}
          onSubmit={handleCreateSubmissionSlot}
        />

        <DeleteConfirmationModal />

        {/* Document Type Selection Modal */}
        {showDocTypeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-md w-full m-4">
              <h2 className="text-xl font-semibold mb-4">
                Select Document Type
              </h2>
              <div className="space-y-4">
                <button
                  onClick={() => handleDocTypeSelection("SRS")}
                  className="w-full p-4 text-left border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Software Requirements Specification (SRS)
                </button>
                <button
                  onClick={() => handleDocTypeSelection("SDD")}
                  className="w-full p-4 text-left border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Software Design Document (SDD)
                </button>
              </div>
              <div className="flex justify-end mt-4">
                <button
                  onClick={() => setShowDocTypeModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Analysis Modal */}
        {showAnalysisModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-2xl w-full m-4">
              <h2 className="text-xl font-semibold mb-4">
                {selectedDocument && selectedDocument.submissionSlotId
                  ? `Analyze ${documentType} Document: ${
                      selectedDocument.documentName || selectedDocument.name
                    }`
                  : `Select ${documentType} Analyses to Perform`}
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
                  onClick={() => {
                    setShowAnalysisModal(false);
                    setDocumentType(null);
                  }}
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
