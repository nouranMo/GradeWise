import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';

const SubmitDocumentPage = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [submissionSlotId, setSubmissionSlotId] = useState('');

  useEffect(() => {
    // Fetch student's courses
    const fetchCourses = async () => {
      try {
        const response = await axios.get('/api/student/courses');
        setCourses(response.data);
        if (response.data.length > 0) {
          setSelectedCourse(response.data[0].id);
        }
      } catch (error) {
        console.error('Error fetching courses:', error);
        toast.error('Failed to load courses');
      }
    };

    fetchCourses();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedDocument) {
      toast.error('Please select a document');
      return;
    }
    
    if (!selectedCourse) {
      toast.error('Please select a course');
      return;
    }
    
    try {
      const response = await axios.post('/api/student/submit', {
        documentId: selectedDocument.id,
        submissionSlotId: submissionSlotId,
        submissionType: 'regular',
        courseId: selectedCourse
      });
      
      toast.success('Document submitted successfully');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error submitting document:', error);
      toast.error(error.response?.data?.error || 'Failed to submit document');
    }
  };

  return (
    <div>
      {/* Add your form here */}
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Select Course</InputLabel>
        <Select
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)}
          required
        >
          {courses.map((course) => (
            <MenuItem key={course.id} value={course.id}>
              {course.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </div>
  );
};

export default SubmitDocumentPage; 