import React, { useState } from 'react';
import Navbar from './Navbar';
import { useNavigate } from 'react-router-dom';

function UMLparsing() {
    const [image, setImage] = useState(null);
    const [text, setText] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!image || !text) {
            alert('Please provide an image and text.');
            return;
        }

        const formData = new FormData();
        formData.append('image', image);
        formData.append('paragraph', text);

        try {
            const response = await fetch('http://localhost:5000/process', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Failed to process the image.');
            }

            const result = await response.json();
            navigate('/umlreport', { state: { result } });
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to process the image.');
        }
    };

    return (
        <div className="relative h-screen p-0 m-0">
            {/* Background Layer */}
            <div className="absolute inset-0 bg-sky-900"></div>
            <div className="absolute bg-sky-500 w-72 h-72 rounded-full opacity-40 blur-3xl top-10 left-10"></div>
            <div className="absolute bg-sky-700 w-64 h-64 rounded-full opacity-40 blur-3xl bottom-10 right-10"></div>

            {/* Page Content */}
            <Navbar />
            <form
                className="relative z-10 flex flex-col justify-center items-center gap-6 mt-10 p-6 bg-white bg-opacity-20 rounded-lg shadow-lg w-80 mx-auto"
                onSubmit={handleSubmit}
            >
                <label className="text-sky-100 text-lg font-poppins">Image</label>
                <input
                    type="file"
                    accept="image/*"
                    className="border border-solid border-sky-300 bg-transparent text-sky-100 p-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-sky-500"
                    onChange={(e) => setImage(e.target.files[0])}
                />
                <label className="text-sky-100 text-lg font-poppins">Text</label>
                <textarea
                    className="border border-solid border-sky-300 bg-transparent text-sky-100 p-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-sky-500 h-[30vh]"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                />
                <button
                    type="submit"
                    className="mt-4 bg-sky-500 text-white px-4 py-2 rounded-lg hover:bg-sky-600 transition-all duration-300 w-full"
                >
                    Parse
                </button>
            </form>
        </div>
    );
}

export default UMLparsing;
