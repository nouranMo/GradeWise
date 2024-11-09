import React, { useState, useRef, useEffect } from 'react';
import UploadOverlay from './UploadOverlay';
import fileImage from '../images/file-light.png';
import Navbar from './Navbar';

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
            <div className="p-0 m-0 bg-gradient-to-tl from-sky-950 to-sky-600 h-screen">
                <Navbar />
                <div className="flex flex-col justify-center items-center">
                    <div className="flex flex-row justify-center items-center gap-5">
                        <button className="px-10 py-3 text-lg hover:bg-sky-950 hover:text-sky-100 border border-solid border-sky-950 bg-white text-sky-950" onClick={showOverlay}>Upload Documents</button>
                    </div>

                    <div className="grid grid-cols-4 gap-5 w-[60%] overflow-y-scroll mt-[6%] h-[56vh]">
                        {Array.from({ length: 100 }).map((_, index) => (
                            <div className="flex flex-col justify-center items-center gap-2 font-poppins text-xs text-sky-100" key={index}>
                                <img className='hover:cursor-pointer w-[20%]' src={fileImage} alt='document' />
                                <p>{`document ${index + 1}.pdf`}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {isOverlayVisible && <UploadOverlay ref={overlayRef} onClose={hideOverlay} />}
        </>
    );
}

export default Homepage;