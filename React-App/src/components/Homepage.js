import React, { useState, useRef, useEffect } from 'react';
import UploadOverlay from './UploadOverlay';
import fileImage from '../images/file2.png';

function Homepage() {
    const [isOverlayVisible, setOverlayVisible] = useState(false);
    const overlayRef = useRef(null);

    const showOverlay = () => {
        setOverlayVisible(true);
    };

    const hideOverlay = () => {
        setOverlayVisible(false);
    };

    // Close overlay when clicking outside of it
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (overlayRef.current && !overlayRef.current.contains(event.target)) {
                hideOverlay();
            }
        };

        if (isOverlayVisible) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOverlayVisible]);

    return (
        <>
            <div className="homepage">
                <button className='upload-button' onClick={showOverlay}>Upload document</button>

                <div className='document-grid'>
                    {Array.from({ length: 13 }).map((_, index) => (
                        <div className='document-grid-item' key={index}>
                            <img className='file-image' src={fileImage} alt='document' />
                            <p>{`${index + 1} document.pdf`}</p>
                        </div>
                    ))}
                </div>
            </div>

            {isOverlayVisible && <UploadOverlay ref={overlayRef} onClose={hideOverlay} />}
        </>
    );
}

export default Homepage;