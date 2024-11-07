import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import HomePage from './components/HomePage'; 
import Header from './components/Header'; 
import CourseDetail from './components/CourseDetail';

const App = () => {
  return (
    <Router>
      <div className="flex flex-col text-colortext bg-primary min-h-screen">
        <Header /> {/* Render the header */}
        <Routes>
          <Route path="/" element={<HomePage />} /> {/* Set the default route to HomePage */}
          <Route path="/folder/:id" element={<CourseDetail />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;