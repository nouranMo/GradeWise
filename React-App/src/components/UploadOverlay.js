import React, { useRef, useEffect, forwardRef, useState } from "react";
import { Link } from "react-router-dom";

const UploadOverlay = forwardRef(({ onClose }, ref) => {
    const overlayBoxRef = useRef(null);
    const fileInputRef = useRef(null);
    const [fileNames, setFileNames] = useState([]); // Changed to an array for multiple file names
    const [isDragging, setIsDragging] = useState(false);

    // Close overlay when clicking outside of the overlay box
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (overlayBoxRef.current && !overlayBoxRef.current.contains(event.target)) {
                onClose();
            }
        };

        const handleDragOver = (event) => {
            event.preventDefault();
            event.stopPropagation();
            setIsDragging(true);
        };

        const handleDrop = (event) => {
            event.preventDefault();
            event.stopPropagation();
            setIsDragging(false);

            const files = event.dataTransfer.files;
            if (files.length > 0) {
                validateAndSetFiles(files);
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
        const files = event.target.files;
        if (files.length > 0) {
            validateAndSetFiles(files);
        }
    };

    // Validate and set files
    const validateAndSetFiles = (files) => {
        const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
        let validFiles = [];
        let invalidFiles = [];

        for (let i = 0; i < files.length; i++) {
            if (validTypes.includes(files[i].type)) {
                validFiles.push(files[i].name);
            } else {
                invalidFiles.push(files[i].name);
            }
        }

        if (invalidFiles.length > 0) {
            alert(`Please select valid PDF or image files: ${invalidFiles.join(', ')}`);
        }

        setFileNames(validFiles);
    };

    const handleChooseAnotherFile = () => {
        fileInputRef.current.click();
    };

    const handleDragLeave = (event) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);
    };

    return (
        <div className="flex flex-col justify-center items-center fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 z-10">
            <div
                className={`upload-overlay-box ${isDragging ? 'dragging' : ''}`}
                ref={overlayBoxRef}
                onDragLeave={handleDragLeave}
            >
                {fileNames.length > 0 ? (
                    <>
                        <div className="text-sm">
                            {fileNames.map((name, index) => (
                                <p key={index}>{name}</p>
                            ))}
                        </div>

                        <Link to="/report" className="w-[40%]">
                            <button className="hover:bg-sky-950 hover:text-sky-100 border border-solid border-sky-950 bg-white text-sky-950 mt-5 w-full">Upload</button>
                        </Link>

                        <p className="text-sky-950 hover:font-bold hover:cursor-pointer text-sm" onClick={handleChooseAnotherFile}>Choose another file</p>
                    </>
                ) : (
                    <>
                        <p className="drag-drop-p">Drag & Drop to upload</p>
                        <p className="or-p">or</p>
                        <button className="hover:bg-sky-950 hover:text-sky-100 border border-solid border-sky-950 bg-white text-sky-950" onClick={() => fileInputRef.current.click()}>
                            Browse files
                        </button>
                    </>
                )}
                <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: "none" }} // Hide the input visually
                    onChange={handleFileSelect}
                    accept=".pdf,.jpeg,.jpg,.png" // Accept both PDFs and images
                    multiple // Allow multiple file selection
                />
            </div>
        </div>
    );
});

export default UploadOverlay;