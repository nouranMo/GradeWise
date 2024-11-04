import React, { useRef, useEffect, forwardRef, useState } from "react";

const UploadOverlay = forwardRef(({ onClose }, ref) => {
    const overlayBoxRef = useRef(null);
    const fileInputRef = useRef(null);
    const [fileName, setFileName] = useState('');
    const [isDragging, setIsDragging] = useState(false);

    // Close overlay when clicking outside of the overlay box
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (overlayBoxRef.current && !overlayBoxRef.current.contains(event.target)) {
                onClose();
            }
        };

        const handleDragOver = (event) => {
            event.preventDefault(); // Prevent default behavior
            event.stopPropagation(); // Stop the event from bubbling up
            setIsDragging(true); // Indicate that a file is being dragged over the area
        };

        const handleDrop = (event) => {
            event.preventDefault(); // Prevent default behavior
            event.stopPropagation();
            setIsDragging(false); // Reset dragging state

            const files = event.dataTransfer.files; // Get the dropped files
            if (files.length > 0) {
                validateAndSetFile(files[0]); // Validate and set the first file
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("dragover", handleDragOver);
        document.addEventListener("drop", handleDrop);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("dragover", handleDragOver);
            document.removeEventListener("drop", handleDrop);
        };
    }, [onClose]);

    // Handle file selection from input
    const handleFileSelect = (event) => {
        const files = event.target.files; // Get the selected files
        if (files.length > 0) {
            validateAndSetFile(files[0]); // Validate and set the file
        }
    };

    // Validate and set file
    const validateAndSetFile = (file) => {
        if (file && file.type === 'application/pdf') {
            setFileName(file.name); // Update state with the file name
        } else {
            if (file) {
                alert('Please select a valid PDF file.'); // Alert if the file is not a PDF
            }
            setFileName(''); // Reset the file name if the selection is invalid
        }
    };

    // Handle choosing another file
    const handleChooseAnotherFile = () => {
        fileInputRef.current.click(); // Open the file explorer without resetting the file
    };

    // Drag and Drop Handlers
    const handleDragLeave = (event) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false); // Reset dragging state when the file leaves the area
    };

    return (
        <div className="flex flex-col justify-center items-center fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 z-10">
            <div
                class={`upload-overlay-box ${isDragging ? 'dragging' : ''}`}
                ref={overlayBoxRef}
                onDragLeave={handleDragLeave}
            >
                {fileName ? (
                    <>
                        <p>{fileName}</p>
                        <button class="hover:bg-sky-950 text-sm hover:text-sky-100 border border-solid border-sky-950 bg-white text-sky-950 mt-10" onClick={handleChooseAnotherFile}>
                            Choose Another File
                        </button>
                    </>
                ) : (
                    <>
                        <p className="drag-drop-p">Drag & Drop to upload</p>
                        <p className="or-p">or</p>
                        <button class="hover:bg-sky-950 hover:text-sky-100 border border-solid border-sky-950 bg-white text-sky-950" onClick={() => fileInputRef.current.click()}>
                            Browse files
                        </button>
                    </>
                )}
                <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: "none" }} // Hide the input visually
                    onChange={handleFileSelect}
                    accept=".pdf" // Limit to PDF files only
                />
            </div>
        </div>
    );
});

export default UploadOverlay;