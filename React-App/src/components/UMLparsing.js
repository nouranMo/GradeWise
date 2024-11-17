import React from 'react';
import Navbar from './Navbar';
import { Link } from 'react-router-dom';

function UMLparsing() {
	return (
		<div className="relative h-screen p-0 m-0">
			{/* Background Layer */}
			<div className="absolute inset-0 bg-sky-900"></div>
			<div className="absolute bg-sky-500 w-72 h-72 rounded-full opacity-40 blur-3xl top-10 left-10"></div>
			<div className="absolute bg-sky-700 w-64 h-64 rounded-full opacity-40 blur-3xl bottom-10 right-10"></div>

			{/* Page Content */}
			<Navbar />
			<form className="relative z-10 flex flex-col justify-center items-center gap-6 mt-10 p-6 bg-white bg-opacity-20 rounded-lg shadow-lg w-80 mx-auto">
				<label className="text-sky-100 text-lg font-poppins">Image</label>
				<input
				type="file"
				accept="image/*"
				className="border border-solid border-sky-300 bg-transparent text-sky-100 p-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-sky-500"
				/>
				<label className="text-sky-100 text-lg font-poppins">Text File</label>
				<input
				type="file"
				accept=".txt"
				className="border border-solid border-sky-300 bg-transparent text-sky-100 p-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-sky-500"
				/>
				<Link to="/report">
					<button
					type="submit"
					className="mt-4 bg-sky-500 text-white px-4 py-2 rounded-lg hover:bg-sky-600 transition-all duration-300 w-full"
					>
					Submit
					</button>
				</Link>
			</form>
		</div>
	);
}

export default UMLparsing;