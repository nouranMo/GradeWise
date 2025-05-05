import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FormControl, InputLabel, Select, MenuItem, Typography, TableContainer, Table, TableHead, TableBody, TableRow, Paper, Button } from '@mui/material';

const TeacherDashboard = () => {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [submissions, setSubmissions] = useState([]);

  useEffect(() => {
    // Fetch teacher's courses
    const fetchCourses = async () => {
      try {
        const response = await axios.get('/api/teacher/courses');
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

  useEffect(() => {
    // Fetch submissions for selected course
    if (selectedCourse) {
      const fetchSubmissions = async () => {
        try {
          const response = await axios.get(`/api/teacher/courses/${selectedCourse}/submissions`);
          setSubmissions(response.data);
        } catch (error) {
          console.error('Error fetching submissions:', error);
          toast.error('Failed to load submissions');
        }
      };

      fetchSubmissions();
    }
  }, [selectedCourse]);

  const handleViewSubmission = (submissionId) => {
    // Implement the logic to view a submission
  };

  return (
    <div>
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Select Course</InputLabel>
        <Select
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)}
        >
          {courses.map((course) => (
            <MenuItem key={course.id} value={course.id}>
              {course.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Typography variant="h6" sx={{ mt: 4 }}>
        Submissions for {courses.find(c => c.id === selectedCourse)?.name || 'Selected Course'}
      </Typography>

      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Student</TableCell>
              <TableCell>Document</TableCell>
              <TableCell>Submission Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {submissions.map((submission) => (
              <TableRow key={submission.id}>
                <TableCell>{submission.userId}</TableCell>
                <TableCell>{submission.documentId}</TableCell>
                <TableCell>{new Date(submission.submissionDate).toLocaleString()}</TableCell>
                <TableCell>{submission.status}</TableCell>
                <TableCell>
                  <Button 
                    variant="contained" 
                    color="primary" 
                    onClick={() => handleViewSubmission(submission.id)}
                  >
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
};

export default TeacherDashboard; 