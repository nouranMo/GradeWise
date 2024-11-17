import React, { useState, useRef, useEffect } from 'react';
import UploadOverlay from './UploadOverlay';
import fileImage from '../images/file-light.png';
import Navbar from './Navbar';
import { Link } from 'react-router-dom';

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
            <div className="relative h-screen p-0 m-0">
                {/* Background Layer */}
                <div className="absolute inset-0 bg-sky-900 z-0"></div>
                <div className="absolute bg-sky-500 w-72 h-72 rounded-full opacity-40 blur-3xl top-10 left-10 z-0"></div>
                <div className="absolute bg-sky-700 w-64 h-64 rounded-full opacity-40 blur-3xl bottom-10 right-10 z-0"></div>

                {/* Page Content */}
                <Navbar />
                <div className="relative z-10 flex flex-col justify-center items-center">
                    <div className="flex flex-row justify-center items-center gap-5">
                        <button className="px-8 py-3 text-lg border-2 border-sky-950 bg-white text-sky-950 rounded-lg hover:bg-sky-950 hover:text-sky-100 hover:shadow-md transition duration-300">
                            <Link to={"/umlparsing"}>UML Parsing</Link>
                        </button>
                        <button className="px-8 py-3 text-lg border-2 border-sky-950 bg-white text-sky-950 rounded-lg hover:bg-sky-950 hover:text-sky-100 hover:shadow-md transition duration-300">
                            <Link to={"/sectionextraction"}>Section Extraction</Link>
                        </button>
                    </div>

                    <div className="grid grid-cols-4 gap-5 w-[60%] overflow-y-scroll mt-[6%] h-[56vh]">
                        {Array.from({ length: 100 }).map((_, index) => (
                            <div className="flex flex-col justify-center items-center gap-2 font-poppins text-xs text-sky-100" key={index}>
                                <img className="hover:cursor-pointer w-[20%]" src={fileImage} alt="document" />
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
