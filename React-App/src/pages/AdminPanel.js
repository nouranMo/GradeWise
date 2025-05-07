import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "contexts/AuthContext";
import Navbar from "components/layout/Navbar/Navbar";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from 'axios';
import {
  Container, Typography, Box, Button, TextField, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogActions, DialogContent, DialogTitle, FormControl,
  InputLabel, Select, MenuItem, Grid, Tabs, Tab, Chip, Tooltip,
  IconButton, InputAdornment, CircularProgress, FormGroup, FormControlLabel, Checkbox
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';

const handleApiError = (error, defaultMessage = 'An error occurred') => {
  console.error(defaultMessage, error);
  
  // Extract the error message from the response if available
  let errorMessage = defaultMessage;
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    errorMessage = error.response.data?.error || error.response.data?.message || error.response.statusText;
  } else if (error.request) {
    // The request was made but no response was received
    errorMessage = 'No response from server. Please check your connection.';
  } else {
    // Something happened in setting up the request that triggered an Error
    errorMessage = error.message || defaultMessage;
  }
  
  toast.error(errorMessage);
  return errorMessage;
};

const AdminPanel = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [assignedUsers, setAssignedUsers] = useState([]);

  useEffect(() => {
    // If not logged in, redirect to login
    if (!currentUser) {
      navigate("/login");
      return;
    }
    
    // If not admin, show a message and redirect
    if (currentUser.email !== "admin@gmail.com") {
      toast.error("You don't have permission to access the admin panel");
      navigate("/dashboard");
      return;
    }

    fetchUsers();
  }, [currentUser, navigate]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      console.log("Using token for admin request:", token ? "Token exists" : "No token found");
      
      const response = await fetch("http://localhost:8080/admin-api/users", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token || ""}`
        },
        credentials: "include" // Include cookies if any
      });

      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId, newRole) => {
    try {
      const response = await fetch("http://localhost:8080/admin-api/update-role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          userId,
          newRole,
          adminEmail: currentUser.email
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update role");
      }

      toast.success("User role updated successfully");
      fetchUsers(); // Refresh the user list
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error(error.message || "Failed to update role");
    }
  };

  const filteredUsers = users.filter(user => 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Fetch assigned users for role disabling
  useEffect(() => {
    const fetchAssignedUsers = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          console.error("No authentication token found");
          toast.error("Authentication required");
          return;
        }
        
        const response = await axios.get('http://localhost:8080/admin-api/courses', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const courses = response.data;
        
        // Collect all teacher and student IDs from courses
        const teacherIds = new Set();
        const studentIds = new Set();
        
        courses.forEach(course => {
          course.teacherIds?.forEach(id => teacherIds.add(id));
          course.studentIds?.forEach(id => studentIds.add(id));
        });
        
        setAssignedUsers([...teacherIds, ...studentIds]);
      } catch (error) {
        console.error('Error fetching assigned users:', error);
      }
    };
    
    fetchAssignedUsers();
  }, []);

  const handleDeleteUser = async (userId) => {
    if (window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      try {
        await axios.delete(`http://localhost:8080/admin-api/users/${userId}`, {
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("token")}`
          }
        });
        
        toast.success("User deleted successfully");
        fetchUsers(); // Refresh the user list
      } catch (error) {
        handleApiError(error, "Failed to delete user");
      }
    }
  };

  return (
    <Box>
      <Navbar />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Admin Panel
        </Typography>
        
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="User Management" />
            <Tab label="Course Management" />
          </Tabs>
        </Box>
        
        {tabValue === 0 && <UserManagement assignedUsers={assignedUsers} handleDeleteUser={handleDeleteUser} />}
        {tabValue === 1 && <CourseManagement />}
        
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored"
        />
      </Container>
    </Box>
  );
};

function UserManagement({ assignedUsers, handleDeleteUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      
      const response = await fetch("http://localhost:8080/admin-api/users", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token || ""}`
        },
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId, newRole) => {
    try {
      const response = await fetch("http://localhost:8080/admin-api/update-role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          userId,
          newRole,
          adminEmail: "admin@gmail.com"
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update role");
      }

      toast.success("User role updated successfully");
      fetchUsers();
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error(error.message || "Failed to update role");
    }
  };

  const filteredUsers = users.filter(user => 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>User Management</Typography>
        <TextField
          label="Search Users"
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ width: 300 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ boxShadow: 3 }}>
          <Table>
            <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Role</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{`${user.firstName || ''} ${user.lastName || ''}`}</TableCell>
                  <TableCell>
                    <Chip 
                      label={user.role} 
                      color={
                        user.role === "ROLE_ADMIN" ? "error" : 
                        user.role === "ROLE_TEACHER" || user.role === "PROFESSOR" ? "primary" : 
                        "success"
                      }
                      size="small"
                    />
                    {assignedUsers.includes(user.id) && (
                      <Tooltip title="User is assigned to a course and role cannot be changed">
                        <InfoIcon color="info" fontSize="small" sx={{ ml: 1 }} />
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell>
                    <FormControl sx={{ minWidth: 150 }}>
                      <Select
                        value={user.role || ""}
                        onChange={(e) => updateUserRole(user.id, e.target.value)}
                        disabled={assignedUsers.includes(user.id)}
                        size="small"
                        displayEmpty
                      >
                        <MenuItem value="" disabled>Change Role</MenuItem>
                        <MenuItem value="ROLE_STUDENT">Student</MenuItem>
                        <MenuItem value="ROLE_TEACHER">Teacher</MenuItem>
                        <MenuItem value="ROLE_ADMIN">Admin</MenuItem>
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell>
                    <IconButton 
                      color="error" 
                      onClick={() => handleDeleteUser(user.id)}
                      disabled={user.role === "ROLE_ADMIN" || user.email === "admin@gmail.com"}
                      title={user.role === "ROLE_ADMIN" ? "Cannot delete admin users" : "Delete user"}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

function CourseManagement() {
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [eligibleStudents, setEligibleStudents] = useState([]);
  const [openCourseDialog, setOpenCourseDialog] = useState(false);
  const [openAssignTeacherDialog, setOpenAssignTeacherDialog] = useState(false);
  const [openAssignStudentDialog, setOpenAssignStudentDialog] = useState(false);
  const [newCourse, setNewCourse] = useState({ name: '', code: '', description: '' });
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [courseSearchTerm, setCourseSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCourses();
    fetchTeachers();
    fetchStudents();
  }, []);

  // Filter eligible students when a course is selected
  useEffect(() => {
    if (selectedCourse) {
      // Filter out students already in the course
      const alreadyAssignedIds = selectedCourse.studentIds || [];
      const eligible = students.filter(student => {
        // Check if student is not already assigned
        if (alreadyAssignedIds.includes(student.id)) {
          return false;
        }
        
        // More flexible role check - case insensitive
        const role = (student.role || "").toUpperCase();
        return role.includes("STUDENT");
      });
      
      console.log("Eligible students:", eligible.length, "Total students:", students.length);
      console.log("Student roles:", students.map(s => s.role).join(", "));
      setEligibleStudents(eligible);
    }
  }, [selectedCourse, students]);

  const fetchCourses = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No authentication token found");
        toast.error("Authentication required");
        setLoading(false);
        return;
      }

      const response = await axios.get('http://localhost:8080/admin-api/courses', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setCourses(response.data);
    } catch (error) {
      const errorMessage = handleApiError(error, 'Failed to load courses');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No authentication token found");
        toast.error("Authentication required");
        return;
      }

      const response = await axios.get('http://localhost:8080/admin-api/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      // Filter users with teacher/professor roles
      const teacherUsers = response.data.filter(user => {
        const role = user.role ? user.role.toUpperCase() : '';
        return role.includes('TEACHER') || role.includes('PROFESSOR');
      });
      setTeachers(teacherUsers);
    } catch (error) {
      console.error('Error fetching teachers:', error);
      toast.error('Failed to load teachers');
    }
  };

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No authentication token found");
        toast.error("Authentication required");
        return;
      }

      const response = await axios.get('http://localhost:8080/admin-api/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      // Filter users with student role - more flexible check
      const studentUsers = response.data.filter(user => {
        const role = user.role ? user.role.toUpperCase() : '';
        return role.includes('STUDENT') || role === 'ROLE_STUDENT';
      });
      
      console.log("Found students:", studentUsers.length);
      setStudents(studentUsers);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to load students');
    }
  };

  // Handle checkbox change for student selection
  const handleStudentCheckboxChange = (studentId) => {
    setSelectedStudents(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  // Filter students based on search term
  const filteredEligibleStudents = eligibleStudents.filter(student =>
    student.email?.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
    (student.firstName && student.firstName.toLowerCase().includes(studentSearchTerm.toLowerCase())) ||
    (student.lastName && student.lastName.toLowerCase().includes(studentSearchTerm.toLowerCase()))
  );

  // Filter courses based on search term
  const filteredCourses = courses.filter(course =>
    course.name?.toLowerCase().includes(courseSearchTerm.toLowerCase()) ||
    course.code?.toLowerCase().includes(courseSearchTerm.toLowerCase()) ||
    course.description?.toLowerCase().includes(courseSearchTerm.toLowerCase())
  );

  const handleCreateCourse = async () => {
    if (!newCourse.name || !newCourse.code) {
      toast.warning('Course name and code are required');
      return;
    }
    
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Authentication required");
        return;
      }
      
      await axios.post('http://localhost:8080/admin-api/courses', newCourse, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setNewCourse({ name: '', code: '', description: '' });
      setOpenCourseDialog(false);
      fetchCourses();
      toast.success('Course created successfully');
    } catch (error) {
      console.error('Error creating course:', error);
      toast.error('Failed to create course: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleAssignTeacher = async () => {
    if (!selectedTeacher) {
      toast.warning('Please select a teacher to assign');
      return;
    }
    
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Authentication required");
        return;
      }
      
      await axios.post(`http://localhost:8080/admin-api/courses/${selectedCourse.id}/teachers`, {
        teacherId: selectedTeacher
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setOpenAssignTeacherDialog(false);
      setSelectedTeacher('');
      fetchCourses();
      toast.success('Teacher assigned successfully');
    } catch (error) {
      console.error('Error assigning teacher:', error);
      toast.error('Failed to assign teacher: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleAssignMultipleStudents = async () => {
    if (selectedStudents.length === 0) {
      toast.warning('Please select at least one student to assign');
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Authentication required");
        return;
      }
      
      // Create a promise for each student assignment
      const assignmentPromises = selectedStudents.map(studentId => {
        console.log("Assigning student:", studentId);
        return axios.post(`http://localhost:8080/admin-api/courses/${selectedCourse.id}/students`, {
          studentId
        }, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }).catch(error => {
          // Log individual errors but don't fail the whole batch
          console.error(`Error assigning student ${studentId}:`, error.response?.data || error.message);
          return { error: true, studentId, message: error.response?.data?.error || error.message };
        });
      });
      
      // Wait for all assignments to complete
      const results = await Promise.all(assignmentPromises);
      
      // Check for errors
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        console.error("Some students could not be assigned:", errors);
        toast.warning(`${errors.length} student(s) could not be assigned. See console for details.`);
        
        if (errors.length < selectedStudents.length) {
          toast.success(`${selectedStudents.length - errors.length} student(s) assigned successfully`);
        }
      } else {
        toast.success(`${selectedStudents.length} student(s) assigned successfully`);
      }
      
      setOpenAssignStudentDialog(false);
      setSelectedStudents([]);
      setStudentSearchTerm('');
      fetchCourses();
    } catch (error) {
      console.error('Error assigning students:', error);
      toast.error('Failed to assign students: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleRemoveTeacher = async (courseId, teacherId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Authentication required");
        return;
      }
      
      await axios.delete(`http://localhost:8080/admin-api/courses/${courseId}/teachers/${teacherId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      fetchCourses();
      toast.success('Teacher removed successfully');
    } catch (error) {
      console.error('Error removing teacher:', error);
      toast.error('Failed to remove teacher: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleRemoveStudent = async (courseId, studentId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Authentication required");
        return;
      }
      
      await axios.delete(`http://localhost:8080/admin-api/courses/${courseId}/students/${studentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      fetchCourses();
      toast.success('Student removed successfully');
    } catch (error) {
      console.error('Error removing student:', error);
      toast.error('Failed to remove student: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (window.confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          toast.error("Authentication required");
          return;
        }
        
        await axios.delete(`http://localhost:8080/admin-api/courses/${courseId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        fetchCourses();
        toast.success('Course deleted successfully');
      } catch (error) {
        console.error('Error deleting course:', error);
        toast.error('Failed to delete course: ' + (error.response?.data?.error || error.message));
      }
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2">Course Management</Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />} 
          onClick={() => setOpenCourseDialog(true)}
        >
          Create Course
        </Button>
      </Box>

      <TextField
        fullWidth
        label="Search Courses"
        variant="outlined"
        value={courseSearchTerm}
        onChange={(e) => setCourseSearchTerm(e.target.value)}
        sx={{ mb: 3 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Paper sx={{ p: 3, textAlign: 'center', bgcolor: '#fff4f4' }}>
          <Typography color="error">{error}</Typography>
          <Button 
            variant="outlined" 
            color="primary" 
            sx={{ mt: 2 }} 
            onClick={fetchCourses}
          >
            Try Again
          </Button>
        </Paper>
      ) : filteredCourses.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography>No courses found</Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {filteredCourses.map((course) => (
            <Grid item xs={12} md={6} lg={4} key={course.id}>
              <Paper 
                elevation={3} 
                sx={{ 
                  p: 2, 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  position: 'relative'
                }}
              >
                <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
                  <IconButton 
                    size="small" 
                    color="error" 
                    onClick={() => handleDeleteCourse(course.id)}
                    title="Delete Course"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
                
                <Typography variant="h6" component="h3" gutterBottom>
                  {course.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Code: {course.code}
                </Typography>
                {course.description && (
                  <Typography variant="body2" paragraph sx={{ mb: 2 }}>
                    {course.description}
                  </Typography>
                )}
                
                <Box sx={{ mt: 'auto' }}>
                  <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                    Teachers:
                  </Typography>
                  {course.teacherIds && course.teacherIds.length > 0 ? (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                      {course.teacherIds.map(teacherId => {
                        const teacher = teachers.find(t => t.id === teacherId);
                        return (
                          <Chip 
                            key={teacherId}
                            label={teacher ? teacher.email : teacherId}
                            size="small"
                            onDelete={() => handleRemoveTeacher(course.id, teacherId)}
                            sx={{ mb: 0.5 }}
                          />
                        );
                      })}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      No teachers assigned
                    </Typography>
                  )}
                  
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Students: {course.studentIds?.length || 0}
                  </Typography>
                  {course.studentIds && course.studentIds.length > 0 ? (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2, maxHeight: 100, overflow: 'auto' }}>
                      {course.studentIds.map(studentId => {
                        const student = students.find(s => s.id === studentId);
                        return (
                          <Chip 
                            key={studentId}
                            label={student ? student.email : studentId}
                            size="small"
                            onDelete={() => handleRemoveStudent(course.id, studentId)}
                            sx={{ mb: 0.5 }}
                          />
                        );
                      })}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      No students assigned
                    </Typography>
                  )}
                  
                  <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<PersonAddIcon />}
                      onClick={() => {
                        setSelectedCourse(course);
                        setOpenAssignTeacherDialog(true);
                      }}
                    >
                      Add Teacher
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<GroupAddIcon />}
                      onClick={() => {
                        setSelectedCourse(course);
                        setSelectedStudents([]);
                        setOpenAssignStudentDialog(true);
                      }}
                    >
                      Add Students
                    </Button>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create Course Dialog */}
      <Dialog open={openCourseDialog} onClose={() => setOpenCourseDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
          Create New Course
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <TextField
            autoFocus
            margin="dense"
            label="Course Name"
            fullWidth
            required
            value={newCourse.name}
            onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
            sx={{ mb: 2 }}
            error={openCourseDialog && !newCourse.name}
            helperText={openCourseDialog && !newCourse.name ? "Course name is required" : ""}
          />
          <TextField
            margin="dense"
            label="Course Code"
            fullWidth
            required
            value={newCourse.code}
            onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
            sx={{ mb: 2 }}
            error={openCourseDialog && !newCourse.code}
            helperText={openCourseDialog && !newCourse.code ? "Course code is required" : ""}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={4}
            value={newCourse.description}
            onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenCourseDialog(false)} color="inherit">Cancel</Button>
          <Button 
            onClick={handleCreateCourse} 
            variant="contained" 
            color="primary"
            disabled={!newCourse.name || !newCourse.code}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign Teacher Dialog */}
      <Dialog open={openAssignTeacherDialog} onClose={() => setOpenAssignTeacherDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
          Assign Teacher to {selectedCourse?.name}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {teachers.length === 0 ? (
            <Typography color="text.secondary" sx={{ textAlign: 'center', my: 2 }}>
              No teachers available to assign
            </Typography>
          ) : (
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Select Teacher</InputLabel>
              <Select
                value={selectedTeacher}
                onChange={(e) => setSelectedTeacher(e.target.value)}
              >
                {teachers.map((teacher) => (
                  <MenuItem key={teacher.id} value={teacher.id}>
                    {teacher.email}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenAssignTeacherDialog(false)} color="inherit">Cancel</Button>
          <Button 
            onClick={handleAssignTeacher} 
            variant="contained" 
            color="primary"
            disabled={!selectedTeacher || teachers.length === 0}
          >
            Assign
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign Student Dialog with Checklist */}
      <Dialog 
        open={openAssignStudentDialog} 
        onClose={() => {
          setOpenAssignStudentDialog(false);
          setSelectedStudents([]);
          setStudentSearchTerm('');
        }} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
          Assign Students to {selectedCourse?.name}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <TextField
            autoFocus
            margin="dense"
            label="Search Students"
            fullWidth
            value={studentSearchTerm}
            onChange={(e) => setStudentSearchTerm(e.target.value)}
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          
          {eligibleStudents.length === 0 ? (
            <Typography color="text.secondary" sx={{ textAlign: 'center', my: 2 }}>
              No eligible students available to assign
            </Typography>
          ) : filteredEligibleStudents.length === 0 ? (
            <Typography color="text.secondary" sx={{ textAlign: 'center', my: 2 }}>
              No students match your search
            </Typography>
          ) : (
            <Box sx={{ maxHeight: 300, overflow: 'auto', border: '1px solid #e0e0e0', borderRadius: 1, p: 1 }}>
              <FormGroup>
                {filteredEligibleStudents.map((student) => (
                  <FormControlLabel
                    key={student.id}
                    control={
                      <Checkbox
                        checked={selectedStudents.includes(student.id)}
                        onChange={() => handleStudentCheckboxChange(student.id)}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2">{student.email}</Typography>
                        {student.firstName && student.lastName && (
                          <Typography variant="caption" color="text.secondary">
                            {student.firstName} {student.lastName}
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary" display="block">
                          Role: {student.role}
                        </Typography>
                      </Box>
                    }
                    sx={{ mb: 1 }}
                  />
                ))}
              </FormGroup>
            </Box>
          )}
          
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2">
              {selectedStudents.length} student(s) selected
            </Typography>
            <Button 
              size="small" 
              onClick={() => setSelectedStudents(filteredEligibleStudents.map(s => s.id))}
              disabled={filteredEligibleStudents.length === 0}
            >
              Select All
            </Button>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={() => {
              setOpenAssignStudentDialog(false);
              setSelectedStudents([]);
              setStudentSearchTerm('');
            }} 
            color="inherit"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleAssignMultipleStudents} 
            variant="contained" 
            color="primary"
            disabled={selectedStudents.length === 0}
          >
            Assign {selectedStudents.length} Student(s)
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default AdminPanel; 