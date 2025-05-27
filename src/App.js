// Cybersecurity Portfolio Website
// Based on: https://github.com/s-shahzad/Portfolio

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";

export default function Home() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-black dark:text-white p-4 transition-colors duration-500 ease-in-out">
      <header className="text-center py-8">
        <img
          src="/profile.jpg"
          alt="Profile"
          className="mx-auto w-32 h-32 rounded-full shadow-md mb-4 border-4 border-white dark:border-gray-700 hover:scale-105 transition-transform duration-300"
        />
        <h1 className="text-4xl font-bold transition-all duration-300 hover:text-blue-500 dark:hover:text-blue-300">
          Azhad Shahzad Shaik
        </h1>
        <p className="text-xl mt-2">Cybersecurity Enthusiast | Network Engineer | Python Learner</p>
        <div className="mt-4">
          <Button onClick={() => setDarkMode(!darkMode)}>
            Toggle {darkMode ? "Light" : "Dark"} Mode
          </Button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* About Me */}
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardContent className="p-4">
            <h2 className="text-2xl font-semibold mb-2">About Me</h2>
            <p>
              Master's student in Cyber/Computer Forensics and Counterterrorism at Sacred Heart University.
              Passionate about securing systems and solving complex security challenges.
              Experienced in network operations, incident response, and hands-on labs like TryHackMe.
            </p>
          </CardContent>
        </Card>

        {/* Projects */}
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardContent className="p-4">
            <h2 className="text-2xl font-semibold mb-2">Projects</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>EVCS DoS Detection using Machine Learning</li>
              <li>SOC Analyst Internship at EncryptEdge Labs</li>
              <li>TryHackMe Labs: Blue, Phishing Emails, SOC Level 1</li>
            </ul>
          </CardContent>
        </Card>

        {/* Resume */}
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardContent className="p-4 text-center">
            <h2 className="text-2xl font-semibold mb-2">Resume</h2>
            <a href="/resume.pdf" target="_blank" rel="noopener noreferrer">
              <Button>Download Resume (PDF)</Button>
            </a>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardContent className="p-4">
            <h2 className="text-2xl font-semibold mb-2">Contact</h2>
            <ul className="space-y-1">
              <li>Email: shaikazhadshahzad@gmail.com</li>
              <li>GitHub: github.com/s-shahzad</li>
            </ul>
          </CardContent>
        </Card>
      </section>

      <footer className="text-center mt-8 text-gray-500 dark:text-gray-400">
        © {new Date().getFullYear()} Azhad Shahzad Shaik
      </footer>
    </div>
  );
}
