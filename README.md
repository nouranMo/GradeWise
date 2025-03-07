# GradeWise - Automated Checking and Grading Tool for Technical Documentation

## 📌 Overview
GradeWise is an AI-powered automated grading system designed to assist university professors in evaluating **Software Requirements Specification (SRS)** and **Software Design Description (SDD)** documents. It leverages **Large Language Models (LLMs)** and **Computer Vision** techniques to provide detailed, consistent, and objective assessments while significantly reducing manual effort.

## ✨ Features
- **Automated Document Grading**: Evaluates clarity, completeness, and adherence to business requirements.
- **Diagram Validation**: Uses **YOLOv8 + OpenCV** to detect and validate UML diagrams (Use Case, ER, Class, Sequence, etc.).
- **Plagiarism Checker**: Integrates the **Grammarly API** for detecting plagiarism.
- **Business Value Assessment**: LLM-driven evaluation of a project's feasibility, scalability, and alignment with business goals.
- **Reference Validator**: Checks **IEEE format correctness** using an **LLM + Google Scholar API**.
- **Self-Learning Mechanism**: Continuously improves grading accuracy based on professor feedback.
- **User Roles**:
  - **Student**: Submit documents and view grades.
  - **Professor**: Review grades, provide feedback, and download reports.

## 🏗️ Architecture
GradeWise follows a **Layered Architecture** with the backend implemented in **Spring Boot** and AI-based grading functions written in **Python**.

### **Tech Stack**
| Component       | Technology |
|----------------|------------|
| **Frontend**   | React + Tailwind CSS |
| **Backend**    | Spring Boot (Java) |
| **AI & NLP**   | Python (YOLOv8, OpenCV, LLM API) |
| **Database**   | (TBD) |
| **Version Control** | GitHub |
| **IDE**        | Visual Studio |

## 🚀 Setup Instructions
### **1. Clone the Repository**
```sh
git clone https://github.com/your-username/GradeWise.git
cd GradeWise
```
### **2. Backend Setup (Spring Boot)**
```sh
demoApplication:run
```
### **3. Frontend Setup (React + Tailwind CSS)**
```sh
cd React-App
npm install
npm start
```
### **4. AI Services (Python)**
Ensure you have Python installed and run:
```sh
python app.py
```

## 📜 Usage
1. **Professor logs in**, reviews submissions, and sets evaluation criteria.
2. **Students submit SRS/SDD documents**, including UML diagrams.
3. **GradeWise processes the document**:
   - Extracts and analyzes text.
   - Validates UML diagrams.
   - Checks for plagiarism.
   - Assesses business value.
4. **The system generates a report** with grading, feedback, and recommendations.
5. **Professors review grades** and provide additional comments if needed.
6. **Students receive grades** along with detailed feedback.



## 🤝 Contributors
- **Zeina Hesham** - [GitHub](https://github.com/gitzuzu)
- **Nouran Mohamed** - [GitHub](https://github.com/nouranMo)
- **Nader Amir** - [GitHub](https://github.com/NElhamy)
- **George Ayman** - [GitHub](https://github.com/GeorgeAyy)

## 📞 Contact
For inquiries, reach out via Linkedin
- **Zeina Hesham** - [Linkedin](https://www.linkedin.com/in/zeina-hesham/)
- **Nouran Mohamed** - [Linkedin](https://www.linkedin.com/in/nouran-sedky/)
- **Nader Amir** - [Linkedin](https://www.linkedin.com/in/naderamir/)
- **George Ayman** - [Linkedin](https://www.linkedin.com/in/george-aziz/)

---

🚀 **GradeWise** – Making documentation grading smarter and faster!

