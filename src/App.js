// Cybersecurity Portfolio Website
// Based on: https://github.com/s-shahzad/Portfolio

import React from "react";
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";


export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <header className="text-center py-8">
        <h1 className="text-4xl font-bold">Azhad Shahzad Shaik</h1>
        <p className="text-xl mt-2">Cybersecurity Enthusiast | Network Engineer | Python Learner</p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* About Me */}
        <Card>
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
        <Card>
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
        <Card>
          <CardContent className="p-4 text-center">
            <h2 className="text-2xl font-semibold mb-2">Resume</h2>
            <a href="/resume.pdf" target="_blank" rel="noopener noreferrer">
              <Button>Download Resume (PDF)</Button>
            </a>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardContent className="p-4">
            <h2 className="text-2xl font-semibold mb-2">Contact</h2>
            <ul className="space-y-1">
              <li>Email: shahzad@example.com</li>
              <li>LinkedIn: linkedin.com/in/azhads</li>
              <li>GitHub: github.com/s-shahzad</li>
            </ul>
          </CardContent>
        </Card>
      </section>

      <footer className="text-center mt-8 text-gray-500">
        © {new Date().getFullYear()} Azhad Shahzad Shaik
      </footer>
    </div>
  );
}
