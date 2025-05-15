import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "components/layout/Navbar/Navbar";
import UploadModal from "components/UploadModal";
import { useAuth } from "../contexts/AuthContext";

import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";

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
  const [courses, setCourses] = useState([]);
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchProfessorCourses = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          console.error("No authentication token found");
          return;
        }

        const response = await fetch(`${API_URL}/api/teacher/courses`, {
          headers: {
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

    if (isOpen) {
      fetchProfessorCourses();
    }
  }, [isOpen]);

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
        <h2 className="text-md font-semibold mb-4">Create New Submission</h2>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Course*
            </label>
            <select
              value={formData.course}
              onChange={(e) => {
                setFormData({ ...formData, course: e.target.value });
                if (errors.course) {
                  setErrors({ ...errors, course: "" });
                }
              }}
              className={`w-full border rounded-lg px-3 py-2 ${
                errors.course ? "border-red-500" : "border-gray-300"
              }`}
            >
              <option value="" disabled>
                Select a course
              </option>
              {courses.map((course) => (
                <option key={course.id} value={course.code}>
                  {course.name} ({course.code})
                </option>
              ))}
            </select>
            {errors.course && (
              <p className="mt-1 text-sm text-red-500">{errors.course}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Deadline Date*
            </label>
            <input
              type="date"
              value={formData.deadline}
              onChange={(e) => {
                setFormData({ ...formData, deadline: e.target.value });
                if (errors.deadline) {
                  setErrors({ ...errors, deadline: "" });
                }
              }}
              min={getMinDate()}
              className={`w-full border rounded-lg px-3 py-2 ${
                errors.deadline ? "border-red-500" : "border-gray-300"
              }`}
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
              }`}
            />
            {errors.deadlineTime && (
              <p className="mt-1 text-sm text-red-500">{errors.deadlineTime}</p>
            )}
          </div>

          <div className="flex justify-end space-x-4">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors duration-300"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!isFormValid()}
              className="px-4 py-2 bg-[#ff6464] text-white rounded-md hover:bg-[#ff4444] transition-colors duration-300 disabled:hover:bg-[#ff6464] disabled:opacity-50"
            >
              Create
            </button>
          </div>
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
  const [filteredSubmissions, setFilteredSubmissions] = useState([]);
  const [allSubmissions, setAllSubmissions] = useState([]);
  const [showCreateSubmissionModal, setShowCreateSubmissionModal] =
    useState(false);
  const [submissionSlots, setSubmissionSlots] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteType, setDeleteType] = useState(null);
  const [professorDocuments, setProfessorDocuments] = useState([]);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [documentType, setDocumentType] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedAnalyses, setSelectedAnalyses] = useState({
    SrsValidation: false,
    ReferencesValidation: false,
    ContentAnalysis: false,
    ImageAnalysis: false,
    BusinessValueAnalysis: false,
    DiagramConvention: false,
    // SpellCheck: false,
    PlagiarismCheck: false,
    FullAnalysis: false,
  });
  const [analyzingSubmission, setAnalyzingSubmission] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [submissionToGrade, setSubmissionToGrade] = useState(null);
  const [gradeData, setGradeData] = useState({
    score: null,
    feedback: "",
  });
  const [isSubmittingGrade, setIsSubmittingGrade] = useState(false);

  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const sortDocuments = (documents) => {
    return [...documents].sort((a, b) => {
      // Sort by date in descending order (newest first)
      return new Date(b.date) - new Date(a.date);
    });
  };

  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Define fetchSubmissions function to reload submissions
  const fetchSubmissions = useCallback(async () => {
    try {
      console.log("Fetching submissions...");
      setAllSubmissions([]); // Clear existing all submissions while loading
      setIsRefreshing(true);
      toast.info("Refreshing submissions...", { autoClose: 2000 });

      // Get JWT token
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No authentication token found");
        toast.error("Authentication required");
        return;
      }

      // Fetch student submissions directly from API with professor ID filter
      const submissionsResponse = await fetch(
        `${API_URL}/api/submissions?professorId=${currentUser.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (submissionsResponse.ok) {
        const submissionData = await submissionsResponse.json();
        console.log("Fetched student submissions:", submissionData);

        // No validation - directly use the submissions
        if (Array.isArray(submissionData) && submissionData.length > 0) {
          // Process each submission to ensure it has complete document information
          const processedSubmissions = submissionData.map((submission) => {
            console.log("Processing submission:", submission);

            // Ensure each submission has the required document information
            // Handle all possible ID formats
            let documentId =
              submission.documentId ||
              submission._id ||
              (submission.document &&
                (submission.document.id || submission.document._id));

            // Always ensure documentId is set in a consistent field
            if (documentId && !submission.documentId) {
              console.log(
                `Fixing submission ${submission.id} with document ID: ${documentId}`
              );
              submission.documentId = documentId;
            }

            // Log document information for debugging
            console.log("Submission ID:", submission.id);
            console.log("Document ID:", submission.documentId);
            console.log("Document object:", submission.document);

            // Return the enhanced submission
            return submission;
          });

          // Set all submissions instead of directly setting filtered submissions
          setAllSubmissions(processedSubmissions);
          toast.success(`Found ${processedSubmissions.length} submissions`, {
            autoClose: 2000,
          });
        } else {
          console.log("No submissions found or empty array returned");
          toast.info("No submissions found", { autoClose: 2000 });
          // Keep the all submissions array empty
          setAllSubmissions([]);
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
      }
    } catch (error) {
      console.error("Error fetching submissions:", error);
      toast.error(`Failed to fetch submissions: ${error.message}`);
    } finally {
      setIsRefreshing(false);
    }
  }, [API_URL, currentUser?.id]);

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    fetchSubmissions().finally(() => {
      setTimeout(() => setIsRefreshing(false), 1000); // Small delay to ensure animation completes
    });
  };

  const fetchProfessorDocuments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No authentication token found");
        toast.error("Authentication required");
        return;
      }

      const response = await axios.get("/api/documents/professor", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setDocuments(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching professor documents:", error);
      toast.error("Failed to load documents. Please try again later.");
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        // Get JWT token
        const token = localStorage.getItem("token");
        if (!token) {
          console.error("No authentication token found");
          toast.error("Authentication required");
          return;
        }

        // Fetch professor documents with professor ID filter
        const response = await fetch(
          `${API_URL}/api/documents?professorId=${currentUser.id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

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

        // Fetch submission slots with professor ID filter
        const slotsResponse = await fetch(
          `${API_URL}/api/submissions/slots?professorId=${currentUser.id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (slotsResponse.ok) {
          const slots = await slotsResponse.json();
          console.log("Fetched submission slots:", slots);
          setSubmissionSlots(slots);
        } else {
          console.error(
            "Failed to fetch submission slots:",
            await slotsResponse.text()
          );
        }
      } catch (error) {
        console.error("Error fetching documents:", error);
        toast.error("Failed to fetch documents");
      }
    };

    if (currentUser && currentUser.id) {
      fetchDocuments();
      // Also fetch submissions when component loads
      fetchSubmissions();
    }
  }, [fetchSubmissions, currentUser]); // Add currentUser to dependencies

  // Add this effect to filter submissions whenever filters change
  useEffect(() => {
    // Start with all submissions
    let result = [...allSubmissions];

    // Apply course filter
    if (selectedCourse !== "all") {
      result = result.filter(
        (submission) =>
          submission.courseCode === selectedCourse ||
          submission.courseName === selectedCourse
      );
    }

    // Apply status filter
    if (selectedFilter !== "all") {
      if (selectedFilter === "submitted") {
        result = result.filter(
          (submission) =>
            submission.status === "Submitted" ||
            submission.status === "Analyzing"
        );
      } else if (selectedFilter === "graded") {
        result = result.filter(
          (submission) =>
            submission.status === "Analyzed" || submission.status === "Graded"
        );
      }
    }

    // Update the filtered submissions
    setSubmissions(result);
  }, [selectedCourse, selectedFilter, allSubmissions]);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 MB";
    const MB = bytes / (1024 * 1024); // Convert bytes to MB
    return MB.toFixed(2) + " MB"; // Show 2 decimal places
  };

  const handleProfessorUpload = async (uploadData) => {
    try {
      // Get JWT token
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No authentication token found");
        toast.error("Authentication required");
        return;
      }

      // Create FormData
      const formData = new FormData();
      formData.append("file", uploadData.file);
      formData.append("analyses", JSON.stringify(selectedAnalyses));
      formData.append("documentType", documentType || "SRS");
      formData.append("professorId", currentUser.id);
      console.log("Uploading document with type:", documentType);
      console.log("Professor ID:", currentUser.id);

      // Upload file to backend with auth token
      const response = await fetch(`${API_URL}/api/documents`, {
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
      // Get JWT token
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No authentication token found");
        toast.error("Authentication required");
        return;
      }

      // Create submission slot on the backend with professor ID
      const submissionData = {
        ...formData,
        professorId: currentUser.id,
      };

      const response = await fetch(`${API_URL}/api/submissions/slots`, {
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
          toast.error(
            "You are not authorized to create submission slots for this course. You must be teaching the course."
          );
          return;
        } else {
          throw new Error(
            errorData.error || "Failed to create submission slot"
          );
        }
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
    try {
      console.log("Preparing to analyze submission:", submission);

      // Make sure we have the submission ID
      if (!submission.id) {
        toast.error("Missing submission ID");
        return;
      }

      // Store the submission for analysis
      setSelectedDocument(submission);

      // Show document type selection modal first
      setShowDocTypeModal(true);

      // The rest will be handled by handleDocTypeSelection and startAnalysis
    } catch (error) {
      console.error("Error preparing submission for analysis:", error);
      toast.error("Failed to prepare submission for analysis");
    }
  };

  useEffect(() => {
    const handleClickOutside = () => {
      setActiveDropdown(null);
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  // Add this useEffect after your filtering useEffect
  useEffect(() => {
    // Extract unique courses from allSubmissions
    if (allSubmissions.length > 0) {
      // Create a Set to store unique course codes
      const uniqueCourses = new Set();

      // Collect all courses
      allSubmissions.forEach((submission) => {
        if (submission.courseCode) {
          uniqueCourses.add(submission.courseCode);
        } else if (submission.courseName) {
          uniqueCourses.add(submission.courseName);
        }
      });

      // Convert Set to array and sort
      const coursesArray = Array.from(uniqueCourses).sort();
      setAvailableCourses(coursesArray);
    }
  }, [allSubmissions]);

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
        // SpellCheck: false,
        PlagiarismCheck: false,
        FullAnalysis: false,
      });
    } else if (type === "SDD") {
      // SDD
      setSelectedAnalyses({
        SDDValidation: false,
        DiagramConvention: false,
        // SpellCheck: false,
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
      // Get JWT token
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No authentication token found");
        toast.error("Authentication required");
        return;
      }

      if (deleteType === "professor_document") {
        const response = await fetch(
          `${API_URL}/api/documents/${itemToDelete.id}`,
          {
            method: "DELETE",
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
      } else if (deleteType === "submission") {
        const response = await fetch(
          `${API_URL}/api/submissions/${itemToDelete.id}`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
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
              Authorization: `Bearer ${token}`,
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
          <h2 className="text-md font-semibold mb-6">Confirm Deletion</h2>
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
    setIsAnalyzing(true);

    try {
      // Determine if we're analyzing a submission or a professor document
      const isSubmission =
        selectedDocument &&
        (selectedDocument.submissionSlotId ||
          selectedDocument.courseId ||
          selectedDocument.studentName);

      console.log("Starting analysis for:", selectedDocument);

      if (isSubmission) {
        // SUBMISSION ANALYSIS - use submissions endpoint
        const submissionId = selectedDocument.id;
        if (!submissionId) {
          throw new Error("Missing submission ID");
        }

        console.log("Analyzing submission with ID:", submissionId);

        // Use the submission-specific endpoint
        const endpointUrl = `${API_URL}/api/submissions/${submissionId}/analyze`;
        console.log("Using submission endpoint:", endpointUrl);

        // Get the authentication token
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("Authentication token not found");
        }

        // Send request to Spring backend with selected analyses
        const response = await fetch(endpointUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            analyses: selectedAnalyses,
            documentType: documentType,
          }),
        });

        if (!response.ok) {
          let errorMessage = "Failed to start analysis";
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch (e) {
            // Ignore JSON parse errors and use default message
          }
          throw new Error(errorMessage);
        }

        // Get response data
        const responseData = await response.json();
        console.log("Analysis response:", responseData);

        // Update UI
        updateDocumentStatus(submissionId, "Analyzing", true);
        toast.success("Analysis started successfully");

        // Start polling for analysis completion
        let pollCounter = 0;
        const maxPolls = 60; // Poll for up to 5 minutes (5s * 60)
        const pollInterval = setInterval(async () => {
          try {
            pollCounter++;
            console.log(
              `Polling submission status (${pollCounter}/${maxPolls})...`
            );

            // Get the latest submission status
            const statusResponse = await fetch(
              `${API_URL}/api/submissions/${submissionId}`,
              {
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
              }
            );

            if (!statusResponse.ok) {
              console.warn("Failed to check submission status");
              return;
            }

            const submissionData = await statusResponse.json();
            console.log("Current submission status:", submissionData.status);

            // Check if analysis is complete
            if (
              submissionData.status === "Analyzed" ||
              submissionData.status === "Graded" ||
              submissionData.status === "Completed"
            ) {
              clearInterval(pollInterval);
              console.log("Analysis completed successfully!");

              // Update UI
              updateDocumentStatus(submissionId, submissionData.status, true);
              toast.success("Analysis completed successfully");

              // Refresh the submissions list
              fetchSubmissions();

              setIsAnalyzing(false);
              setShowAnalysisModal(false);
            } else if (submissionData.status === "Failed") {
              clearInterval(pollInterval);
              console.error("Analysis failed");

              // Update UI
              updateDocumentStatus(submissionId, "Failed", true);
              toast.error("Analysis failed");

              // Refresh the submissions list
              fetchSubmissions();

              setIsAnalyzing(false);
              setShowAnalysisModal(false);
            }

            // Stop polling after maximum attempts
            if (pollCounter >= maxPolls) {
              clearInterval(pollInterval);
              console.warn("Polling timeout reached");

              // Refresh anyway to get current status
              fetchSubmissions();

              setIsAnalyzing(false);
              setShowAnalysisModal(false);
            }
          } catch (error) {
            console.error("Error polling submission status:", error);
          }
        }, 5000); // Check every 5 seconds

        // Immediately close the modal
        setShowAnalysisModal(false);
      } else {
        // DOCUMENT ANALYSIS - use documents endpoint
        const documentId = selectedDocument.id || selectedDocument._id;
        if (!documentId) {
          throw new Error("Missing document ID");
        }

        console.log("Analyzing professor document with ID:", documentId);

        // Use the document-specific endpoint
        const endpointUrl = `${API_URL}/api/documents/${documentId}/analyze`;
        console.log("Using document endpoint:", endpointUrl);

        // Get the authentication token
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("Authentication token not found");
        }

        // Send request
        const response = await fetch(endpointUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            analyses: selectedAnalyses,
            documentType: documentType,
          }),
        });

        if (!response.ok) {
          let errorMessage = "Failed to start analysis";
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch (e) {
            // Ignore JSON parse errors and use default message
          }
          throw new Error(errorMessage);
        }

        const responseData = await response.json();
        console.log("Analysis response:", responseData);

        updateDocumentStatus(documentId, "Analyzing", false);
        toast.success("Analysis started successfully");

        // Start polling for analysis completion
        let pollCounter = 0;
        const maxPolls = 60; // Poll for up to 5 minutes (5s * 60)
        const pollInterval = setInterval(async () => {
          try {
            pollCounter++;
            console.log(
              `Polling document status (${pollCounter}/${maxPolls})...`
            );

            // Get the latest document status
            const statusResponse = await fetch(
              `${API_URL}/api/documents/${documentId}`,
              {
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
              }
            );

            if (!statusResponse.ok) {
              console.warn("Failed to check document status");
              return;
            }

            const documentData = await statusResponse.json();
            console.log("Current document status:", documentData.status);

            // Check if analysis is complete
            if (
              documentData.status === "Analyzed" ||
              documentData.status === "Graded" ||
              documentData.status === "Completed"
            ) {
              clearInterval(pollInterval);
              console.log("Analysis completed successfully!");

              // Update UI
              updateDocumentStatus(documentId, documentData.status, false);
              toast.success("Analysis completed successfully");

              // Refresh the document list
              fetchProfessorDocuments();

              setIsAnalyzing(false);
              setShowAnalysisModal(false);
            } else if (documentData.status === "Failed") {
              clearInterval(pollInterval);
              console.error("Analysis failed");

              // Update UI
              updateDocumentStatus(documentId, "Failed", false);
              toast.error("Analysis failed");

              // Refresh the document list
              fetchProfessorDocuments();

              setIsAnalyzing(false);
              setShowAnalysisModal(false);
            }

            // Stop polling after maximum attempts
            if (pollCounter >= maxPolls) {
              clearInterval(pollInterval);
              console.warn("Polling timeout reached");

              // Refresh anyway to get current status
              fetchProfessorDocuments();

              setIsAnalyzing(false);
              setShowAnalysisModal(false);
            }
          } catch (error) {
            console.error("Error polling document status:", error);
          }
        }, 5000); // Check every 5 seconds

        // Immediately close the modal
        setShowAnalysisModal(false);
      }
    } catch (error) {
      console.error("Error starting analysis:", error);
      toast.error(`Error starting analysis: ${error.message}`);
      setIsAnalyzing(false);
    }
  };

  // Helper function to update document status in the UI
  const updateDocumentStatus = (documentId, status, isSubmission) => {
    if (isSubmission) {
      setSubmissions((prev) =>
        prev.map((sub) => (sub.id === documentId ? { ...sub, status } : sub))
      );
    } else {
      setProfessorDocuments((prev) =>
        prev.map((doc) => (doc.id === documentId ? { ...doc, status } : doc))
      );
    }
  };

  // Unified view report function for both professor documents and student submissions
  const viewReport = async (itemId, isSubmission = false) => {
    try {
      setLoading(true);
      console.log(
        `Viewing report for ${
          isSubmission ? "submission" : "document"
        } ID: ${itemId}`
      );

      // Get the JWT token
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No authentication token found");
        toast.error("Authentication required");
        setLoading(false);
        return;
      }

      // Show initial toast
      toast.info(
        `Loading ${isSubmission ? "submission" : "document"} report...`
      );

      // Try up to 3 times if first attempt fails (might be an authentication issue)
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        attempts++;
        console.log(
          `Attempt ${attempts}/${maxAttempts} to fetch ${
            isSubmission ? "submission" : "document"
          }`
        );

        try {
          let endpointUrl;
          let itemType;

          if (isSubmission) {
            // For submissions, use the submission endpoint
            endpointUrl = `${API_URL}/api/submissions/${itemId}`;
            itemType = "submission";
          } else {
            // For professor documents, use the document endpoint
            endpointUrl = `${API_URL}/api/documents/${itemId}`;
            itemType = "document";
          }

          console.log(`Fetching ${itemType} data from: ${endpointUrl}`);

          const response = await fetch(endpointUrl, {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.status === 401) {
            console.warn("Authentication issue. Token may be expired.");
            // Wait a moment and try to refresh token (simulate)
            await new Promise((resolve) => setTimeout(resolve, 1000));
            continue; // Try again
          }

          if (!response.ok) {
            console.error(
              `Error fetching ${itemType}, status: ${response.status}`
            );
            if (attempts >= maxAttempts) {
              // Only show error on final attempt
              toast.error(
                `Could not retrieve ${itemType} details (${response.status})`
              );
              setLoading(false);
              return;
            }
            continue; // Try again if not final attempt
          }

          const data = await response.json();
          console.log(`${itemType} data:`, data);

          // Check if we have the results directly
          if (data.results && Object.keys(data.results).length > 0) {
            console.log(`Found results directly in ${itemType}:`, data.results);

            // Navigate to the results page with the data
            navigate("/parsing-result", {
              state: {
                parsingResult: {
                  ...data.results,
                  status: "success",
                  document_name: data.name || data.documentName || "Document",
                  document_type: isSubmission
                    ? "student_submission"
                    : "professor_document",
                },
              },
            });

            setLoading(false);
            return;
          }

          // If we reach here for a submission, try to get the document results
          if (isSubmission && data.documentId) {
            console.log(
              "Checking document results for submission's document ID:",
              data.documentId
            );

            const documentResponse = await fetch(
              `${API_URL}/api/documents/${data.documentId}`,
              {
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
              }
            );

            if (documentResponse.ok) {
              const documentData = await documentResponse.json();
              console.log("Document data for submission:", documentData);

              if (
                documentData.results &&
                Object.keys(documentData.results).length > 0
              ) {
                console.log(
                  "Found results in the associated document:",
                  documentData.results
                );

                // Navigate to the results page with the document data
                navigate("/parsing-result", {
                  state: {
                    parsingResult: {
                      ...documentData.results,
                      status: "success",
                      document_name: documentData.name || "Document",
                      document_type: "student_submission",
                    },
                  },
                });

                setLoading(false);
                return;
              }
            }
          }

          // If we get here with a valid response but no results, show specific message
          toast.warning(
            `No analysis results found for this ${itemType}. The analysis may have failed or not been completed yet.`
          );
          setLoading(false);
          return;
        } catch (error) {
          console.error(`Attempt ${attempts} error:`, error);
          // Only throw on final attempt
          if (attempts >= maxAttempts) {
            throw error;
          }
          // Wait a bit longer between retries
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    } catch (error) {
      console.error("Error viewing report:", error);
      toast.error(
        "Failed to retrieve analysis results. Please try again later."
      );
      setLoading(false);
    }
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

  // Handle row click for submissions
  const handleSubmissionClick = (submission) => {
    if (submission.status === "Analyzed" || submission.status === "Graded") {
      // Use the updated viewReport function with isSubmission=true
      viewReport(submission.id, true);
    } else {
      toast.info(`Submission status: ${submission.status}`);
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

  const handleGradeSubmission = (submission) => {
    // Set the submission to grade
    setSubmissionToGrade(submission);

    // Reset grade data
    setGradeData({
      score: submission.grade || 0,
      feedback: submission.feedback || "",
    });

    // Show the grade modal
    setShowGradeModal(true);
  };

  // Function to submit grade to the backend
  const submitGrade = async () => {
    try {
      setIsSubmittingGrade(true);
      console.log("Submitting grade for submission:", submissionToGrade);

      // Get JWT token
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No authentication token found");
        toast.error("Authentication required");
        setIsSubmittingGrade(false);
        return;
      }

      // Make sure score is a number
      const numericScore = Number(gradeData.score);
      if (isNaN(numericScore) || numericScore < 0 || numericScore > 100) {
        toast.error("Grade must be a number between 0 and 100");
        setIsSubmittingGrade(false);
        return;
      }

      // Prepare grade data with the correct field name the backend expects
      const formattedGradeData = {
        grade: numericScore, // Backend expects 'grade', not 'score'
        feedback: gradeData.feedback,
        status: "Graded",
      };

      console.log("Sending grade data:", formattedGradeData);

      // Send grade data to backend
      const response = await fetch(
        `${API_URL}/api/submissions/${submissionToGrade.id}/grade`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formattedGradeData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit grade");
      }

      const data = await response.json();
      console.log("Grade submission response:", data);

      // Update submission in local state
      setSubmissions((prev) =>
        prev.map((sub) =>
          sub.id === submissionToGrade.id
            ? {
                ...sub,
                status: "Graded",
                grade: numericScore,
                feedback: gradeData.feedback,
              }
            : sub
        )
      );

      toast.success("Grade submitted successfully");
      setShowGradeModal(false);
      setSubmissionToGrade(null);
      setGradeData({ score: 0, feedback: "" });

      // Refresh submissions list
      fetchSubmissions();
    } catch (error) {
      console.error("Error submitting grade:", error);
      toast.error("Failed to submit grade. Please try again later.");
    } finally {
      setIsSubmittingGrade(false);
    }
  };

  // Handle downloading a submission document
  const handleDownloadSubmission = async (submissionId) => {
    try {
      console.log("Downloading document for submission:", submissionId);

      // Get JWT token
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No authentication token found");
        toast.error("Authentication required");
        return;
      }

      // Request the file from the backend
      const response = await fetch(
        `${API_URL}/api/submissions/${submissionId}/download`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to download document");
      }

      // Get the filename from the content-disposition header if available
      let filename = `submission-${submissionId}.pdf`;
      const contentDisposition = response.headers.get("content-disposition");
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Convert the response to a blob and download it
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Document downloaded successfully");
    } catch (error) {
      console.error("Error downloading document:", error);
      toast.error("Failed to download document: " + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <ToastContainer position="top-right" autoClose={5000} />

      <div className="max-w-7xl mx-auto mt-6 px-4">
        {/* Header and Statistics Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Upload Document Card */}

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-md font-semibold mb-4">Upload Test Document</h2>
            <p className="text-sm text-gray-500 mb-4">
              Upload documents for testing and analysis. These documents will be
              saved under your account and displayed in the "Uploaded Documents"
              section.
            </p>

            <UploadModal onUploadComplete={handleProfessorUpload} />
          </div>

          {/* Active Submissions Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-md text-gray-800 font-semibold">
                Active Submissions
              </h2>
              <button
                onClick={() => setShowCreateSubmissionModal(true)}
                className="p-2 rounded-md flex items-center justify-center w-10 h-10 text-gray-600 bg-gray-100 hover:bg-white hover:shadow-lg transition-all duration-300 group"
                title="Add Submission"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-gray-600 group-hover:text-[#ff6464] transition-colors duration-300"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
            <div
              className="space-y-3 overflow-y-auto pr-1"
              style={{ height: "250px" }} // Fixed height to show approximately 3 items
            >
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
                        Due: {new Date(slot.deadline).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteClick(slot, "slot")}
                      className="p-2 rounded-md flex items-center justify-center w-10 h-10 bg-gray-50 hover:bg-white hover:shadow-lg transition-all duration-300 group"
                      title="Delete Submission"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="h-5 w-5 text-gray-600 group-hover:text-[#ff6464] transition-colors duration-300"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
            </div>
          </div>

          {/* Quick Stats Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-md text-gray-800 font-semibold mb-4">
              Overview
            </h2>
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
                <p className="text-xs text-gray-500">Pending Analysis</p>
                <p className="text-xl font-semibold text-[#ff6464]">
                  {submissions.filter((s) => s.status === "Submitted").length}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-md text-gray-800 font-semibold">
              Student Submissions
            </h2>
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
                    {availableCourses.map((course) => (
                      <option key={course} value={course}>
                        {course}
                      </option>
                    ))}
                  </select>

                  <select
                    className="border rounded-lg py-2 px-3 text-sm w-40 truncate"
                    value={selectedFilter}
                    onChange={(e) => setSelectedFilter(e.target.value)}
                  >
                    <option value="all">All Status</option>
                    <option value="submitted">Pending Analysis</option>
                    <option value="graded">Analyzed</option>
                  </select>
                </div>

                <button
                  onClick={handleRefreshClick}
                  disabled={isRefreshing}
                  className="px-12 py-2 rounded-md flex items-center justify-center gap-2 text-gray-700 border border-gray-300 bg-white hover:bg-gray-50 hover:shadow-sm transition-all duration-300 group"
                  title="Refresh"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className={`h-5 w-5 text-gray-600 transition-all duration-300 ${
                      isRefreshing
                        ? "animate-spin"
                        : "group-hover:text-[#ff6464]"
                    }`}
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.755 10.059a7.5 7.5 0 0112.548-3.364l1.903 1.903h-3.183a.75.75 0 100 1.5h4.992a.75.75 0 00.75-.75V4.356a.75.75 0 00-1.5 0v3.18l-1.9-1.9A9 9 0 003.306 9.67a.75.75 0 101.45.388zm15.408 3.352a.75.75 0 00-.919.53 7.5 7.5 0 01-12.548 3.364l-1.902-1.903h3.183a.75.75 0 000-1.5H2.984a.75.75 0 00-.75.75v4.992a.75.75 0 001.5 0v-3.18l1.9 1.9a9 9 0 0015.059-4.035.75.75 0 00-.53-.918z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm font-medium">
                    {isRefreshing ? "Refreshing..." : "Refresh"}
                  </span>
                </button>
              </div>
              <div className="grid grid-cols-[1.5fr_1.5fr_0.5fr_0.8fr_1.2fr_0.7fr_0.5fr_1.5fr] gap-6 px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500">
                <div className="flex items-center justify-center">STUDENT</div>
                <div className="flex items-center justify-center">DOCUMENT</div>
                <div className="flex items-center justify-center">SRS/SDD</div>
                <div className="flex items-center justify-center">COURSE</div>
                <div className="flex items-center justify-center">
                  SUBMISSION DATE
                </div>
                <div className="flex items-center justify-center">STATUS</div>
                <div className="flex items-center justify-center">GRADE</div>
                <div className="flex items-center justify-center">ACTIONS</div>
              </div>

              {submissions.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No student submissions yet
                </div>
              ) : (
                submissions.map((submission) => (
                  <div
                    key={submission.id}
                    // onClick={() => handleSubmissionClick(submission)}
                    className="grid grid-cols-[1.5fr_1.5fr_0.5fr_0.8fr_1.2fr_0.7fr_0.5fr_1.5fr] gap-6 px-4 py-3 border-b text-sm text-gray-600 hover:bg-gray-50 transition-colors duration-300"
                  >
                    <div
                      className="flex items-center col-span-1 justify-center"
                      title={submission.studentName}
                    >
                      <span className="whitespace-normal break-words overflow-hidden max-h-16 hyphens-auto">
                        {submission.studentName?.split(" ").join(" ")}
                      </span>
                    </div>
                    <div className="flex flex-col justify-center overflow-hidden">
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
                    <div className="flex items-center justify-center">
                      {submission.submissionType}
                    </div>
                    <div className="flex items-center justify-center">
                      {submission.courseName || submission.courseCode}
                    </div>
                    <div className="flex items-center justify-center">
                      {submission.submissionDate
                        ? new Date(
                            submission.submissionDate
                          ).toLocaleDateString()
                        : "-"}
                    </div>
                    <div className="col-span-1 flex items-center justify-center">
                      {document.status === "Analyzing" ||
                      document.analysisInProgress ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          Submitted
                        </span>
                      ) : submission.status === "Analyzing" ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          <span className="flex items-center">
                            <svg
                              className="animate-spin -ml-1 mr-2 h-3 w-3 text-blue-800"
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
                    <div className="flex items-center justify-center font-semibold">
                      {submission.grade !== null &&
                      submission.grade !== undefined
                        ? `${submission.grade}%`
                        : "-"}
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      {submission.status === "Submitted" && (
                        <div className="flex space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAnalyzeSubmission(submission);
                            }}
                            className="p-2 rounded-md flex items-center justify-center w-10 h-10 text-gray-600 bg-gray-100 hover:bg-white hover:shadow-lg transition-all duration-300 group"
                            title="Analyze"
                            disabled={analyzingSubmission === submission.id}
                          >
                            {analyzingSubmission === submission.id ? (
                              <svg
                                className="animate-spin h-5 w-5 text-gray-600 group-hover:text-[#ff6464]"
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
                            ) : (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                className="h-5 w-5 text-gray-600 group-hover:text-[#ff6464] transition-colors duration-300"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadSubmission(submission.id);
                            }}
                            className="p-2 rounded-md flex items-center justify-center w-10 h-10 text-gray-600 hover:text-[#ff6464] bg-gray-100 hover:bg-white hover:shadow-lg transition-all duration-300"
                            title="Download Document"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              className="w-5 h-5"
                            >
                              <path
                                fillRule="evenodd"
                                d="M12 2.25a.75.75 0 01.75.75v11.69l3.22-3.22a.75.75 0 111.06 1.06l-4.5 4.5a.75.75 0 01-1.06 0l-4.5-4.5a.75.75 0 111.06-1.06l3.22 3.22V3a.75.75 0 01.75-.75zm-9 13.5a.75.75 0 01.75.75v2.25a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5V16.5a.75.75 0 011.5 0v2.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V16.5a.75.75 0 01.75-.75z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>
                        </div>
                      )}

                      {(submission.status === "Analyzed" ||
                        submission.status === "Graded") && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              viewReport(submission.id, true);
                            }}
                            className="p-2 rounded-md flex items-center justify-center w-10 h-10 text-gray-600 hover:text-[#ff6464] bg-gray-100 hover:bg-white hover:shadow-lg transition-all duration-300 group"
                            title="View Report"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              className="h-5 w-5 text-gray-600 group-hover:text-[#ff6464] transition-colors duration-300"
                            >
                              <path
                                fillRule="evenodd"
                                d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625zM7.5 15a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 017.5 15zm.75 2.25a.75.75 0 000 1.5H12a.75.75 0 000-1.5H8.25z"
                                clipRule="evenodd"
                              />
                              <path d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 013.434 1.279 9.768 9.768 0 00-6.963-6.963z" />
                            </svg>
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadSubmission(submission.id);
                            }}
                            className="p-2 rounded-md flex items-center justify-center w-10 h-10 text-gray-600 hover:text-[#ff6464] bg-gray-100 hover:bg-white hover:shadow-lg transition-all duration-300"
                            title="Download Document"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              className="w-5 h-5"
                            >
                              <path
                                fillRule="evenodd"
                                d="M12 2.25a.75.75 0 01.75.75v11.69l3.22-3.22a.75.75 0 111.06 1.06l-4.5 4.5a.75.75 0 01-1.06 0l-4.5-4.5a.75.75 0 111.06-1.06l3.22 3.22V3a.75.75 0 01.75-.75zm-9 13.5a.75.75 0 01.75.75v2.25a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5V16.5a.75.75 0 011.5 0v2.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V16.5a.75.75 0 01.75-.75z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>

                          {submission.status === "Analyzed" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleGradeSubmission(submission);
                              }}
                              className="p-2 rounded-md flex items-center justify-center w-10 h-10 text-gray-600 hover:text-[#ff6464] bg-gray-100 hover:bg-white hover:shadow-lg transition-all duration-300 group"
                              title="Grade Submission"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                className="h-5 w-5 text-gray-600 group-hover:text-[#ff6464] transition-colors duration-300"
                              >
                                <path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32l8.4-8.4z" />
                                <path d="M5.25 5.25a3 3 0 00-3 3v10.5a3 3 0 003 3h10.5a3 3 0 003-3V13.5a.75.75 0 00-1.5 0v5.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5V8.25a1.5 1.5 0 011.5-1.5h5.25a.75.75 0 000-1.5H5.25z" />
                              </svg>
                            </button>
                          )}
                        </div>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(submission, "submission");
                        }}
                        className="p-2 rounded-md flex items-center justify-center w-10 h-10 text-gray-600 hover:text-[#ff6464] bg-gray-100 hover:bg-white hover:shadow-lg transition-all duration-300"
                        title="Delete"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="w-5 h-5"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z"
                            clipRule="evenodd"
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
          <h2 className="text-md font-semibold text-gray-800 mb-4">
            My Test Documents
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Documents uploaded for testing and analysis purposes.
          </p>
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="grid grid-cols-[minmax(300px,0.8fr)_200px_120px_120px_200px] gap-6 px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500">
              <div className="flex items-center justify-center">DOCUMENT</div>
              <div className="flex items-center justify-center">
                UPLOADED DATE
              </div>
              <div className="flex items-center justify-center">SIZE</div>
              <div className="flex items-center justify-center">STATUS</div>
              <div className="flex items-center justify-center gap-2">
                ACTIONS
              </div>
            </div>

            {/* Table rows */}
            {professorDocuments.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                No documents uploaded yet
              </div>
            ) : (
              professorDocuments.map((doc) => {
                const isViewable = debugDocumentStatus(doc);

                return (
                  <div
                    key={doc.id}
                    className="grid grid-cols-[minmax(300px,0.8fr)_200px_120px_120px_200px] gap-6 px-4 py-4 border-b text-xs text-gray-600 hover:bg-gray-50 transition-colors duration-300"
                  >
                    <div className="flex items-center min-w-0 justify-center">
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
                          className="h-5 w-5 ml-2 flex-shrink-0 text-green-500"
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
                    <div className="truncate flex items-center justify-center">
                      {formatDate(doc.uploadDate)}
                    </div>
                    <div
                      className="truncate flex items-center justify-center"
                      title={formatFileSize(doc.fileSize)}
                    >
                      {doc.fileSize ? formatFileSize(doc.fileSize) : "N/A"}
                    </div>
                    <div className="flex items-center justify-center">
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
                    <div className="flex items-center justify-center space-x-2">
                      {isViewable || doc.status === "Completed" ? (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              viewReport(doc.id, false);
                            }}
                            className="p-2 rounded-md flex items-center justify-center w-10 h-10 text-gray-600 hover:text-[#ff6464] bg-gray-100 hover:bg-white hover:shadow-lg transition-all duration-300 group"
                            title="View Report"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              className="h-5 w-5 text-gray-600 group-hover:text-[#ff6464] transition-colors duration-300"
                            >
                              <path
                                fillRule="evenodd"
                                d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625zM7.5 15a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 017.5 15zm.75 2.25a.75.75 0 000 1.5H12a.75.75 0 000-1.5H8.25z"
                                clipRule="evenodd"
                              />
                              <path d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 013.434 1.279 9.768 9.768 0 00-6.963-6.963z" />
                            </svg>
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAnalyzeClick(doc);
                            }}
                            className="p-2 rounded-md flex items-center justify-center w-10 h-10 text-gray-600 hover:text-[#ff6464] bg-gray-100 hover:bg-white hover:shadow-lg transition-all duration-300 group"
                            title="Re-analyze"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              className="h-5 w-5 text-gray-600 group-hover:text-[#ff6464] transition-colors duration-300"
                            >
                              <path
                                fillRule="evenodd"
                                d="M4.755 10.059a7.5 7.5 0 0112.548-3.364l1.903 1.903h-3.183a.75.75 0 100 1.5h4.992a.75.75 0 00.75-.75V4.356a.75.75 0 00-1.5 0v3.18l-1.9-1.9A9 9 0 003.306 9.67a.75.75 0 101.45.388zm15.408 3.352a.75.75 0 00-.919.53 7.5 7.5 0 01-12.548 3.364l-1.902-1.903h3.183a.75.75 0 000-1.5H2.984a.75.75 0 00-.75.75v4.992a.75.75 0 001.5 0v-3.18l1.9 1.9a9 9 0 0015.059-4.035.75.75 0 00-.53-.918z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAnalyzeClick(doc);
                            }}
                            className="p-2 rounded-md flex items-center justify-center w-10 h-10 text-gray-600 hover:text-[#ff6464] bg-gray-100 hover:bg-white hover:shadow-lg transition-all duration-300 group"
                            title="Analyze"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              className="h-5 w-5 text-gray-600 group-hover:text-[#ff6464] transition-colors duration-300"
                            >
                              <path
                                fillRule="evenodd"
                                d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>
                        </>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(doc, "professor_document");
                        }}
                        className="p-2 rounded-md flex items-center justify-center w-10 h-10 text-gray-600 hover:text-[#ff6464] bg-gray-100 hover:bg-white hover:shadow-lg transition-all duration-300"
                        title="Delete"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="w-5 h-5"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z"
                            clipRule="evenodd"
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
              <h2 className="text-md font-semibold mb-4">
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
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (
                    Object.values(selectedAnalyses).some((value) => value) &&
                    !isAnalyzing
                  ) {
                    startAnalysis();
                  }
                }}
              >
                <h2 className="text-md font-semibold mb-4">
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
                      onChange={(e) =>
                        handleFullAnalysisChange(e.target.checked)
                      }
                      className="w-5 h-5 text-[#FF4550] focus:ring-0 focus:ring-offset-0 focus:outline-none hover:cursor-pointer"
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
                          className="w-5 h-5 text-[#FF4550] focus:ring-0 focus:ring-offset-0 focus:outline-none hover:cursor-pointer"
                        />
                        <span>{key.replace(/([A-Z])/g, " $1").trim()}</span>
                      </label>
                    );
                  })}
                </div>

                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAnalysisModal(false);
                      setDocumentType(null);
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
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
              </form>
            </div>
          </div>
        )}

        {/* Grade Submission Modal */}
        {showGradeModal && submissionToGrade && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div
              className="bg-white p-6 rounded-lg max-w-md w-full m-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-semibold mb-2">Grade Submission</h2>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="grade"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Grade (0-100)
                  </label>
                  <input
                    type="number"
                    id="grade"
                    name="grade"
                    min="0"
                    max="100"
                    value={gradeData.score === null ? "" : gradeData.score}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      const inputValue = e.target.value;
                      setGradeData({
                        ...gradeData,
                        score: inputValue === "" ? null : Number(inputValue),
                      });
                    }}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor="feedback"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Feedback
                  </label>
                  <textarea
                    id="feedback"
                    name="feedback"
                    rows="4"
                    value={gradeData.feedback}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) =>
                      setGradeData({ ...gradeData, feedback: e.target.value })
                    }
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end space-x-4">
                <button
                  onClick={() => {
                    setShowGradeModal(false);
                    setSubmissionToGrade(null);
                    setGradeData({ score: 0, feedback: "" });
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={submitGrade}
                  disabled={
                    gradeData.score === null ||
                    !gradeData.feedback ||
                    isSubmittingGrade
                  }
                  className={`px-4 py-2 bg-[#ff6464] text-white rounded-md transition-colors duration-300 ease-in-out ${
                    gradeData.score === null ||
                    !gradeData.feedback ||
                    isSubmittingGrade
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-[#ff4444]"
                  }`}
                >
                  {isSubmittingGrade ? "Submitting..." : "Submit Grade"}
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
