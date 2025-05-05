import { useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback, Fragment } from "react";
import { toast } from "react-toastify";
import { useDropzone } from "react-dropzone";
import { Dialog, Transition } from "@headlessui/react";
import Navbar from "components/layout/Navbar/Navbar";
import { useAuth } from "contexts/AuthContext";

// API URL constant
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8080";

const StudentDashboard = () => {
  const { user } = useAuth();
  const [submissionSlots, setSubmissionSlots] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [uploadedDocument, setUploadedDocument] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [submittingDocument, setSubmittingDocument] = useState(false);
  const [studentInfo, setStudentInfo] = useState(null);
  const [courses, setCourses] = useState([]);
  const [submissionType, setSubmissionType] = useState("SRS");
  const navigate = useNavigate();

  // Fetch student information
  const fetchStudentInfo = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`${API_URL}/api/student/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStudentInfo(data);
      }
    } catch (error) {
      console.error("Error fetching student info:", error);
    }
  }, []);

  // Fetch student's courses
  const fetchStudentCourses = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`${API_URL}/api/student/courses`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCourses(data);
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
  }, []);

  // Fetch available submission slots for the student's courses
  const fetchSubmissionSlots = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Authentication required");
        navigate("/login");
        return;
      }

      const response = await fetch(
        `${API_URL}/api/student/submissions/available-slots`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSubmissionSlots(data);
      } else {
        throw new Error("Failed to fetch available submission slots");
      }
    } catch (error) {
      console.error("Error fetching submission slots:", error);
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  // Fetch student's documents
  const fetchStudentDocuments = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`${API_URL}/api/student/documents`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
    }
  }, []);

  useEffect(() => {
    fetchStudentInfo();
    fetchStudentCourses();
    fetchSubmissionSlots();
    fetchStudentDocuments();
  }, [
    fetchStudentInfo,
    fetchStudentCourses,
    fetchSubmissionSlots,
    fetchStudentDocuments,
  ]);

  // Handle file upload to create a new document
  const handleFileUpload = async (file) => {
    try {
      setUploadingDocument(true);
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Authentication required");
        return null;
      }

      // Create FormData for file upload
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", file.name);

      // Upload file as a document first
      const response = await fetch(`${API_URL}/api/student/documents`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        toast.success("Document uploaded successfully!");

        // Refresh documents list
        await fetchStudentDocuments();

        // Return the uploaded document
        return data.document;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Document upload failed");
      }
    } catch (error) {
      console.error("Error uploading document:", error);
      toast.error(error.message);
      return null;
    } finally {
      setUploadingDocument(false);
    }
  };

  // Submit document to a submission slot
  const submitDocumentToSlot = async (documentId, slotId) => {
    try {
      setSubmittingDocument(true);
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Authentication required");
        return;
      }

      const response = await fetch(
        `${API_URL}/api/student/submissions/slots/${slotId}/submit`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            documentId: documentId,
            submissionType: submissionType,
          }),
        }
      );

      if (response.ok) {
        toast.success("Document submitted successfully!");
        setIsModalOpen(false);
        setSelectedSlot(null);
        setUploadedDocument(null);
        // Refresh the submission slots list
        fetchSubmissionSlots();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Submission failed");
      }
    } catch (error) {
      console.error("Error submitting document:", error);
      toast.error(error.message);
    } finally {
      setSubmittingDocument(false);
    }
  };

  const handleSlotClick = (slot) => {
    if (slot.hasSubmitted) {
      // If already submitted, show submission details
      toast.info("You've already submitted to this assignment");
    } else {
      // Open upload modal for submission
      setSelectedSlot(slot);
      setIsModalOpen(true);
    }
  };

  const handleDocumentSelection = (document) => {
    setUploadedDocument(document);
  };

  const handleSubmitSelection = () => {
    if (uploadedDocument && selectedSlot) {
      submitDocumentToSlot(uploadedDocument.id, selectedSlot.slot.id);
    } else {
      toast.error("Please select a document to submit");
    }
  };

  // Filter slots by course
  const filteredSlots = submissionSlots.filter((slot) => {
    if (selectedCourse === "all") return true;
    return slot.slot.course === selectedCourse;
  });

  // Extract unique courses from slots
  const uniqueCourses = Array.from(
    new Set(submissionSlots.map((slot) => slot.slot.course))
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Student Profile Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-blue-600">
                {studentInfo?.firstName?.[0] || "S"}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                {studentInfo?.firstName} {studentInfo?.lastName}
              </h1>
              <p className="text-gray-600">{studentInfo?.email}</p>
              <p className="text-gray-600">
                Student ID: {studentInfo?.studentId}
              </p>
            </div>
          </div>
        </div>

        {/* Course Overview Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Enrolled Courses</h2>
            <div className="space-y-2">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="flex justify-between items-center"
                >
                  <span className="font-medium">{course.name}</span>
                  <span className="text-sm text-gray-500">{course.code}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Recent Submissions</h2>
            <div className="space-y-2">
              {submissionSlots
                .filter((slot) => slot.hasSubmitted)
                .slice(0, 3)
                .map((slot) => (
                  <div
                    key={slot.slot.id}
                    className="flex justify-between items-center"
                  >
                    <span className="font-medium">{slot.slot.name}</span>
                    <span className="text-sm text-gray-500">
                      {slot.slot.course}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Upcoming Deadlines</h2>
            <div className="space-y-2">
              {submissionSlots
                .filter((slot) => !slot.hasSubmitted)
                .slice(0, 3)
                .map((slot) => (
                  <div
                    key={slot.slot.id}
                    className="flex justify-between items-center"
                  >
                    <span className="font-medium">{slot.slot.name}</span>
                    <span className="text-sm text-gray-500">
                      {new Date(slot.slot.deadline).toLocaleDateString()}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Assignment Submissions Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Assignment Submissions</h1>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="border rounded-lg px-4 py-2"
            >
              <option value="all">All Courses</option>
              {uniqueCourses.map((course) => (
                <option key={course} value={course}>
                  {course}
                </option>
              ))}
            </select>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            </div>
          )}

          {/* Submission Slots Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSlots.map((slotData) => (
              <SubmissionSlotCard
                key={slotData.slot.id}
                slotData={slotData}
                onSlotClick={handleSlotClick}
              />
            ))}
          </div>

          {/* No Slots Message */}
          {!isLoading && filteredSlots.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No open submission slots available for your courses.
            </div>
          )}
        </div>

        {/* Upload Modal */}
        <UploadModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedSlot(null);
            setUploadedDocument(null);
          }}
          selectedSlot={selectedSlot}
          documents={documents}
          onDocumentSelect={handleDocumentSelection}
          onUploadFile={handleFileUpload}
          onSubmit={handleSubmitSelection}
          selectedDocument={uploadedDocument}
          isUploading={uploadingDocument}
          isSubmitting={submittingDocument}
          submissionType={submissionType}
          setSubmissionType={setSubmissionType}
        />
      </div>
    </div>
  );
};

// Submission Slot Card Component
const SubmissionSlotCard = ({ slotData, onSlotClick }) => {
  const { slot, hasSubmitted, submission } = slotData;

  return (
    <div
      className={`bg-white rounded-lg shadow p-6 ${
        hasSubmitted
          ? "border-l-4 border-green-500"
          : "hover:shadow-lg transition-shadow cursor-pointer"
      }`}
      onClick={() => onSlotClick(slotData)}
    >
      <div className="mb-4">
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-semibold">{slot.name}</h3>
          {hasSubmitted && (
            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
              Submitted
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500">{slot.course}</p>
        <p className="text-sm text-gray-500">
          Due:{" "}
          {slot.deadline
            ? new Date(slot.deadline).toLocaleDateString()
            : "No deadline"}
        </p>
      </div>

      {hasSubmitted ? (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-sm font-medium text-gray-700">Your submission:</p>
          {submission && (
            <div className="flex items-center mt-2 text-gray-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm truncate">
                {submission.fileName || "Document submitted"}
              </span>
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Type: {submission?.submissionType || "-"}
          </p>
        </div>
      ) : (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-sm text-blue-600 flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-1"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
                clipRule="evenodd"
              />
            </svg>
            Click to upload and submit
          </p>
        </div>
      )}
    </div>
  );
};

// Upload Modal Component
const UploadModal = ({
  isOpen,
  onClose,
  selectedSlot,
  documents,
  onDocumentSelect,
  onUploadFile,
  onSubmit,
  selectedDocument,
  isUploading,
  isSubmitting,
  submissionType,
  setSubmissionType,
}) => {
  const [file, setFile] = useState(null);
  const [uploadStep, setUploadStep] = useState("select"); // 'select', 'upload'

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setFile(file);

      // Switch to upload view
      setUploadStep("upload");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
    },
    maxFiles: 1,
  });

  const handleUploadFile = async () => {
    const uploadedDoc = await onUploadFile(file);
    if (uploadedDoc) {
      onDocumentSelect(uploadedDoc);
      setFile(null);
      setUploadStep("select");
    }
  };

  const resetModal = () => {
    setFile(null);
    setUploadStep("select");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={resetModal}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900"
                >
                  Submit Document for {selectedSlot?.slot.name}
                </Dialog.Title>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    {selectedSlot?.slot.course} - Due:{" "}
                    {selectedSlot?.slot.deadline
                      ? new Date(
                          selectedSlot.slot.deadline
                        ).toLocaleDateString()
                      : "No deadline"}
                  </p>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Submission Type
                  </label>
                  <select
                    value={submissionType}
                    onChange={(e) => setSubmissionType(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 mb-4"
                  >
                    <option value="SRS">
                      SRS (Software Requirements Specification)
                    </option>
                    <option value="SDD">SDD (Software Design Document)</option>
                  </select>

                  {uploadStep === "select" ? (
                    <>
                      {/* Document Selection Step */}
                      <div className="space-y-4">
                        {/* Existing Documents */}
                        {documents.length > 0 && (
                          <div>
                            <h4 className="font-medium text-gray-700 mb-2">
                              Select from your documents:
                            </h4>
                            <div className="max-h-52 overflow-y-auto border rounded-md divide-y">
                              {documents.map((doc) => (
                                <div
                                  key={doc.id}
                                  className={`p-3 flex items-center cursor-pointer hover:bg-gray-50 ${
                                    selectedDocument?.id === doc.id
                                      ? "bg-blue-50"
                                      : ""
                                  }`}
                                  onClick={() => onDocumentSelect(doc)}
                                >
                                  <svg
                                    className="h-5 w-5 text-gray-500 mr-2"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                    />
                                  </svg>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                      {doc.name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {new Date(
                                        doc.createdAt || doc.uploadDate
                                      ).toLocaleDateString()}
                                    </p>
                                  </div>
                                  {selectedDocument?.id === doc.id && (
                                    <svg
                                      className="h-5 w-5 text-blue-500"
                                      fill="currentColor"
                                      viewBox="0 0 20 20"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Upload New Document */}
                        <div>
                          <h4 className="font-medium text-gray-700 mb-2">
                            Or upload a new document:
                          </h4>
                          <div
                            {...getRootProps()}
                            className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
                              ${
                                isDragActive
                                  ? "border-blue-500 bg-blue-50"
                                  : "border-gray-300"
                              }`}
                          >
                            <input {...getInputProps()} />
                            {isDragActive ? (
                              <p className="text-blue-500">
                                Drop the file here...
                              </p>
                            ) : (
                              <div>
                                <p className="text-gray-600">
                                  Drag and drop a file here, or click to select
                                </p>
                                <p className="text-xs text-gray-500 mt-2">
                                  Supported formats: PDF, DOC, DOCX
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* File Upload Preview Step */}
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center">
                          <svg
                            className="h-8 w-8 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">
                              {file?.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {(file?.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 flex justify-end space-x-2">
                          <button
                            type="button"
                            className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
                            onClick={() => {
                              setFile(null);
                              setUploadStep("select");
                            }}
                            disabled={isUploading}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
                            onClick={handleUploadFile}
                            disabled={isUploading}
                          >
                            {isUploading ? "Uploading..." : "Upload Document"}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
                    onClick={resetModal}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
                    onClick={onSubmit}
                    disabled={!selectedDocument || isSubmitting}
                  >
                    {isSubmitting ? "Submitting..." : "Submit"}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default StudentDashboard;
