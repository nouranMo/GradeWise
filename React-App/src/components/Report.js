import React, { useState, useRef, useEffect } from 'react';
import Navbar from './Navbar';

function Report() {
    return (
        <>
            <div className="p-0 m-0 bg-gradient-to-tl from-sky-950 to-sky-600 h-screen">
                <Navbar />
                <div className="flex flex-col justify-center items-center">
                    <div className="flex flex-row w-screen">
						<div class="flex flex-col w-[50%]">
                            <div class="bg-sky-100">
							    <h2 class="text-center text-sky-950">Document Extraction</h2>
						    </div>

                            <div class="pt-5 px-10 bg-sky-100 mt-1 h-[70vh]">
                                <p class="text-sky-950">Document Text</p>
                            </div>
                        </div>

						{/* vertical line between the two divs */}
						<div class="w-[4px] opacity-0"></div>

						<div class="flex flex-col w-[50%]">
                            <div class="bg-sky-100">
							    <h2 class="text-center text-sky-950">Image Extraction</h2>
						    </div>

                            <div class="pt-5 px-10 bg-sky-100 mt-1 h-[70vh]">
                                <p class="text-sky-950">Image Text</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default Report;