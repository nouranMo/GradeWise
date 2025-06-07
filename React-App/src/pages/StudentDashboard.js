import { useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback, Fragment } from "react";
import { toast } from "react-toastify";
import { useDropzone } from "react-dropzone";
import { Dialog, Transition } from "@headlessui/react";
import Navbar from "components/layout/Navbar/Navbar";
import { useAuth } from "contexts/AuthContext";
import config from "../config";

// API URL constant
const API_URL = config.API_URL;

const StudentDashboard = () => {
  const { user } = useAuth();
  const [submissionSlots, setSubmissionSlots] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [studentInfo, setStudentInfo] = useState(null);
  const [courses, setCourses] = useState([]);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackSubmission, setFeedbackSubmission] = useState(null);
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

      console.log("Fetching submission slots...");

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
        console.log("Raw submission slots data:", data);

        // Process the slots data to ensure hasSubmitted is correctly set
        const processedData = data.map((slot) => {
          // Explicitly check if this slot has a submission
          const hasSubmission =
            !!slot.submission &&
            (slot.submission.id ||
              slot.submission._id ||
              slot.submission.documentId);

          return {
            ...slot,
            hasSubmitted: hasSubmission || slot.hasSubmitted || false,
            submission: slot.submission
              ? {
                  ...slot.submission,
                  // Ensure status is set if missing
                  status: slot.submission.status || "Submitted",
                }
              : null,
          };
        });

        console.log("Processed submission slots data:", processedData);
        setSubmissionSlots(processedData);
      } else {
        throw new Error("Failed to fetch available submission slots");
      }

      // Also fetch the student's submitted documents to ensure we have the latest status
      const submissionsResponse = await fetch(
        `${API_URL}/api/student/submissions`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (submissionsResponse.ok) {
        const submissionsData = await submissionsResponse.json();
        console.log("Student's submissions:", submissionsData);

        // Cross-reference submissions with slots to ensure consistency
        if (Array.isArray(submissionsData) && submissionsData.length > 0) {
          setSubmissionSlots((prevSlots) => {
            const updatedSlots = [...prevSlots];

            // For each submission, find the matching slot and update it
            submissionsData.forEach((submission) => {
              const slotIndex = updatedSlots.findIndex(
                (slot) => slot.slot.id === submission.submissionSlotId
              );

              if (slotIndex !== -1) {
                console.log(
                  `Found matching slot for submission ${submission.id}, updating status`
                );
                updatedSlots[slotIndex] = {
                  ...updatedSlots[slotIndex],
                  hasSubmitted: true,
                  submission: {
                    ...submission,
                    status: submission.status || "Submitted",
                  },
                };
              }
            });

            return updatedSlots;
          });
        }
      }
    } catch (error) {
      console.error("Error fetching submission slots:", error);
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchStudentInfo();
    fetchStudentCourses();
    fetchSubmissionSlots();
  }, [fetchStudentInfo, fetchStudentCourses, fetchSubmissionSlots]);

  const handleSlotClick = (slot) => {
    // Log the slot data for debugging
    console.log("Slot clicked:", slot);
    console.log("Has submitted:", slot.hasSubmitted);
    if (slot.submission) {
      console.log("Submission status:", slot.submission.status);
    }

    if (slot.hasSubmitted) {
      if (slot.submission && slot.submission.status === "Graded") {
        // If graded, show feedback modal
        setFeedbackSubmission(slot.submission);
        setShowFeedbackModal(true);
      } else {
        // If already submitted but not graded, show info with status
        const status = slot.submission?.status || "Submitted";
        toast.info(`Your submission is currently in ${status} status`);
      }
    } else {
      // Open upload modal for submission
      setSelectedSlot(slot);
      setIsModalOpen(true);
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
        {/* Course Overview Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Enrolled Courses */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">Enrolled Courses</h2>
            <div
              className="space-y-3 overflow-y-auto pr-1"
              style={{ height: "250px" }}
            >
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="p-3 border border-gray-100 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{course.name}</span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      {course.code}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recently Submitted */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">Recently Submitted</h2>
            {submissionSlots.filter((slot) => slot.hasSubmitted).length ===
            0 ? (
              <p className="text-sm text-gray-500">No submissions yet</p>
            ) : (
              <div
                className="space-y-3 overflow-y-auto pr-1"
                style={{ height: "250px" }}
              >
                {submissionSlots
                  .filter((slot) => slot.hasSubmitted)
                  .map((slot) => (
                    <div
                      key={slot.slot.id}
                      className="p-3 border border-gray-100 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-medium">
                          {slot.slot.name}
                        </span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          {slot.slot.course}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        Submitted:{" "}
                        {new Date(
                          slot.submission?.submissionDate ||
                            slot.submission?.lastModified ||
                            slot.submission?.createdAt ||
                            slot.submission?.submitDate ||
                            slot.submission?.date
                        ).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}{" "}
                        at{" "}
                        {new Date(
                          slot.submission?.submissionDate ||
                            slot.submission?.lastModified ||
                            slot.submission?.createdAt ||
                            slot.submission?.submitDate ||
                            slot.submission?.date
                        ).toLocaleTimeString("en-GB", {
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Upcoming Deadlines */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">Upcoming Deadlines</h2>
            <div
              className="space-y-3 overflow-y-auto pr-1"
              style={{ height: "250px" }}
            >
              {submissionSlots
                .filter((slot) => !slot.hasSubmitted)
                .map((slot) => (
                  <div
                    key={slot.slot.id}
                    className="p-3 border border-gray-100 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-medium break-words">
                        {slot.slot.name}
                      </span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        {slot.slot.course}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      Due:{" "}
                      {new Date(slot.slot.deadline).toLocaleDateString(
                        "en-GB",
                        {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        }
                      )}{" "}
                      -{" "}
                      {new Date(slot.slot.deadline).toLocaleTimeString(
                        "en-GB",
                        {
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        }
                      )}
                    </div>
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
              className="border rounded-lg px-4 py-2 pr-10 focus:ring-1 focus:ring-[#FF6464] focus:border-transparent"
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
          }}
          selectedSlot={selectedSlot}
          fetchSubmissionSlots={fetchSubmissionSlots}
          setSubmissionSlots={setSubmissionSlots}
        />

        {/* Feedback Modal */}
        {showFeedbackModal && feedbackSubmission && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowFeedbackModal(false)} // Close when clicking outside
          >
            <div
              className="bg-white p-6 rounded-lg max-w-lg w-full m-4 overflow-auto max-h-[90vh]"
              onClick={(e) => e.stopPropagation()} // Prevent clicks inside modal from closing it
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setShowFeedbackModal(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    setShowFeedbackModal(false);
                  }
                }}
              >
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-semibold">Submission Feedback</h2>
                  <button
                    type="button"
                    onClick={() => setShowFeedbackModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                <div className="mb-4 pb-4 border-b">
                  <p className="text-sm text-gray-500">
                    Document:{" "}
                    {feedbackSubmission.fileName || "Submitted Document"}
                  </p>
                  <p className="text-sm text-gray-500">
                    Type: {feedbackSubmission.submissionType || "-"}
                  </p>
                  <p className="text-sm text-gray-500">
                    Submitted:{" "}
                    {feedbackSubmission.lastModified
                      ? new Date(
                          feedbackSubmission.lastModified
                        ).toLocaleString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })
                      : "-"}
                  </p>
                </div>

                <div className="mb-6">
                  <div
                    className={`p-4 rounded-lg mb-4 ${
                      feedbackSubmission.grade >= 80
                        ? "bg-green-50"
                        : feedbackSubmission.grade >= 50
                        ? "bg-yellow-50"
                        : "bg-red-50"
                    }`}
                  >
                    <div className="flex items-center mb-2">
                      <h3
                        className={`text-lg font-semibold ${
                          feedbackSubmission.grade >= 80
                            ? "text-green-800"
                            : feedbackSubmission.grade >= 50
                            ? "text-yellow-800"
                            : "text-red-800"
                        }`}
                      >
                        Grade
                      </h3>
                      <div
                        className={`ml-auto text-lg font-bold px-3 py-1 rounded-full ${
                          feedbackSubmission.grade >= 80
                            ? "bg-green-100 text-green-800"
                            : feedbackSubmission.grade >= 50
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {feedbackSubmission.grade}%
                      </div>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                      <div
                        className={`h-2.5 rounded-full ${
                          feedbackSubmission.grade >= 80
                            ? "bg-green-500"
                            : feedbackSubmission.grade >= 50
                            ? "bg-yellow-500"
                            : "bg-red-800"
                        }`}
                        style={{ width: `${feedbackSubmission.grade}%` }}
                      ></div>
                    </div>
                  </div>

                  {feedbackSubmission.feedback && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">
                        Professor Feedback
                      </h3>
                      <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-line text-gray-700">
                        {feedbackSubmission.feedback}
                      </div>
                    </div>
                  )}

                  {!feedbackSubmission.feedback && (
                    <p className="text-gray-500 italic">
                      No detailed feedback provided.
                    </p>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Submission Slot Card Component
const SubmissionSlotCard = ({ slotData, onSlotClick }) => {
  const { slot, hasSubmitted, submission } = slotData;

  // Debug log in render to see what's coming in
  console.log(`Rendering slot card for ${slot.name}:`, {
    slotId: slot.id,
    hasSubmitted,
    submission,
    submissionStatus: submission?.status,
  });

  // Determine status badge content and style
  const getStatusBadge = () => {
    // Debug the check we're using
    console.log(`Status badge check for ${slot.name}:`, {
      hasSubmitted,
      submissionStatus: submission?.status,
    });

    if (!hasSubmitted && !submission) {
      console.log(`Slot ${slot.name} has no submission`);
      return null;
    }

    let bgColor = "bg-green-100";
    let textColor = "text-green-800";
    let statusText = "Submitted";

    if (submission && submission.status) {
      console.log(`Slot ${slot.name} has status:`, submission.status);

      if (submission.status === "Analyzing") {
        bgColor = "bg-yellow-100";
        textColor = "text-yellow-800";
        statusText = "Analyzing";
      } else if (submission.status === "Analyzed") {
        bgColor = "bg-blue-100";
        textColor = "text-blue-800";
        statusText = "Analyzed";
      } else if (submission.status === "Graded") {
        bgColor = "bg-green-200";
        textColor = "text-green-800";
        statusText = "Graded";
      }
    } else {
      console.log(`Slot ${slot.name} has default submitted status`);
    }

    return (
      <span
        className={`${bgColor} ${textColor} text-xs px-2 py-1 rounded-full`}
      >
        {statusText}
      </span>
    );
  };

  // Use card styling based on submission status
  const getCardStyling = () => {
    if (hasSubmitted || submission) {
      return "border-l-4 border-green-500";
    }
    return "hover:shadow-lg transition-shadow cursor-pointer";
  };

  return (
    <div
      className={`bg-white rounded-lg shadow p-6 cursor-pointer ${getCardStyling()}`}
      onClick={() => onSlotClick(slotData)}
    >
      <div className="mb-4">
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-semibold">{slot.name}</h3>
          {getStatusBadge()}
        </div>
        <p className="text-sm text-gray-500">{slot.course}</p>
        <p className="text-sm text-gray-500">
          Due:{" "}
          {slot.deadline
            ? `${new Date(slot.deadline).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })} - ${new Date(slot.deadline).toLocaleTimeString("en-GB", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              })}`
            : "No deadline"}
        </p>
      </div>

      {hasSubmitted || submission ? (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-sm font-medium text-gray-700">Your submission:</p>
          {submission && (
            <>
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
              <p className="text-xs text-gray-500 mt-1">
                Type: {submission?.submissionType || "-"}
              </p>

              {/* Display status information */}
              {submission.status && submission.status !== "Graded" && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-gray-700">
                    Status: {submission.status}
                  </p>
                  {submission.status === "Analyzing" && (
                    <div className="w-full bg-gray-200 h-1 mt-1">
                      <div
                        className="bg-yellow-500 h-1 animate-pulse"
                        style={{ width: "60%" }}
                      ></div>
                    </div>
                  )}
                </div>
              )}

              {/* Display grade information if submission is graded */}
              {submission.status === "Graded" && (
                <div
                  className={`mt-3 p-3 rounded-lg ${
                    submission.grade >= 80
                      ? "bg-green-50"
                      : submission.grade >= 50
                      ? "bg-yellow-50"
                      : "bg-red-50"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">
                      Grade:
                    </span>
                    <span
                      className={`text-sm font-bold ${
                        submission.grade >= 80
                          ? "text-green-600"
                          : submission.grade >= 50
                          ? "text-yellow-600"
                          : "text-red-600"
                      }`}
                    >
                      {submission.grade}%
                    </span>
                  </div>

                  {submission.feedback && (
                    <div className="mt-2">
                      <p className="text-sm font-medium text-gray-700">
                        Feedback:
                      </p>
                      <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">
                        {submission.feedback}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
          {!submission && (
            <div className="flex items-center mt-2 text-gray-600">
              <span className="text-sm">Document submitted</span>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-sm text-[#ff6464] flex items-center">
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
  fetchSubmissionSlots,
  setSubmissionSlots,
}) => {
  const [file, setFile] = useState(null);
  const [uploadingAndSubmitting, setUploadingAndSubmitting] = useState(false);

  // Reset file when selectedSlot changes or modal opens/closes
  useEffect(() => {
    setFile(null);
  }, [selectedSlot, isOpen]);

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setFile(file);
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

  const handleUploadAndSubmit = async () => {
    if (!file) {
      toast.error("Please select a file to upload");
      return;
    }

    // Make sure we have a selectedSlot
    if (!selectedSlot || !selectedSlot.slot) {
      toast.error("No submission slot selected");
      return;
    }

    try {
      setUploadingAndSubmitting(true);

      // Upload the file directly
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Authentication required");
        return;
      }

      // Create FormData for file upload
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", file.name);

      // Use the student-specific document upload endpoint
      const uploadResponse = await fetch(`${API_URL}/api/student/documents`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || "Document upload failed");
      }

      // Extract document data including ID
      const uploadData = await uploadResponse.json();
      console.log("Document upload response:", uploadData);

      if (!uploadData.document) {
        console.error(
          "Document upload error: Missing document in response",
          uploadData
        );
        throw new Error("Document upload failed: Invalid server response");
      }

      // Get the document object and its ID
      const document = uploadData.document;
      // Make sure we're using the correct ID field (_id or id depending on server response)
      const documentId = document._id || document.id;

      console.log("Document details:", document);
      console.log("Using document ID for submission:", documentId);

      if (!documentId) {
        console.error("Error: No document ID found in upload response");
        throw new Error("Document upload successful but no ID was returned");
      }

      // Get submission type directly from the currently selected slot
      const submissionType = selectedSlot.slot.submissionType || "SRS";

      // Prepare submission data with all needed fields
      const submissionData = {
        documentId: documentId,
        submissionType: submissionType,
        fileName: file.name,
        // Include critical document details that need to be associated with the submission
        documentName: document.name,
        documentPath: document.filePath,
        documentSize: document.fileSize,
        documentContentType: document.contentType,
        // Make sure to include the submission slot ID
        submissionSlotId: selectedSlot.slot.id,
        // Add both ID formats to ensure compatibility
        _id: document._id,
        id: document.id || document._id,
        // These fields ensure the submission has all necessary document info
        document: {
          _id: document._id,
          id: document.id || document._id,
          name: document.name,
          filePath: document.filePath,
          fileSize: document.fileSize,
          contentType: document.contentType,
          userId: document.userId,
        },
        // Add status explicitly
        status: "Submitted",
      };

      console.log("Submitting data:", submissionData);

      // Submit the document to the slot
      const submitResponse = await fetch(
        `${API_URL}/api/student/submissions/slots/${selectedSlot.slot.id}/submit`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(submissionData),
        }
      );

      if (!submitResponse.ok) {
        const submitError = await submitResponse.json();
        throw new Error(submitError.error || "Submission failed");
      }

      const submitData = await submitResponse.json();
      console.log("Submission response:", submitData);

      // Verify the submission contains the document ID
      if (submitData.submission) {
        console.log("Created submission:", submitData.submission);
        console.log(
          "Submission document ID:",
          submitData.submission.documentId
        );

        if (!submitData.submission.documentId) {
          console.warn("Warning: Submission created without document ID!");
        }
      }

      toast.success("Document uploaded and submitted successfully!");
      resetModal();

      // Create a complete submission object that includes all needed fields
      const completeSubmission = {
        ...submissionData,
        ...(submitData.submission || {}),
        // Ensure these critical fields are set
        status: "Submitted",
        submissionSlotId: selectedSlot.slot.id,
        documentId: documentId,
        fileName: file.name,
        submissionType: submissionType,
      };

      console.log(
        "Complete submission object for UI update:",
        completeSubmission
      );

      // If we have access to setSubmissionSlots, update the submission slots immediately
      if (setSubmissionSlots) {
        setSubmissionSlots((prev) => {
          return prev.map((slot) => {
            if (slot.slot.id === selectedSlot.slot.id) {
              console.log(`Updating slot ${slot.slot.id} to show as submitted`);
              // Create updated slot with submission information
              return {
                ...slot,
                hasSubmitted: true,
                submission: completeSubmission,
              };
            }
            return slot;
          });
        });
      }

      // Also refresh the submission slots list from server
      await fetchSubmissionSlots();
    } catch (error) {
      console.error("Error uploading and submitting:", error);
      toast.error(error.message);
    } finally {
      setUploadingAndSubmitting(false);
    }
  };

  const resetModal = () => {
    setFile(null);
    onClose();
  };

  if (!isOpen || !selectedSlot) return null;

  // Get submission type directly from the currently selected slot
  // This ensures it's always up-to-date with the current selection
  const submissionType = selectedSlot?.slot?.submissionType || "SRS";

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
                  Upload and Submit Document for {selectedSlot?.slot.name}
                </Dialog.Title>
                <div className="mt-2">
                  <div className="text-sm text-gray-500">
                    <p>{selectedSlot?.slot.course}</p>
                    <p>
                      Due:{" "}
                      {selectedSlot?.slot.deadline
                        ? `${new Date(
                            selectedSlot.slot.deadline
                          ).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })} - ${new Date(
                            selectedSlot.slot.deadline
                          ).toLocaleTimeString("en-GB", {
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          })}`
                        : "No deadline"}
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assignment
                    </label>
                    <div className="w-full border rounded-lg px-3 py-2 bg-gray-50 text-gray-700">
                      {selectedSlot?.slot?.name || "Selected Assignment"}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">
                      Upload your document:
                    </h4>
                    {file ? (
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
                            className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors duration-300"
                            onClick={() => setFile(null)}
                            disabled={uploadingAndSubmitting}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
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
                          <p className="text-blue-500">Drop the file here...</p>
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
                    )}
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
                    onClick={resetModal}
                    disabled={uploadingAndSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-white bg-[#ff6464] hover:bg-[#ff4444] rounded-md disabled:opacity-50 transition-colors duration-300"
                    onClick={handleUploadAndSubmit}
                    disabled={!file || uploadingAndSubmitting}
                  >
                    {uploadingAndSubmitting
                      ? "Uploading & Submitting..."
                      : "Upload & Submit"}
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
